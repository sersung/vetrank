import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { questions, teacherPermissions, activityLog, disciplines, subjects, users } from "../../drizzle/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { storagePut } from "../storage";

// Middleware: must be teacher, coordinator, superuser, or admin
const teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["teacher", "coordinator", "superuser", "admin"];
  if (!allowed.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Teacher access required" });
  }
  return next({ ctx });
});

export const teacherRouter = router({
  // ── Get teacher's assigned disciplines ────────────────────────────────────
  myPermissions: teacherProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    // Admin/coordinator/superuser have access to all disciplines
    if (["admin", "coordinator", "superuser"].includes(ctx.user.role)) {
      const allDisc = await db.select().from(disciplines).where(eq(disciplines.active, true));
      return allDisc.map(d => ({
        disciplineId: d.id,
        disciplineName: d.namePt,
        canCreateQuestions: true,
        canValidateQuestions: true,
        canCreateExams: true,
      }));
    }
    const perms = await db
      .select({
        disciplineId: teacherPermissions.disciplineId,
        disciplineName: disciplines.namePt,
        canCreateQuestions: teacherPermissions.canCreateQuestions,
        canValidateQuestions: teacherPermissions.canValidateQuestions,
        canCreateExams: teacherPermissions.canCreateExams,
      })
      .from(teacherPermissions)
      .leftJoin(disciplines, eq(teacherPermissions.disciplineId, disciplines.id))
      .where(eq(teacherPermissions.teacherId, ctx.user.id));
    return perms;
  }),

  // ── Create question (with optional image) ─────────────────────────────────
  createQuestion: teacherProcedure
    .input(z.object({
      disciplineId: z.number(),
      subjectId: z.number().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      year: z.number().optional(),
      questionModel: z.enum(["standard", "enade", "true_false", "assertion_reason"]).default("standard"),
      textPt: z.string().min(10),
      textEn: z.string().optional(),
      imageUrl: z.string().optional(),
      options: z.array(z.object({
        id: z.string(),
        textPt: z.string(),
        textEn: z.string().optional(),
        imageUrl: z.string().optional(),
      })).min(2).max(5),
      correctOption: z.string(),
      explanationPt: z.string().optional(),
      explanationEn: z.string().optional(),
      isPremium: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check permission for this discipline (skip for admin/coordinator/superuser)
      if (ctx.user.role === "teacher") {
        const perm = await db
          .select()
          .from(teacherPermissions)
          .where(and(
            eq(teacherPermissions.teacherId, ctx.user.id),
            eq(teacherPermissions.disciplineId, input.disciplineId),
            eq(teacherPermissions.canCreateQuestions, true)
          ))
          .limit(1);
        if (perm.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No permission for this discipline" });
        }
      }

      // Teachers submit as pending; admins/coordinators submit as approved
      const status = ["admin", "coordinator", "superuser"].includes(ctx.user.role) ? "approved" : "pending";

      const [result] = await db.insert(questions).values({
        disciplineId: input.disciplineId,
        subjectId: input.subjectId,
        createdBy: ctx.user.id,
        difficulty: input.difficulty,
        year: input.year,
        questionModel: input.questionModel,
        textPt: input.textPt,
        textEn: input.textEn,
        imageUrl: input.imageUrl,
        options: input.options,
        correctOption: input.correctOption,
        explanationPt: input.explanationPt,
        explanationEn: input.explanationEn,
        isPremium: input.isPremium,
        status,
      });

      const questionId = (result as { insertId: number }).insertId;

      await db.insert(activityLog).values({
        userId: ctx.user.id,
        action: "create_question",
        entityType: "question",
        entityId: questionId,
        details: { disciplineId: input.disciplineId, status },
      });

      return { success: true, questionId, status };
    }),

  // ── Get questions created by this teacher ──────────────────────────────────
  myQuestions: teacherProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "rejected", "all"]).default("all"),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions = [eq(questions.createdBy, ctx.user.id)] as ReturnType<typeof eq>[];
      if (input.status !== "all") conditions.push(eq(questions.status, input.status));

      return db
        .select({
          id: questions.id,
          textPt: questions.textPt,
          difficulty: questions.difficulty,
          questionModel: questions.questionModel,
          status: questions.status,
          createdAt: questions.createdAt,
          disciplineName: disciplines.namePt,
          subjectName: subjects.namePt,
        })
        .from(questions)
        .leftJoin(disciplines, eq(questions.disciplineId, disciplines.id))
        .leftJoin(subjects, eq(questions.subjectId, subjects.id))
        .where(and(...conditions))
        .orderBy(desc(questions.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // ── Get pending questions for validation ───────────────────────────────────
  pendingValidation: teacherProcedure
    .input(z.object({
      disciplineId: z.number().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get allowed discipline IDs for validation
      let allowedDisciplineIds: number[] = [];
      if (["admin", "coordinator", "superuser"].includes(ctx.user.role)) {
        const allDisc = await db.select({ id: disciplines.id }).from(disciplines);
        allowedDisciplineIds = allDisc.map(d => d.id);
      } else {
        const perms = await db
          .select({ disciplineId: teacherPermissions.disciplineId })
          .from(teacherPermissions)
          .where(and(
            eq(teacherPermissions.teacherId, ctx.user.id),
            eq(teacherPermissions.canValidateQuestions, true)
          ));
        allowedDisciplineIds = perms.map(p => p.disciplineId);
      }

      if (allowedDisciplineIds.length === 0) return [];

      const disciplineFilter = input.disciplineId
        ? eq(questions.disciplineId, input.disciplineId)
        : inArray(questions.disciplineId, allowedDisciplineIds);

      return db
        .select({
          id: questions.id,
          textPt: questions.textPt,
          difficulty: questions.difficulty,
          questionModel: questions.questionModel,
          options: questions.options,
          correctOption: questions.correctOption,
          explanationPt: questions.explanationPt,
          imageUrl: questions.imageUrl,
          createdAt: questions.createdAt,
          disciplineName: disciplines.namePt,
          subjectName: subjects.namePt,
          creatorName: users.name,
        })
        .from(questions)
        .leftJoin(disciplines, eq(questions.disciplineId, disciplines.id))
        .leftJoin(subjects, eq(questions.subjectId, subjects.id))
        .leftJoin(users, eq(questions.createdBy, users.id))
        .where(and(eq(questions.status, "pending"), eq(questions.active, true), disciplineFilter))
        .orderBy(asc(questions.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // ── Validate (approve/reject) a question ──────────────────────────────────
  validateQuestion: teacherProcedure
    .input(z.object({
      questionId: z.number(),
      action: z.enum(["approved", "rejected"]),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(questions)
        .set({ status: input.action, validatedBy: ctx.user.id })
        .where(eq(questions.id, input.questionId));
      await db.insert(activityLog).values({
        userId: ctx.user.id,
        action: `validate_question_${input.action}`,
        entityType: "question",
        entityId: input.questionId,
        details: { note: input.note },
      });
      return { success: true };
    }),

  // ── Upload question image ──────────────────────────────────────────────────
  getImageUploadUrl: teacherProcedure
    .input(z.object({
      filename: z.string(),
      contentType: z.string(),
      base64Data: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      const key = `question-images/${ctx.user.id}-${Date.now()}-${input.filename}`;
      const { url } = await storagePut(key, buffer, input.contentType);
      return { url, key };
    }),
});
