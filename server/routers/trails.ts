import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  trails, trailModules, trailModuleQuestions, trailEnrollments,
  trailModuleProgress, trailModuleAnswers, questions,
  users, xpEvents,
} from "../../drizzle/schema";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

// ─── DB helper ────────────────────────────────────────────────────────────────
async function db() {
  const d = await getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  return d;
}

// ─── XP constants ─────────────────────────────────────────────────────────────
const TRAIL_XP_PER_CORRECT = 3;

// ─── Level thresholds (exponential curve) ─────────────────────────────────────
export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2400, 3800, 6000, 9500, 15000];
export function calcLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
}

// ─── Award XP helper ──────────────────────────────────────────────────────────
export async function awardTrailXp(userId: number, amount: number, reason: string) {
  if (amount <= 0) return;
  const d = await db();
  const [row] = await d.select({ xp: users.xp }).from(users).where(eq(users.id, userId));
  const currentXp = row?.xp ?? 0;
  const newXp = currentXp + amount;
  const newLevel = calcLevel(newXp);
  await d.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, userId));
  await d.insert(xpEvents).values({ userId, amount, reason });
  const now = new Date();
  const weekKey = `${now.getFullYear()}-${String(Math.ceil(now.getDate() / 7)).padStart(2, "0")}`;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await d.execute(
    sql`INSERT INTO weekly_xp (userId, weekKey, xp) VALUES (${userId}, ${weekKey}, ${amount}) ON DUPLICATE KEY UPDATE xp = xp + ${amount}`
  );
  await d.execute(
    sql`INSERT INTO monthly_xp (userId, monthKey, xp) VALUES (${userId}, ${monthKey}, ${amount}) ON DUPLICATE KEY UPDATE xp = xp + ${amount}`
  );
}

