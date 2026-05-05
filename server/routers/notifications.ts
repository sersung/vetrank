import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { and, between, eq, isNotNull, ne } from 'drizzle-orm';
import {
  sendTrialExpiringEmail,
  sendPremiumExpiringEmail,
  sendNewsletterEmail,
} from '../email';

function adminOnly(role: string | null | undefined) {
  if (role !== 'admin' && role !== 'superuser') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
  }
}

export const notificationsRouter = router({
  // Admin: send newsletter to all users (or filtered by plan)
  sendNewsletter: protectedProcedure
    .input(z.object({
      subject: z.string().min(3).max(200),
      body: z.string().min(10).max(10000),
      targetPlan: z.enum(['all', 'free', 'trial', 'premium']).default('all'),
    }))
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const conditions = [isNotNull(users.email), ne(users.email, '')];
      if (input.targetPlan !== 'all') {
        conditions.push(eq(users.plan, input.targetPlan));
      }
      const rows = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(and(...conditions));

      let sent = 0;
      let failed = 0;

      for (const row of rows) {
        if (!row.email) continue;
        try {
          await sendNewsletterEmail(row.email, input.subject, input.body);
          sent++;
        } catch {
          failed++;
        }
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
      }

      return { sent, failed, total: rows.length };

    }),

  // Admin: manually trigger expiry check and send emails
  sendExpiryEmails: protectedProcedure
    .mutation(async ({ ctx }) => {
      adminOnly(ctx.user.role);
      return await runExpiryEmailCheck();
    }),

  // Admin: preview who would receive expiry emails
  previewExpiryTargets: protectedProcedure
    .query(async ({ ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const now = new Date();
      const in1day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const cols = { id: users.id, name: users.name, email: users.email,
        trialEndsAt: users.trialEndsAt, premiumEndsAt: users.premiumEndsAt };

      const [trialExpiring3, trialExpiring1, premiumExpiring7, premiumExpiring1] =
        await Promise.all([
          db.select(cols).from(users).where(and(
            eq(users.plan, 'trial'), isNotNull(users.email),
            between(users.trialEndsAt, in1day, in3days))),
          db.select(cols).from(users).where(and(
            eq(users.plan, 'trial'), isNotNull(users.email),
            between(users.trialEndsAt, now, in1day))),
          db.select(cols).from(users).where(and(
            eq(users.plan, 'premium'), isNotNull(users.email),
            between(users.premiumEndsAt, in3days, in7days))),
          db.select(cols).from(users).where(and(
            eq(users.plan, 'premium'), isNotNull(users.email),
            between(users.premiumEndsAt, now, in1day))),
        ]);

      return {
        trialExpiring3Days: trialExpiring3,
        trialExpiring1Day: trialExpiring1,
        premiumExpiring7Days: premiumExpiring7,
        premiumExpiring1Day: premiumExpiring1,
      };
    }),
});

// ─── Shared expiry check logic (also used by scheduled endpoint) ───────────
export async function runExpiryEmailCheck() {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  const now = new Date();
  const in1day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let sent = 0;
  let failed = 0;

  const cols = { email: users.email, name: users.name };

  const [trial3, trial1, prem7, prem1] = await Promise.all([
    db.select(cols).from(users).where(and(
      eq(users.plan, 'trial'), isNotNull(users.email),
      between(users.trialEndsAt, in1day, in3days))),
    db.select(cols).from(users).where(and(
      eq(users.plan, 'trial'), isNotNull(users.email),
      between(users.trialEndsAt, now, in1day))),
    db.select(cols).from(users).where(and(
      eq(users.plan, 'premium'), isNotNull(users.email),
      between(users.premiumEndsAt, in3days, in7days))),
    db.select(cols).from(users).where(and(
      eq(users.plan, 'premium'), isNotNull(users.email),
      between(users.premiumEndsAt, now, in1day))),
  ]);

  for (const u of trial3) {
    try { await sendTrialExpiringEmail(u.email!, u.name || 'Veterinário(a)', 3); sent++; }
    catch { failed++; }
  }
  for (const u of trial1) {
    try { await sendTrialExpiringEmail(u.email!, u.name || 'Veterinário(a)', 1); sent++; }
    catch { failed++; }
  }
  for (const u of prem7) {
    try { await sendPremiumExpiringEmail(u.email!, u.name || 'Veterinário(a)', 7); sent++; }
    catch { failed++; }
  }
  for (const u of prem1) {
    try { await sendPremiumExpiringEmail(u.email!, u.name || 'Veterinário(a)', 1); sent++; }
    catch { failed++; }
  }

  return { sent, failed };
}
