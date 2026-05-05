import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, addXp } from "../db";
import {
  users, practiceSessions, questions, disciplines, subjects,
  exams, examAnswers, xpEvents,
} from "../../drizzle/schema";
import { eq, and, desc, asc, sql, not, inArray, isNotNull, gte } from "drizzle-orm";

const LGPD_VERSION = "1.0";

export const lgpdRouter = router({
  // ── Check if user has consented ───────────────────────────────────────────
  checkConsent: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [user] = await db.select({
      lgpdConsentAt: users.lgpdConsentAt,
      lgpdConsentVersion: users.lgpdConsentVersion,
    }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
    return {
      hasConsented: !!(user?.lgpdConsentAt && user?.lgpdConsentVersion === LGPD_VERSION),
      consentedAt: user?.lgpdConsentAt,
      currentVersion: LGPD_VERSION,
    };
  }),

  // ── Record consent ─────────────────────────────────────────────────────────
  recordConsent: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(users)
      .set({ lgpdConsentAt: new Date(), lgpdConsentVersion: LGPD_VERSION })
      .where(eq(users.id, ctx.user.id));
    return { success: true };
  }),
});

export const practiceRouter = router({
  // ── Get next practice question ─────────────────────────────────────────────
  getQuestion: protectedProcedure
    .input(z.object({
      disciplineId: z.number().optional(),
      subjectId: z.number().optional(),
      difficulty: z.enum(["easy", "medium", "hard", "any"]).default("any"),
      excludeAnswered: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let excludeIds: number[] = [];
      if (input.excludeAnswered) {
        const answered = await db
          .select({ questionId: practiceSessions.questionId })
          .from(practiceSessions)
          .where(eq(practiceSessions.userId, ctx.user.id));
        excludeIds = answered.map(a => a.questionId);
      }

      const conditions = [
        eq(questions.active, true),
        eq(questions.status, "approved"),
      ] as ReturnType<typeof eq>[];
      if (input.disciplineId) conditions.push(eq(questions.disciplineId, input.disciplineId));
      if (input.subjectId) conditions.push(eq(questions.subjectId, input.subjectId));
      if (input.difficulty !== "any") conditions.push(eq(questions.difficulty, input.difficulty));
      if (excludeIds.length > 0) conditions.push(not(inArray(questions.id, excludeIds)));

      const [q] = await db
        .select({
          id: questions.id,
          textPt: questions.textPt,
          textEn: questions.textEn,
          options: questions.options,
          correctOption: questions.correctOption,
          explanationPt: questions.explanationPt,
          explanationEn: questions.explanationEn,
          difficulty: questions.difficulty,
          questionModel: questions.questionModel,
          imageUrl: questions.imageUrl,
          year: questions.year,
          disciplineName: disciplines.namePt,
          subjectName: subjects.namePt,
        })
        .from(questions)
        .leftJoin(disciplines, eq(questions.disciplineId, disciplines.id))
        .leftJoin(subjects, eq(questions.subjectId, subjects.id))
        .where(and(...conditions))
        .orderBy(sql`RAND()`)
        .limit(1);

      return q ?? null;
    }),

  // ── Submit practice answer ─────────────────────────────────────────────────
  submitAnswer: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      disciplineId: z.number(),
      subjectId: z.number().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      selectedOption: z.string(),
      isCorrect: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(practiceSessions).values({
        userId: ctx.user.id,
        questionId: input.questionId,
        disciplineId: input.disciplineId,
        subjectId: input.subjectId,
        difficulty: input.difficulty,
        selectedOption: input.selectedOption,
        isCorrect: input.isCorrect,
      });
      // Update answer stats via drizzle and award XP through the proper channel
      // so xpEvents, weeklyXp, monthlyXp and badge checks are all triggered.
      await db.update(users).set({
        totalQuestions: sql`${users.totalQuestions} + 1`,
        ...(input.isCorrect ? { totalCorrect: sql`${users.totalCorrect} + 1` } : {}),
      }).where(eq(users.id, ctx.user.id));

      if (input.isCorrect) {
        await addXp(ctx.user.id, 2, "Practice session correct answer");
      }
      return { success: true };
    }),

  // ── Get practice stats ─────────────────────────────────────────────────────
  myStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db
      .select({
        total: sql<number>`count(*)`,
        correct: sql<number>`sum(${practiceSessions.isCorrect})`,
        disciplineName: disciplines.namePt,
        disciplineId: practiceSessions.disciplineId,
      })
      .from(practiceSessions)
      .leftJoin(disciplines, eq(practiceSessions.disciplineId, disciplines.id))
      .where(eq(practiceSessions.userId, ctx.user.id))
      .groupBy(practiceSessions.disciplineId, disciplines.namePt);
    return rows;
  }),

  // ── Get performance dashboard data ─────────────────────────────────────────
  performanceDashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const accuracyExpr = sql<number>`
      CASE WHEN count(${examAnswers.id}) > 0
        THEN ROUND(sum(${examAnswers.isCorrect}) * 100.0 / count(${examAnswers.id}), 1)
        ELSE 0
      END`;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [overall, byDiscipline, recentExams, bySubject, xpHistory] = await Promise.all([
      // User totals + computed accuracy
      db.select({
        totalExams: users.totalExams,
        totalQuestions: users.totalQuestions,
        totalCorrect: users.totalCorrect,
        xp: users.xp,
        level: users.level,
        streak: users.streak,
        accuracy: sql<number>`
          CASE WHEN ${users.totalQuestions} > 0
            THEN ROUND(${users.totalCorrect} * 100.0 / ${users.totalQuestions}, 1)
            ELSE 0
          END`,
      }).from(users).where(eq(users.id, ctx.user.id)).limit(1),

      // Per-discipline accuracy from exam answers
      db.select({
        disciplineName: disciplines.namePt,
        disciplineId: disciplines.id,
        total: sql<number>`count(${examAnswers.id})`,
        correct: sql<number>`sum(${examAnswers.isCorrect})`,
        accuracy: accuracyExpr,
      })
        .from(examAnswers)
        .innerJoin(exams, eq(examAnswers.examId, exams.id))
        .innerJoin(questions, eq(examAnswers.questionId, questions.id))
        .innerJoin(disciplines, eq(questions.disciplineId, disciplines.id))
        .where(and(eq(exams.userId, ctx.user.id), eq(exams.status, "completed")))
        .groupBy(disciplines.id, disciplines.namePt)
        .orderBy(sql`accuracy ASC`),

      // Last 10 completed exams
      db.select({
        id: exams.id,
        accuracy: exams.accuracy,
        correctAnswers: exams.correctAnswers,
        totalQuestions: exams.totalQuestions,
        xpEarned: exams.xpEarned,
        timeSpentSeconds: exams.timeSpentSeconds,
        createdAt: exams.createdAt,
        disciplineName: disciplines.namePt,
      })
        .from(exams)
        .leftJoin(disciplines, eq(exams.disciplineId, disciplines.id))
        .where(and(eq(exams.userId, ctx.user.id), eq(exams.status, "completed")))
        .orderBy(desc(exams.createdAt))
        .limit(10),

      // Per-subject accuracy from exam answers
      db.select({
        subjectName: subjects.namePt,
        subjectId: subjects.id,
        disciplineName: disciplines.namePt,
        disciplineId: disciplines.id,
        total: sql<number>`count(${examAnswers.id})`,
        correct: sql<number>`sum(${examAnswers.isCorrect})`,
        accuracy: accuracyExpr,
      })
        .from(examAnswers)
        .innerJoin(exams, eq(examAnswers.examId, exams.id))
        .innerJoin(questions, eq(examAnswers.questionId, questions.id))
        .innerJoin(subjects, eq(questions.subjectId, subjects.id))
        .innerJoin(disciplines, eq(questions.disciplineId, disciplines.id))
        .where(and(
          eq(exams.userId, ctx.user.id),
          eq(exams.status, "completed"),
          isNotNull(questions.subjectId),
        ))
        .groupBy(subjects.id, subjects.namePt, disciplines.id, disciplines.namePt)
        .orderBy(sql`accuracy ASC`),

      // XP history — last 30 days grouped by date
      db.select({
        date: sql<string>`DATE(${xpEvents.createdAt})`,
        xp: sql<number>`SUM(${xpEvents.amount})`,
      })
        .from(xpEvents)
        .where(and(
          eq(xpEvents.userId, ctx.user.id),
          gte(xpEvents.createdAt, thirtyDaysAgo),
        ))
        .groupBy(sql`DATE(${xpEvents.createdAt})`)
        .orderBy(sql`DATE(${xpEvents.createdAt}) ASC`),
    ]);

    return {
      overall: overall[0] ?? null,
      byDiscipline,
      bySubject,
      recentExams,
      xpHistory,
    };
  }),
});
