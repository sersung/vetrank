import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, practiceSessions, questions, disciplines, subjects } from "../../drizzle/schema";
import { eq, and, desc, sql, not, inArray } from "drizzle-orm";

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

      const conditions = ["q.active = 1", "q.status = 'approved'"];
      if (input.disciplineId) conditions.push(`q.disciplineId = ${input.disciplineId}`);
      if (input.subjectId) conditions.push(`q.subjectId = ${input.subjectId}`);
      if (input.difficulty !== "any") conditions.push(`q.difficulty = '${input.difficulty}'`);
      if (excludeIds.length > 0) conditions.push(`q.id NOT IN (${excludeIds.join(",")})`);

      const rows = await db.execute(`
        SELECT q.id, q.textPt, q.textEn, q.options, q.correctOption, q.explanationPt,
          q.explanationEn, q.difficulty, q.questionModel, q.imageUrl, q.year,
          d.namePt as disciplineName, s.namePt as subjectName
        FROM questions q
        LEFT JOIN disciplines d ON q.disciplineId = d.id
        LEFT JOIN subjects s ON q.subjectId = s.id
        WHERE ${conditions.join(" AND ")}
        ORDER BY RAND()
        LIMIT 1
      `) as any;

      const q = (rows[0] as any[])[0];
      if (!q) return null;
      return q;
    }),

  // ── Submit practice answer ─────────────────────────────────────────────────
  submitAnswer: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      disciplineId: z.number(),
      subjectId: z.number().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      selectedOption: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Compute correctness server-side — never trust the client
      const [q] = await db
        .select({ correctOption: questions.correctOption })
        .from(questions)
        .where(eq(questions.id, input.questionId))
        .limit(1);
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      const isCorrect = q.correctOption === input.selectedOption;

      await db.insert(practiceSessions).values({
        userId: ctx.user.id,
        questionId: input.questionId,
        disciplineId: input.disciplineId,
        subjectId: input.subjectId,
        difficulty: input.difficulty,
        selectedOption: input.selectedOption,
        isCorrect,
      });
      // Award small XP for practice
      if (isCorrect) {
        await db.execute(`UPDATE users SET xp = xp + 2, totalCorrect = totalCorrect + 1, totalQuestions = totalQuestions + 1 WHERE id = ${ctx.user.id}`);
      } else {
        await db.execute(`UPDATE users SET totalQuestions = totalQuestions + 1 WHERE id = ${ctx.user.id}`);
      }
      return { success: true, isCorrect };
    }),

  // ── Get practice stats ─────────────────────────────────────────────────────
  myStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(isCorrect) as correct,
        d.namePt as disciplineName,
        ps.disciplineId
      FROM practice_sessions ps
      LEFT JOIN disciplines d ON ps.disciplineId = d.id
      WHERE ps.userId = ${ctx.user.id}
      GROUP BY ps.disciplineId, d.namePt
    `) as any;
    return rows[0] as any[];
  }),

  // ── Get performance dashboard data ─────────────────────────────────────────
  performanceDashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Overall stats
    const [overall] = await db.execute(`
      SELECT
        totalExams, totalQuestions, totalCorrect, xp, level, streak,
        CASE WHEN totalQuestions > 0 THEN ROUND(totalCorrect * 100.0 / totalQuestions, 1) ELSE 0 END as accuracy
      FROM users WHERE id = ${ctx.user.id}
    `) as any;

    // Per-discipline accuracy from exams
    const [byDiscipline] = await db.execute(`
      SELECT d.namePt as disciplineName, d.id as disciplineId,
        COUNT(ea.id) as total,
        SUM(ea.isCorrect) as correct,
        CASE WHEN COUNT(ea.id) > 0 THEN ROUND(SUM(ea.isCorrect) * 100.0 / COUNT(ea.id), 1) ELSE 0 END as accuracy
      FROM exam_answers ea
      JOIN exams e ON ea.examId = e.id
      JOIN questions q ON ea.questionId = q.id
      JOIN disciplines d ON q.disciplineId = d.id
      WHERE e.userId = ${ctx.user.id} AND e.status = 'completed'
      GROUP BY d.id, d.namePt
      ORDER BY accuracy ASC
    `) as any;

    // Last 10 exams
    const [recentExams] = await db.execute(`
      SELECT e.id, e.accuracy, e.correctAnswers, e.totalQuestions, e.xpEarned,
        e.timeSpentSeconds, e.createdAt, d.namePt as disciplineName
      FROM exams e
      LEFT JOIN disciplines d ON e.disciplineId = d.id
      WHERE e.userId = ${ctx.user.id} AND e.status = 'completed'
      ORDER BY e.createdAt DESC
      LIMIT 10
    `) as any;

    // Per-subject accuracy from exams
    const [bySubject] = await db.execute(`
      SELECT s.namePt as subjectName, s.id as subjectId, d.namePt as disciplineName, d.id as disciplineId,
        COUNT(ea.id) as total,
        SUM(ea.isCorrect) as correct,
        CASE WHEN COUNT(ea.id) > 0 THEN ROUND(SUM(ea.isCorrect) * 100.0 / COUNT(ea.id), 1) ELSE 0 END as accuracy
      FROM exam_answers ea
      JOIN exams e ON ea.examId = e.id
      JOIN questions q ON ea.questionId = q.id
      JOIN subjects s ON q.subjectId = s.id
      JOIN disciplines d ON q.disciplineId = d.id
      WHERE e.userId = ${ctx.user.id} AND e.status = 'completed' AND q.subjectId IS NOT NULL
      GROUP BY s.id, s.namePt, d.id, d.namePt
      ORDER BY accuracy ASC
    `) as any;

    // XP history (last 30 days)
    const [xpHistory] = await db.execute(`
      SELECT DATE(createdAt) as date, SUM(amount) as xp
      FROM xp_events
      WHERE userId = ${ctx.user.id} AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `) as any;

    return {
      overall: (overall as any[])[0],
      byDiscipline: byDiscipline as any[],
      bySubject: bySubject as any[],
      recentExams: recentExams as any[],
      xpHistory: xpHistory as any[],
    };
  }),
});
