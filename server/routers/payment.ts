import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Preference } from "mercadopago";

// ── Mercado Pago client ───────────────────────────────────────────────────────
function getMPClient() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MP_ACCESS_TOKEN not configured" });
  return new MercadoPagoConfig({ accessToken: token });
}

// ── Plan definitions ──────────────────────────────────────────────────────────
export const PLANS = {
  monthly: {
    id: "premium_monthly",
    title: "VetRank Premium — Mensal",
    description: "Acesso completo: simulados ilimitados, ranking, IA e todos os recursos premium.",
    price: 39.90,
    currency: "BRL",
    durationDays: 30,
  },
  annual: {
    id: "premium_annual",
    title: "VetRank Premium — Anual",
    description: "Acesso completo por 12 meses. Equivalente a R$24,90/mês — 37% de desconto.",
    price: 299.00,
    currency: "BRL",
    durationDays: 365,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// ── Router ────────────────────────────────────────────────────────────────────
export const paymentRouter = router({
  // Create a Mercado Pago preference (checkout session)
  createPreference: protectedProcedure
    .input(z.object({
      plan: z.enum(["monthly", "annual"]),
      successUrl: z.string().url(),
      failureUrl: z.string().url(),
      pendingUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const plan = PLANS[input.plan];
      const client = getMPClient();
      const preference = new Preference(client);

      const result = await preference.create({
        body: {
          items: [{
            id: plan.id,
            title: plan.title,
            description: plan.description,
            quantity: 1,
            unit_price: plan.price,
            currency_id: plan.currency,
          }],
          payer: {
            email: ctx.user.email ?? undefined,
            name: ctx.user.name ?? undefined,
          },
          back_urls: {
            success: input.successUrl,
            failure: input.failureUrl,
            pending: input.pendingUrl,
          },
          auto_return: "approved",
          external_reference: JSON.stringify({
            userId: ctx.user.id,
            plan: input.plan,
            durationDays: plan.durationDays,
          }),
          statement_descriptor: "VETRANK",
          metadata: {
            user_id: ctx.user.id,
            plan: input.plan,
          },
        },
      });

      return {
        preferenceId: result.id,
        checkoutUrl: result.init_point,
        sandboxUrl: result.sandbox_init_point,
      };
    }),

  // Get current user's subscription status
  myPlan: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const rows = await db.select({
      plan: users.plan,
      trialEndsAt: users.trialEndsAt,
      premiumEndsAt: users.premiumEndsAt,
    }).from(users).where(eq(users.id, ctx.user.id)).limit(1);

    const u = rows[0];
    if (!u) throw new TRPCError({ code: "NOT_FOUND" });

    const now = new Date();
    const isTrialActive = u.trialEndsAt ? u.trialEndsAt > now : false;
    const isPremiumActive = u.premiumEndsAt ? u.premiumEndsAt > now : false;
    const hasAccess = u.plan === "premium" || isTrialActive || isPremiumActive;

    return {
      plan: u.plan,
      trialEndsAt: u.trialEndsAt,
      premiumEndsAt: u.premiumEndsAt,
      isTrialActive,
      isPremiumActive,
      hasAccess,
    };
  }),

  // Start free trial (no payment required)
  startTrial: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const rows = await db.select({ plan: users.plan, trialEndsAt: users.trialEndsAt })
      .from(users).where(eq(users.id, ctx.user.id)).limit(1);
    const u = rows[0];
    if (!u) throw new TRPCError({ code: "NOT_FOUND" });

    if (u.trialEndsAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Trial já utilizado anteriormente." });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    await db.update(users).set({
      plan: "trial",
      trialStartedAt: new Date(),
      trialEndsAt,
    }).where(eq(users.id, ctx.user.id));

    return { success: true, trialEndsAt };
  }),
});
