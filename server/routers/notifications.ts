import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
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

      let query = 'SELECT email, name FROM users WHERE email IS NOT NULL AND email != ""';
      const params: string[] = [];
      if (input.targetPlan === 'trial') {
        query += ' AND plan = "trial"';
      } else if (input.targetPlan === 'premium') {
        query += ' AND plan = "premium"';
      } else if (input.targetPlan === 'free') {
        query += ' AND (plan IS NULL OR plan = "free")';
      }

      const [rows] = await (db as any).execute(query, params) as any;
      let sent = 0;
      let failed = 0;

      for (const row of rows as any[]) {
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
      const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in1day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [trialExpiring3] = await (db as any).execute(
        `SELECT id, name, email, trialEndsAt FROM users 
         WHERE plan = 'trial' AND trialEndsAt BETWEEN ? AND ? AND email IS NOT NULL`,
        [in1day, in3days]
      ) as any;

      const [trialExpiring1] = await (db as any).execute(
        `SELECT id, name, email, trialEndsAt FROM users 
         WHERE plan = 'trial' AND trialEndsAt BETWEEN ? AND ? AND email IS NOT NULL`,
        [now, in1day]
      ) as any;

      const [premiumExpiring7] = await (db as any).execute(
        `SELECT id, name, email, premiumEndsAt FROM users 
         WHERE plan = 'premium' AND premiumEndsAt BETWEEN ? AND ? AND email IS NOT NULL`,
        [in3days, in7days]
      ) as any;

      const [premiumExpiring1] = await (db as any).execute(
        `SELECT id, name, email, premiumEndsAt FROM users 
         WHERE plan = 'premium' AND premiumEndsAt BETWEEN ? AND ? AND email IS NOT NULL`,
        [now, in1day]
      ) as any;

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
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in1day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let sent = 0;
  let failed = 0;

  // Trial expiring in ~3 days
  const [trial3] = await (db as any).execute(
    `SELECT id, name, email FROM users 
     WHERE plan = 'trial' AND trialEndsAt BETWEEN ? AND ? AND email IS NOT NULL`,
    [in1day, in3days]
  ) as any;

  for (const u of trial3 as any[]) {
    try {
      await sendTrialExpiringEmail(u.email, u.name || 'Veterinário(a)', 3);
      sent++;
    } catch { failed++; }
  }

  // Trial expiring in ~1 day
  const [trial1] = await (db as any).execute(
    `SELECT id, name, email FROM users 
     WHERE plan = 'trial' AND trialEndsAt BETWEEN ? AND ? AND email IS NOT NULL`,
    [now, in1day]
  ) as any;

  for (const u of trial1 as any[]) {
    try {
      await sendTrialExpiringEmail(u.email, u.name || 'Veterinário(a)', 1);
      sent++;
    } catch { failed++; }
  }

  // Premium expiring in ~7 days
  const [prem7] = await (db as any).execute(
    `SELECT id, name, email FROM users 
     WHERE plan = 'premium' AND premiumEndsAt BETWEEN ? AND ? AND email IS NOT NULL`,
    [in3days, in7days]
  ) as any;

  for (const u of prem7 as any[]) {
    try {
      await sendPremiumExpiringEmail(u.email, u.name || 'Veterinário(a)', 7);
      sent++;
    } catch { failed++; }
  }

  // Premium expiring in ~1 day
  const [prem1] = await (db as any).execute(
    `SELECT id, name, email FROM users 
     WHERE plan = 'premium' AND premiumEndsAt BETWEEN ? AND ? AND email IS NOT NULL`,
    [now, in1day]
  ) as any;

  for (const u of prem1 as any[]) {
    try {
      await sendPremiumExpiringEmail(u.email, u.name || 'Veterinário(a)', 1);
      sent++;
    } catch { failed++; }
  }

  return { sent, failed };
}