// ─── Get questions for a module ───────────────────────────────────────────────
async function getModuleQuestions(moduleId: number, count: number, excludeIds: number[] = []) {
  const d = await db();
  const assigned = await d
    .select({ questionId: trailModuleQuestions.questionId, order: trailModuleQuestions.order })
    .from(trailModuleQuestions)
    .where(eq(trailModuleQuestions.moduleId, moduleId))
    .orderBy(trailModuleQuestions.order);

  if (assigned.length > 0) {
    const ids = assigned
      .map((a: { questionId: number }) => a.questionId)
      .filter((id: number) => !excludeIds.includes(id));
    if (ids.length === 0) return [];
    return d.select().from(questions).where(and(inArray(questions.id, ids), eq(questions.active, true)));
  }

  const [mod] = await d.select().from(trailModules).where(eq(trailModules.id, moduleId));
  if (!mod) return [];
  const filter = (mod.questionFilter as Record<string, unknown>) ?? {};
  const conds: ReturnType<typeof eq>[] = [eq(questions.active, true)];
  if (filter.disciplineId) conds.push(eq(questions.disciplineId, filter.disciplineId as number));
  if (Array.isArray(filter.subjectIds) && (filter.subjectIds as number[]).length) {
    conds.push(inArray(questions.subjectId, filter.subjectIds as number[]));
  }
  if (filter.difficulty && filter.difficulty !== "mixed") {
    conds.push(eq(questions.difficulty, filter.difficulty as "easy" | "medium" | "hard"));
  }
  const pool = await d.select().from(questions).where(and(...conds)).limit(count * 3);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

type QuestionRow = typeof questions.$inferSelect;
function mapQ(q: QuestionRow) {
  return {
    id: q.id, textPt: q.textPt, textEn: q.textEn, options: q.options,
    correctOption: q.correctOption, explanationPt: q.explanationPt,
    questionType: q.questionType, formatData: q.formatData,
    assertion1: q.assertion1, assertion2: q.assertion2, imageUrl: q.imageUrl,
    difficulty: q.difficulty,
  };
}

export const trailsRouter = router({
  // ─── List active trails ───────────────────────────────────────────────────
  list: publicProcedure
    .input(z.object({ disciplineId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const d = await db();
      const conds: ReturnType<typeof eq>[] = [eq(trails.active, true)];
      if (input?.disciplineId) conds.push(eq(trails.disciplineId, input.disciplineId));
      const rows = await d.select({
        id: trails.id, disciplineId: trails.disciplineId, title: trails.title,
        description: trails.description, totalHours: trails.totalHours, passingScore: trails.passingScore,
      }).from(trails).where(and(...conds));
      if (rows.length === 0) return [];
      const trailIds = rows.map((r: { id: number }) => r.id);
      const modCounts = await d
        .select({ trailId: trailModules.trailId, cnt: sql<number>`COUNT(*)` })
        .from(trailModules).where(inArray(trailModules.trailId, trailIds)).groupBy(trailModules.trailId);
      const modMap: Record<number, number> = {};
      for (const m of modCounts) modMap[m.trailId] = m.cnt;
      return rows.map((r: { id: number }) => ({ ...r, moduleCount: modMap[r.id] ?? 0 }));
    }),

  // ─── Get trail by ID ──────────────────────────────────────────────────────
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const d = await db();
      const [trail] = await d.select().from(trails).where(eq(trails.id, input.id));
      if (!trail) throw new TRPCError({ code: "NOT_FOUND" });
      const mods = await d.select().from(trailModules)
        .where(eq(trailModules.trailId, input.id)).orderBy(trailModules.order);
      return { ...trail, modules: mods };
    }),

  // ─── Enroll ───────────────────────────────────────────────────────────────
  enroll: protectedProcedure
    .input(z.object({ trailId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const d = await db();
      const userId = ctx.user.id;
      const [existing] = await d.select().from(trailEnrollments)
        .where(and(eq(trailEnrollments.userId, userId), eq(trailEnrollments.trailId, input.trailId)));
      if (existing) return existing;
      const mods = await d.select().from(trailModules)
        .where(eq(trailModules.trailId, input.trailId)).orderBy(trailModules.order);
      if (mods.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Trail has no modules" });
      const [result] = await d.insert(trailEnrollments).values({
        userId, trailId: input.trailId, status: "enrolled", currentModuleId: mods[0].id,
      });
      const enrollmentId = (result as { insertId: number }).insertId;
      for (let i = 0; i < mods.length; i++) {
        await d.insert(trailModuleProgress).values({
          enrollmentId, moduleId: mods[i].id, userId,
          status: i === 0 ? "available" : "locked",
        });
      }
      return { enrollmentId, currentModuleId: mods[0].id };
    }),

  // ─── Get enrollment ───────────────────────────────────────────────────────
  getEnrollment: protectedProcedure
    .input(z.object({ trailId: z.number() }))
    .query(async ({ ctx, input }) => {
      const d = await db();
      const userId = ctx.user.id;
      const [enrollment] = await d.select().from(trailEnrollments)
        .where(and(eq(trailEnrollments.userId, userId), eq(trailEnrollments.trailId, input.trailId)));
      if (!enrollment) return null;
      const progress = await d.select().from(trailModuleProgress)
        .where(eq(trailModuleProgress.enrollmentId, enrollment.id));
      return { ...enrollment, moduleProgress: progress };
    }),

  // ─── Get module questions ─────────────────────────────────────────────────
  getModuleQuestions: protectedProcedure
    .input(z.object({ moduleId: z.number(), trailId: z.number() }))
    .query(async ({ ctx, input }) => {
      const d = await db();
      const userId = ctx.user.id;
      const [enrollment] = await d.select().from(trailEnrollments)
        .where(and(eq(trailEnrollments.userId, userId), eq(trailEnrollments.trailId, input.trailId)));
      if (!enrollment) throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled" });
      const [mod] = await d.select().from(trailModules).where(eq(trailModules.id, input.moduleId));
      if (!mod) throw new TRPCError({ code: "NOT_FOUND" });
      const prevAnswers = await d.select({ questionId: trailModuleAnswers.questionId })
        .from(trailModuleAnswers)
        .where(and(eq(trailModuleAnswers.userId, userId), eq(trailModuleAnswers.moduleId, input.moduleId)));
      const prevIds = prevAnswers.map((a: { questionId: number }) => a.questionId);
      let qs = await getModuleQuestions(input.moduleId, mod.questionCount, prevIds);
      if (qs.length < mod.questionCount) {
        const extra = await getModuleQuestions(input.moduleId, mod.questionCount - qs.length, []);
        const existingIds = new Set(qs.map((q: QuestionRow) => q.id));
        qs = [...qs, ...extra.filter((q: QuestionRow) => !existingIds.has(q.id))].slice(0, mod.questionCount);
      }
      return qs.map((q: QuestionRow) => mapQ(q));
    }),

  // ─── Submit module answers ────────────────────────────────────────────────
  submitModuleAnswers: protectedProcedure
    .input(z.object({
      trailId: z.number(),
      moduleId: z.number(),
      answers: z.array(z.object({ questionId: z.number(), selectedOption: z.string() })),
    }))
    .mutation(async ({ ctx, input }) => {
      const d = await db();
      const userId = ctx.user.id;
      const [enrollment] = await d.select().from(trailEnrollments)
        .where(and(eq(trailEnrollments.userId, userId), eq(trailEnrollments.trailId, input.trailId)));
      if (!enrollment) throw new TRPCError({ code: "FORBIDDEN" });
      const [progress] = await d.select().from(trailModuleProgress)
        .where(and(eq(trailModuleProgress.enrollmentId, enrollment.id), eq(trailModuleProgress.moduleId, input.moduleId)));
      if (!progress) throw new TRPCError({ code: "NOT_FOUND" });
      const [mod] = await d.select().from(trailModules).where(eq(trailModules.id, input.moduleId));
      if (!mod) throw new TRPCError({ code: "NOT_FOUND" });

      const qIds = input.answers.map(a => a.questionId);
      const qs = await d.select({ id: questions.id, correctOption: questions.correctOption })
        .from(questions).where(inArray(questions.id, qIds));
      const correctMap: Record<number, string> = {};
      for (const q of qs) correctMap[q.id] = q.correctOption;

      const attemptNumber = progress.attempts + 1;
      let correct = 0;
      for (const ans of input.answers) {
        const isCorrect = correctMap[ans.questionId] === ans.selectedOption;
        if (isCorrect) correct++;
        await d.insert(trailModuleAnswers).values({
          progressId: progress.id, userId, moduleId: input.moduleId,
          questionId: ans.questionId, selectedOption: ans.selectedOption,
          isCorrect, attemptNumber,
        });
      }
      const total = input.answers.length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const passed = score >= mod.minPassRate;
      if (correct > 0) {
        await awardTrailXp(userId, correct * TRAIL_XP_PER_CORRECT, `trail_module_${input.moduleId}_attempt_${attemptNumber}`);
      }
      await d.update(trailModuleProgress).set({
        status: passed ? "passed" : "failed",
        attempts: attemptNumber,
        bestScore: Math.max(progress.bestScore, score),
        lastScore: score,
        questionsAnswered: progress.questionsAnswered + total,
        questionsCorrect: progress.questionsCorrect + correct,
        completedAt: passed ? new Date() : undefined,
      }).where(eq(trailModuleProgress.id, progress.id));

      if (passed) {
        const allMods = await d.select({ id: trailModules.id })
          .from(trailModules).where(eq(trailModules.trailId, input.trailId)).orderBy(trailModules.order);
        const currentIdx = allMods.findIndex((m: { id: number }) => m.id === input.moduleId);
        const nextMod = allMods[currentIdx + 1];
        if (nextMod) {
          await d.update(trailModuleProgress).set({ status: "available" })
            .where(and(eq(trailModuleProgress.enrollmentId, enrollment.id), eq(trailModuleProgress.moduleId, nextMod.id)));
          await d.update(trailEnrollments).set({ status: "in_progress", currentModuleId: nextMod.id })
            .where(eq(trailEnrollments.id, enrollment.id));
        } else {
          await d.update(trailEnrollments).set({ status: "in_progress", currentModuleId: null })
            .where(eq(trailEnrollments.id, enrollment.id));
        }
      }
      return { score, correct, total, passed, minPassRate: mod.minPassRate, attemptNumber };
    }),

  // ─── Get final exam ───────────────────────────────────────────────────────
  getFinalExam: protectedProcedure
    .input(z.object({ trailId: z.number() }))
    .query(async ({ ctx, input }) => {
      const d = await db();
      const userId = ctx.user.id;
      const [enrollment] = await d.select().from(trailEnrollments)
        .where(and(eq(trailEnrollments.userId, userId), eq(trailEnrollments.trailId, input.trailId)));
      if (!enrollment) throw new TRPCError({ code: "FORBIDDEN" });
      if (enrollment.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Already completed" });
      const allProgress = await d.select({ status: trailModuleProgress.status })
        .from(trailModuleProgress).where(eq(trailModuleProgress.enrollmentId, enrollment.id));
      const allPassed = allProgress.every((p: { status: string }) => p.status === "passed");
      if (!allPassed) throw new TRPCError({ code: "FORBIDDEN", message: "Complete all modules first" });
      const [trail] = await d.select().from(trails).where(eq(trails.id, input.trailId));
      if (!trail) throw new TRPCError({ code: "NOT_FOUND" });
      const mods = await d.select().from(trailModules)
        .where(eq(trailModules.trailId, input.trailId)).orderBy(trailModules.order);
      const perMod = Math.ceil(trail.finalExamQuestions / mods.length);
      let allQs: QuestionRow[] = [];
      for (const mod of mods) {
        const qs = await getModuleQuestions(mod.id, perMod, []);
        allQs.push(...(qs as QuestionRow[]));
      }
      allQs = allQs.sort(() => Math.random() - 0.5).slice(0, trail.finalExamQuestions);
      return {
        questions: allQs.map((q: QuestionRow) => mapQ(q)),
        timeLimitSeconds: trail.finalExamTimeSeconds,
        passingScore: trail.passingScore,
      };
    }),

  // ─── Submit final exam ────────────────────────────────────────────────────
  submitFinalExam: protectedProcedure
    .input(z.object({
      trailId: z.number(),
      answers: z.array(z.object({ questionId: z.number(), selectedOption: z.string() })),
    }))
    .mutation(async ({ ctx, input }) => {
      const d = await db();
      const userId = ctx.user.id;
      const [enrollment] = await d.select().from(trailEnrollments)
        .where(and(eq(trailEnrollments.userId, userId), eq(trailEnrollments.trailId, input.trailId)));
      if (!enrollment) throw new TRPCError({ code: "FORBIDDEN" });
      const [trail] = await d.select().from(trails).where(eq(trails.id, input.trailId));
      if (!trail) throw new TRPCError({ code: "NOT_FOUND" });
      const qIds = input.answers.map(a => a.questionId);
      const qs = await d.select({ id: questions.id, correctOption: questions.correctOption })
        .from(questions).where(inArray(questions.id, qIds));
      const correctMap: Record<number, string> = {};
      for (const q of qs) correctMap[q.id] = q.correctOption;
      let correct = 0;
      for (const ans of input.answers) {
        if (correctMap[ans.questionId] === ans.selectedOption) correct++;
      }
      const total = input.answers.length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const passed = score >= trail.passingScore;
      if (correct > 0) {
        await awardTrailXp(userId, correct * TRAIL_XP_PER_CORRECT * 2, `trail_${input.trailId}_final_exam`);
      }
      if (passed) {
        await awardTrailXp(userId, 200, `trail_${input.trailId}_completion_bonus`);
        await d.update(trailEnrollments).set({
          status: "completed", finalExamScore: score, finalExamPassed: true, completedAt: new Date(),
        }).where(eq(trailEnrollments.id, enrollment.id));
      } else {
        await d.update(trailEnrollments).set({ finalExamScore: score, finalExamPassed: false })
          .where(eq(trailEnrollments.id, enrollment.id));
      }
      return { score, correct, total, passed, passingScore: trail.passingScore };
    }),

  // ─── My enrollments ───────────────────────────────────────────────────────
  myEnrollments: protectedProcedure.query(async ({ ctx }) => {
    const d = await db();
    const userId = ctx.user.id;
    const enrollments = await d.select({
      id: trailEnrollments.id, trailId: trailEnrollments.trailId,
      status: trailEnrollments.status, startedAt: trailEnrollments.startedAt,
      completedAt: trailEnrollments.completedAt, trailTitle: trails.title,
      trailDisciplineId: trails.disciplineId, trailTotalHours: trails.totalHours,
    }).from(trailEnrollments)
      .innerJoin(trails, eq(trailEnrollments.trailId, trails.id))
      .where(eq(trailEnrollments.userId, userId));
    const result = [];
    for (const e of enrollments) {
      const progress = await d.select({ status: trailModuleProgress.status })
        .from(trailModuleProgress).where(eq(trailModuleProgress.enrollmentId, e.id));
      const totalMods = progress.length;
      const passedMods = progress.filter((p: { status: string }) => p.status === "passed").length;
      result.push({ ...e, totalModules: totalMods, passedModules: passedMods });
    }
    return result;
  }),

  // ─── COORDINATOR: Create trail ────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      disciplineId: z.number(),
      title: z.string().min(3),
      description: z.string().optional(),
      totalHours: z.number().default(20),
      passingScore: z.number().min(50).max(100).default(70),
      finalExamQuestions: z.number().min(10).max(100).default(30),
      finalExamTimeSeconds: z.number().default(3600),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!["coordinator", "admin", "superuser"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const d = await db();
      const [result] = await d.insert(trails).values({ ...input, createdBy: ctx.user.id });
      return { id: (result as { insertId: number }).insertId };
    }),

  // ─── COORDINATOR: Update trail ────────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(3).optional(),
      description: z.string().optional(),
      totalHours: z.number().optional(),
      passingScore: z.number().min(50).max(100).optional(),
      finalExamQuestions: z.number().optional(),
      finalExamTimeSeconds: z.number().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!["coordinator", "admin", "superuser"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const d = await db();
      const { id, ...data } = input;
      await d.update(trails).set(data).where(eq(trails.id, id));
      return { success: true };
    }),

  // ─── COORDINATOR: Delete trail ────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!["coordinator", "admin", "superuser"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const d = await db();
      await d.update(trails).set({ active: false }).where(eq(trails.id, input.id));
      return { success: true };
    }),

  // ─── COORDINATOR: Add module ──────────────────────────────────────────────
  addModule: protectedProcedure
    .input(z.object({
      trailId: z.number(),
      title: z.string().min(2),
      summary: z.string().optional(),
      difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
      questionCount: z.number().min(5).max(100).default(20),
      minPassRate: z.number().min(50).max(100).default(70),
      questionFilter: z.object({
        disciplineId: z.number().optional(),
        subjectIds: z.array(z.number()).optional(),
        difficulty: z.string().optional(),
        author: z.string().optional(),
        year: z.number().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!["coordinator", "admin", "superuser"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const d = await db();
      const [maxRow] = await d.select({ maxOrder: sql<number>`MAX(\`order\`)` })
        .from(trailModules).where(eq(trailModules.trailId, input.trailId));
      const nextOrder = (maxRow?.maxOrder ?? 0) + 1;
      const { trailId, ...rest } = input;
      const [result] = await d.insert(trailModules).values({ trailId, ...rest, order: nextOrder });
      return { id: (result as { insertId: number }).insertId, order: nextOrder };
    }),

  // ─── COORDINATOR: Update module ───────────────────────────────────────────
  updateModule: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      summary: z.string().optional(),
      difficulty: z.enum(["easy", "medium", "hard", "mixed"]).optional(),
      questionCount: z.number().optional(),
      minPassRate: z.number().optional(),
      questionFilter: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!["coordinator", "admin", "superuser"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const d = await db();
      const { id, ...data } = input;
      await d.update(trailModules).set(data).where(eq(trailModules.id, id));
      return { success: true };
    }),

  // ─── COORDINATOR: Delete module ───────────────────────────────────────────
  deleteModule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!["coordinator", "admin", "superuser"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const d = await db();
      await d.delete(trailModuleQuestions).where(eq(trailModuleQuestions.moduleId, input.id));
      await d.delete(trailModules).where(eq(trailModules.id, input.id));
      return { success: true };
    }),

  // ─── COORDINATOR: Assign questions to module ──────────────────────────────
  assignQuestions: protectedProcedure
    .input(z.object({
      moduleId: z.number(),
      questionIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!["coordinator", "admin", "superuser"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const d = await db();
      await d.delete(trailModuleQuestions).where(eq(trailModuleQuestions.moduleId, input.moduleId));
      for (let i = 0; i < input.questionIds.length; i++) {
        await d.insert(trailModuleQuestions).values({
          moduleId: input.moduleId, questionId: input.questionIds[i], order: i + 1,
        });
      }
      return { success: true, count: input.questionIds.length };
    }),

  // ─── Level info ───────────────────────────────────────────────────────────
  getLevelInfo: publicProcedure.query(async () => {
    return LEVEL_THRESHOLDS.map((xp, i) => ({
      level: i + 1, xpRequired: xp, xpToNext: LEVEL_THRESHOLDS[i + 1] ?? null,
    }));
  }),
});
