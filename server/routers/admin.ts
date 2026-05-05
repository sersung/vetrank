import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createDiscipline,
  createSubject,
  getAdminStats,
  getAllDisciplines,
  getAllSubjects,
  seedBadges,
  seedDisciplines,
  updateDiscipline,
  updateSubject,
} from "../db";
import { getDb } from "../db";
import { users, exams } from "../../drizzle/schema";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const adminRouter = router({
  stats: adminProcedure.query(() => getAdminStats()),

  seed: adminProcedure.mutation(async () => {
    await seedDisciplines();
    await seedBadges();
    return { success: true };
  }),

  disciplines: adminProcedure.query(() => getAllDisciplines()),

  createDiscipline: adminProcedure
    .input(
      z.object({
        slug: z.string().min(2),
        namePt: z.string().min(2),
        nameEn: z.string().min(2),
        icon: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createDiscipline(input);
      return { id };
    }),

  updateDiscipline: adminProcedure
    .input(
      z.object({
        id: z.number(),
        namePt: z.string().optional(),
        nameEn: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateDiscipline(id, data as any);
      return { success: true };
    }),

  subjects: adminProcedure.query(() => getAllSubjects()),

  createSubject: adminProcedure
    .input(
      z.object({
        disciplineId: z.number(),
        slug: z.string().min(2),
        namePt: z.string().min(2),
        nameEn: z.string().min(2),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createSubject(input);
      return { id };
    }),

  updateSubject: adminProcedure
    .input(
      z.object({
        id: z.number(),
        namePt: z.string().optional(),
        nameEn: z.string().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSubject(id, data as any);
      return { success: true };
    }),

  // ── Customer Management ──────────────────────────────────────────────────
  customers: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        search: z.string().optional(),
        plan: z.enum(["free", "trial", "premium", "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { users: [], total: 0 };
      const offset = (input.page - 1) * input.limit;

      let query = db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          plan: users.plan,
          xp: users.xp,
          level: users.level,
          streak: users.streak,
          totalExams: users.totalExams,
          totalQuestions: users.totalQuestions,
          totalCorrect: users.totalCorrect,
          trialEndsAt: users.trialEndsAt,
          premiumEndsAt: users.premiumEndsAt,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
          lgpdConsentAt: users.lgpdConsentAt,
        })
        .from(users)
        .$dynamic();

      if (input.search) {
        query = query.where(
          or(
            like(users.name, `%${input.search}%`),
            like(users.email, `%${input.search}%`)
          )
        );
      }
      if (input.plan !== "all") {
        query = query.where(eq(users.plan, input.plan));
      }

      const allUsers = await query.orderBy(desc(users.createdAt));
      const total = allUsers.length;
      const paginated = allUsers.slice(offset, offset + input.limit);

      return { users: paginated, total };
    }),

  customerDetail: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "NOT_FOUND" });
      const result = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND" });
      // Get exam stats
      const [stats] = await db.select({
        totalExams: sql<number>`count(*)`,
        totalCorrect: sql<number>`coalesce(sum(${exams.correctAnswers}), 0)`,
        totalQ: sql<number>`coalesce(sum(${exams.totalQuestions}), 0)`,
      }).from(exams).where(and(eq(exams.userId, input.userId), eq(exams.status, 'completed')));
      const { totalExams = 0, totalCorrect = 0, totalQ = 0 } = stats ?? {};
      const accuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
      return {
        ...result[0],
        totalExams: Number(totalExams),
        accuracy,
      };
    }),

  updateCustomerPlan: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        plan: z.enum(["free", "trial", "premium"]),
        role: z.enum(["user", "teacher", "coordinator", "superuser", "admin"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const setData: Partial<typeof users.$inferInsert> = { plan: input.plan };
      if (input.role) setData.role = input.role;
      if (input.plan === "premium") {
        setData.premiumStartedAt = new Date();
        setData.premiumEndsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
      await db.update(users).set(setData).where(eq(users.id, input.userId));
      return { success: true };
    }),
});
