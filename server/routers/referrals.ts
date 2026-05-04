import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { referrals, referralBonuses, users } from "../../drizzle/schema";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import crypto from "crypto";

// ─── DB helper ────────────────────────────────────────────────────────────────
async function db() {
  const d = await getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  return d;
}

// ─── Generate unique referral code ────────────────────────────────────────────
function generateCode(name: string): string {
  const base = (name ?? "VET").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5).padEnd(3, "V");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${base}${suffix}`;
}

const REFERRALS_FOR_FREE_YEAR = 10;

export const referralsRouter = router({
  // ─── Get my referral code + stats ─────────────────────────────────────────
  getMyCode: protectedProcedure.query(async ({ ctx }) => {
    const d = await db();
    const userId = ctx.user.id;
    const [user] = await d.select({ referralCode: users.referralCode, name: users.name })
      .from(users).where(eq(users.id, userId));
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });

    // Create code if not exists
    let code = user.referralCode;
    if (!code) {
      let attempts = 0;
      code = generateCode(user.name ?? "VET");
      while (attempts < 10) {
        const [existing] = await d.select({ id: users.id }).from(users)
          .where(eq(users.referralCode, code));
        if (!existing) break;
        code = generateCode(user.name ?? "VET");
        attempts++;
      }
      await d.update(users).set({ referralCode: code }).where(eq(users.id, userId));
    }

    // Count paid referrals
    const [paidRow] = await d.select({ cnt: sql<number>`COUNT(*)` })
      .from(referrals)
      .where(and(eq(referrals.referrerId, userId), eq(referrals.status, "paid")));
    const paidCount = Number(paidRow?.cnt ?? 0);

    // Count pending referrals
    const [pendingRow] = await d.select({ cnt: sql<number>`COUNT(*)` })
      .from(referrals)
      .where(and(eq(referrals.referrerId, userId), eq(referrals.status, "pending")));
    const pendingCount = Number(pendingRow?.cnt ?? 0);

    // Check active bonus
    const [bonus] = await d.select({ id: referralBonuses.id, expiresAt: referralBonuses.expiresAt })
      .from(referralBonuses).where(eq(referralBonuses.userId, userId));
    const bonusActive = bonus ? bonus.expiresAt > new Date() : false;

    return {
      code,
      paidCount,
      pendingCount,
      bonusActive,
      bonusExpiresAt: bonus?.expiresAt ?? null,
      threshold: REFERRALS_FOR_FREE_YEAR,
      progressPercent: Math.min(100, Math.round((paidCount / REFERRALS_FOR_FREE_YEAR) * 100)),
    };
  }),

  // ─── Get my referral list ─────────────────────────────────────────────────
  getMyReferrals: protectedProcedure.query(async ({ ctx }) => {
    const d = await db();
    const rows = await d.select({
      id: referrals.id,
      referredEmail: referrals.referredEmail,
      status: referrals.status,
      paidAt: referrals.paidAt,
      planPurchased: referrals.planPurchased,
      createdAt: referrals.createdAt,
    }).from(referrals).where(eq(referrals.referrerId, ctx.user.id));
    return rows;
  }),

  // ─── Validate referral code (public) ─────────────────────────────────────
  validateCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const d = await db();
      const [user] = await d.select({ id: users.id, name: users.name })
        .from(users).where(eq(users.referralCode, input.code.toUpperCase()));
      if (!user) return { valid: false, referrerName: null };
      return { valid: true, referrerName: user.name };
    }),

  // ─── Send referral invite (creates pending referral with email) ───────────
  sendInvite: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const d = await db();
      const userId = ctx.user.id;
      const email = input.email.toLowerCase().trim();

      // Check if already referred this email
      const [existing] = await d.select({ id: referrals.id })
        .from(referrals)
        .where(and(eq(referrals.referrerId, userId), eq(referrals.referredEmail, email)));
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Email já indicado anteriormente" });

      // Check if email is already a user
      const [existingUser] = await d.select({ id: users.id }).from(users)
        .where(eq(users.email, email));
      if (existingUser) throw new TRPCError({ code: "BAD_REQUEST", message: "Este email já é cadastrado na plataforma" });

      await d.insert(referrals).values({
        referrerId: userId,
        referredEmail: email,
        status: "pending",
      });

      return { success: true };
    }),

  // ─── Register referral (called when referred user signs up with code) ─────
  registerWithCode: protectedProcedure
    .input(z.object({ referralCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const d = await db();
      const referredId = ctx.user.id;
      const referredEmail = ctx.user.email ?? "";

      // Find referrer
      const [referrer] = await d.select({ id: users.id })
        .from(users).where(eq(users.referralCode, input.referralCode.toUpperCase()));
      if (!referrer) throw new TRPCError({ code: "NOT_FOUND", message: "Código de indicação inválido" });
      if (referrer.id === referredId) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode se indicar" });

      // Update referredBy on user
      await d.update(users).set({ referredBy: referrer.id }).where(eq(users.id, referredId));

      // Update existing pending referral or create new one
      const [existing] = await d.select({ id: referrals.id })
        .from(referrals)
        .where(and(eq(referrals.referrerId, referrer.id), eq(referrals.referredEmail, referredEmail)));
      if (existing) {
        await d.update(referrals).set({ referredUserId: referredId, status: "registered" })
          .where(eq(referrals.id, existing.id));
      } else {
        await d.insert(referrals).values({
          referrerId: referrer.id,
          referredEmail,
          referredUserId: referredId,
          status: "registered",
        });
      }
      return { success: true };
    }),

  // ─── Confirm payment (called by payment webhook) ──────────────────────────
  confirmPayment: protectedProcedure
    .input(z.object({
      referredUserId: z.number(),
      planPurchased: z.enum(["monthly", "annual"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!["admin", "superuser"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const d = await db();

      const [referral] = await d.select().from(referrals)
        .where(and(eq(referrals.referredUserId, input.referredUserId), eq(referrals.status, "registered")));
      if (!referral) return { success: false, message: "No registered referral found" };

      await d.update(referrals).set({
        status: "paid",
        paidAt: new Date(),
        planPurchased: input.planPurchased,
      }).where(eq(referrals.id, referral.id));

      // Check if referrer has reached the bonus threshold
      const [countRow] = await d.select({ cnt: sql<number>`COUNT(*)` })
        .from(referrals)
        .where(and(eq(referrals.referrerId, referral.referrerId), eq(referrals.status, "paid")));
      const paidCount = Number(countRow?.cnt ?? 0);

      if (paidCount >= REFERRALS_FOR_FREE_YEAR) {
        // Check if bonus already exists
        const [existingBonus] = await d.select({ id: referralBonuses.id })
          .from(referralBonuses).where(eq(referralBonuses.userId, referral.referrerId));
        if (!existingBonus) {
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          await d.insert(referralBonuses).values({
            userId: referral.referrerId,
            bonusType: "free_annual",
            paidReferralsCount: paidCount,
            expiresAt,
          });
        }
        return { success: true, bonusActivated: true, paidCount };
      }
      return { success: true, bonusActivated: false, paidCount };
    }),

  // ─── Admin: list all referrals ────────────────────────────────────────────
  adminList: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "registered", "paid", "expired"]).optional(),
      page: z.number().default(1),
    }))
    .query(async ({ ctx, input }) => {
      if (!["admin", "superuser"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const d = await db();
      const limit = 50;
      const offset = (input.page - 1) * limit;
      const conds = input.status ? [eq(referrals.status, input.status)] : [];
      const rows = await d.select({
        id: referrals.id,
        referrerId: referrals.referrerId,
        referredEmail: referrals.referredEmail,
        referredUserId: referrals.referredUserId,
        status: referrals.status,
        paidAt: referrals.paidAt,
        planPurchased: referrals.planPurchased,
        createdAt: referrals.createdAt,
      }).from(referrals)
        .where(conds.length ? and(...conds) : undefined)
        .limit(limit).offset(offset);
      return rows;
    }),
});
