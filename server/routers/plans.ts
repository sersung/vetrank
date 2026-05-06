import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, payments } from "../../drizzle/schema";
import { eq, desc, and, or, like } from "drizzle-orm";

// ── Admin-only guard ──────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["admin", "superuser", "coordinator"].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysRemaining(date: Date | null | undefined): number | null {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function planStatus(user: {
  plan: string;
  trialEndsAt: Date | null;
  premiumEndsAt: Date | null;
}) {
  const now = new Date();
  if (user.plan === "premium" && user.premiumEndsAt && user.premiumEndsAt > now) {
    return "active";
  }
  if (user.plan === "trial" && user.trialEndsAt && user.trialEndsAt > now) {
    return "trial";
  }
  if (
    (user.plan === "premium" && user.premiumEndsAt && user.premiumEndsAt <= now) ||
    (user.plan === "trial" && user.trialEndsAt && user.trialEndsAt <= now)
  ) {
    return "expired";
  }
  return "free";
}

// ── Router ────────────────────────────────────────────────────────────────────
export const plansRouter = router({
  // ── Admin: list users with plan info ────────────────────────────────────────
  listUsersWithPlans: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      search: z.string().optional(),
      planFilter: z.enum(["all", "free", "trial", "premium", "expired"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { users: [], total: 0 };
      const offset = (input.page - 1) * input.limit;
      let query = db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        plan: users.plan,
        subscriptionPlan: users.subscriptionPlan,
        trialStartedAt: users.trialStartedAt,
        trialEndsAt: users.trialEndsAt,
        premiumStartedAt: users.premiumStartedAt,
        premiumEndsAt: users.premiumEndsAt,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      }).from(users).$dynamic();

      if (input.search) {
        query = query.where(or(
          like(users.name, `%${input.search}%`),
          like(users.email, `%${input.search}%`)
        ));
      }
      if (input.planFilter !== "all" && input.planFilter !== "expired") {
        query = query.where(eq(users.plan, input.planFilter as any));
      }

      const allUsers = await query.orderBy(desc(users.createdAt));
      const now = new Date();

      const enriched = allUsers.map((u) => {
        const status = planStatus(u);
        const trialDays = daysRemaining(u.trialEndsAt);
        const premiumDays = daysRemaining(u.premiumEndsAt);
        return { ...u, status, trialDays, premiumDays };
      });

      const filtered = input.planFilter === "expired"
        ? enriched.filter((u) => u.status === "expired")
        : enriched;

      const total = filtered.length;
      return { users: filtered.slice(offset, offset + input.limit), total };
    }),

  // ── Admin: update user plan ──────────────────────────────────────────────────
  updateUserPlan: adminProcedure
    .input(z.object({
      userId: z.number(),
      plan: z.enum(["free", "trial", "premium"]),
      planType: z.enum(["monthly", "annual"]).optional(),
      durationDays: z.number().min(1).max(3650).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updateData: Record<string, unknown> = { plan: input.plan };
      const now = new Date();

      if (input.plan === "premium") {
        const days = input.durationDays ?? (input.planType === "annual" ? 365 : 30);
        updateData.premiumStartedAt = now;
        updateData.premiumEndsAt = new Date(now.getTime() + days * 86400000);
        if (input.planType) updateData.subscriptionPlan = input.planType;
      } else if (input.plan === "free") {
        updateData.premiumEndsAt = null;
        updateData.subscriptionPlan = null;
      }

      await db.update(users).set(updateData as any).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // ── Admin: extend trial ──────────────────────────────────────────────────────
  extendTrial: adminProcedure
    .input(z.object({
      userId: z.number(),
      days: z.number().min(1).max(365),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({ trialEndsAt: users.trialEndsAt, plan: users.plan })
        .from(users).where(eq(users.id, input.userId)).limit(1);
      const u = rows[0];
      if (!u) throw new TRPCError({ code: "NOT_FOUND" });

      const base = u.trialEndsAt && u.trialEndsAt > new Date() ? u.trialEndsAt : new Date();
      const newEnd = new Date(base.getTime() + input.days * 86400000);

      await db.update(users).set({
        plan: "trial",
        trialStartedAt: u.trialEndsAt ? undefined : new Date(),
        trialEndsAt: newEnd,
      } as any).where(eq(users.id, input.userId));
      return { success: true, newTrialEndsAt: newEnd };
    }),

  // ── Admin: list payments ─────────────────────────────────────────────────────
  listPayments: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      status: z.enum(["all", "pending", "approved", "rejected", "cancelled", "refunded"]).default("all"),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { payments: [], total: 0 };
      const offset = (input.page - 1) * input.limit;

      // Raw join with users
      const conn = db as any;
      let whereClause = input.status !== "all" ? `WHERE p.status = '${input.status}'` : "WHERE 1=1";
      if (input.search) {
        whereClause += ` AND (u.name LIKE '%${input.search.replace(/'/g, "''")}%' OR u.email LIKE '%${input.search.replace(/'/g, "''")}%')`;
      }
      const rows = await conn.execute(
        `SELECT p.*, u.name as userName, u.email as userEmail
         FROM payments p
         LEFT JOIN users u ON p.userId = u.id
         ${whereClause}
         ORDER BY p.createdAt DESC
         LIMIT ${input.limit} OFFSET ${offset}`
      );
      const countRows = await conn.execute(
        `SELECT COUNT(*) as total FROM payments p LEFT JOIN users u ON p.userId = u.id ${whereClause}`
      );
      return {
        payments: rows[0] as any[],
        total: Number((countRows[0] as any[])[0]?.total ?? 0),
      };
    }),

  // ── Admin: update payment status ─────────────────────────────────────────────
  updatePaymentStatus: adminProcedure
    .input(z.object({
      paymentId: z.number(),
      status: z.enum(["pending", "approved", "rejected", "cancelled", "refunded"]),
      failureReason: z.string().optional(),
      notes: z.string().optional(),
      activatePlan: z.boolean().default(false), // if approved, activate plan for user
      planType: z.enum(["monthly", "annual"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const payRows = await db.select().from(payments).where(eq(payments.id, input.paymentId)).limit(1);
      const pay = payRows[0];
      if (!pay) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(payments).set({
        status: input.status,
        failureReason: input.failureReason ?? pay.failureReason,
        notes: input.notes ?? pay.notes,
      }).where(eq(payments.id, input.paymentId));

      // If approving and activatePlan=true, update user plan
      if (input.status === "approved" && input.activatePlan) {
        const planType = input.planType ?? pay.planType ?? "monthly";
        const days = planType === "annual" ? 365 : 30;
        const now = new Date();
        await db.update(users).set({
          plan: "premium",
          premiumStartedAt: now,
          premiumEndsAt: new Date(now.getTime() + days * 86400000),
          subscriptionPlan: planType,
        } as any).where(eq(users.id, pay.userId));
      }

      return { success: true };
    }),

  // ── Admin: create manual payment record ─────────────────────────────────────
  createPaymentRecord: adminProcedure
    .input(z.object({
      userId: z.number(),
      amount: z.number().min(0),
      planType: z.enum(["monthly", "annual"]),
      status: z.enum(["pending", "approved", "rejected", "cancelled"]).default("approved"),
      paymentMethod: z.string().default("manual"),
      notes: z.string().optional(),
      activatePlan: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [inserted] = await db.insert(payments).values({
        userId: input.userId,
        amount: input.amount,
        currency: "BRL",
        status: input.status,
        paymentMethod: input.paymentMethod,
        planType: input.planType,
        notes: input.notes,
      });

      if (input.status === "approved" && input.activatePlan) {
        const days = input.planType === "annual" ? 365 : 30;
        const now = new Date();
        await db.update(users).set({
          plan: "premium",
          premiumStartedAt: now,
          premiumEndsAt: new Date(now.getTime() + days * 86400000),
          subscriptionPlan: input.planType,
        } as any).where(eq(users.id, input.userId));
      }

      return { success: true };
    }),

  // ── User: my subscription details ───────────────────────────────────────────
  mySubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const rows = await db.select({
      plan: users.plan,
      subscriptionPlan: users.subscriptionPlan,
      trialStartedAt: users.trialStartedAt,
      trialEndsAt: users.trialEndsAt,
      premiumStartedAt: users.premiumStartedAt,
      premiumEndsAt: users.premiumEndsAt,
      name: users.name,
      email: users.email,
      cpf: users.cpf,
    }).from(users).where(eq(users.id, ctx.user.id)).limit(1);

    const u = rows[0];
    if (!u) throw new TRPCError({ code: "NOT_FOUND" });

    const status = planStatus(u);
    const trialDays = daysRemaining(u.trialEndsAt);
    const premiumDays = daysRemaining(u.premiumEndsAt);
    const hasAccess = status === "active" || status === "trial";

    // Last approved payment
    const lastPayments = await db.select().from(payments)
      .where(and(eq(payments.userId, ctx.user.id), eq(payments.status, "approved")))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    const lastPayment = lastPayments[0] ?? null;

    return {
      user: { name: u.name, email: u.email, cpf: u.cpf },
      plan: u.plan,
      subscriptionPlan: u.subscriptionPlan,
      status,
      hasAccess,
      trialStartedAt: u.trialStartedAt,
      trialEndsAt: u.trialEndsAt,
      trialDays,
      premiumStartedAt: u.premiumStartedAt,
      premiumEndsAt: u.premiumEndsAt,
      premiumDays,
      lastPayment,
    };
  }),
});
