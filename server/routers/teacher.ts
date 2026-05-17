import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { questions, teacherPermissions, activityLog, disciplines, subjects } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
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

  // ── Create question (with all model fields) ───────────────────────────────
  createQuestion: teacherProcedure
    .input(z.object({
      disciplineId: z.number(),
      subjectId: z.number().optional(),
      difficulty: z.enum(["very_easy", "easy", "medium", "hard", "very_hard"]),
      year: z.number().optional(),
      questionType: z.enum([
        "multiple_choice", "assertion_reason", "complex_multiple_choice",
        "matching", "true_false", "ordering", "cloze",
        "clinical_case", "image_analysis", "interpretation", "discursive",
      ]).default("multiple_choice"),
      modelId: z.string().max(4).optional(),
      grupoId: z.string().optional(),
      posicaoBloco: z.number().optional(),
      subjectTag: z.string().optional(),
      author: z.string().optional(),
      banca: z.string().optional(),
      instituicao: z.string().optional(),
      cargo: z.string().optional(),
      carreira: z.string().optional(),
      areaFormacao: z.string().optional(),
      escolaridade: z.enum(["fundamental", "medio", "superior"]).optional(),
      textPt: z.string().min(10),
      textEn: z.string().optional(),
      imageUrl: z.string().optional(),
      options: z.array(z.object({
        id: z.string(), textPt: z.string(), textEn: z.string().optional(),
      })).min(2).max(5),
      correctOption: z.string(),
      explanationPt: z.string().optional(),
      explanationEn: z.string().optional(),
      assertion1: z.string().optional(),
      assertion2: z.string().optional(),
      a1Verdadeira: z.boolean().optional(),
      a2Verdadeira: z.boolean().optional(),
      relacaoCausal: z.boolean().optional(),
      formatData: z.any().optional(),
      isPremium: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

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

      const status = ["admin", "coordinator", "superuser"].includes(ctx.user.role) ? "approved" : "pending";

      const [result] = await db.insert(questions).values({
        disciplineId: input.disciplineId,
        subjectId: input.subjectId,
        createdBy: ctx.user.id,
        difficulty: input.difficulty,
        year: input.year,
        questionType: input.questionType,
        modelId: input.modelId,
        grupoId: input.grupoId,
        posicaoBloco: input.posicaoBloco,
        subjectTag: input.subjectTag,
        author: input.author,
        banca: input.banca,
        instituicao: input.instituicao,
        cargo: input.cargo,
        carreira: input.carreira,
        areaFormacao: input.areaFormacao,
        escolaridade: input.escolaridade,
        textPt: input.textPt,
        textEn: input.textEn,
        imageUrl: input.imageUrl,
        options: input.options,
        correctOption: input.correctOption,
        explanationPt: input.explanationPt,
        explanationEn: input.explanationEn,
        assertion1: input.assertion1,
        assertion2: input.assertion2,
        a1Verdadeira: input.a1Verdadeira,
        a2Verdadeira: input.a2Verdadeira,
        relacaoCausal: input.relacaoCausal,
        formatData: input.formatData,
        isPremium: input.isPremium,
        status,
      } as any);

      await db.insert(activityLog).values({
        userId: ctx.user.id,
        action: "create_question",
        entityType: "question",
        entityId: (result as any).insertId,
        details: { disciplineId: input.disciplineId, status },
      });

      return { success: true, questionId: (result as any).insertId, status };
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
      const rows = await db.execute(`
        SELECT q.id, q.textPt, q.difficulty, q.questionModel, q.status, q.createdAt,
          d.namePt as disciplineName, s.namePt as subjectName
        FROM questions q
        LEFT JOIN disciplines d ON q.disciplineId = d.id
        LEFT JOIN subjects s ON q.subjectId = s.id
        WHERE q.createdBy = ${ctx.user.id}
        ${input.status !== "all" ? `AND q.status = '${input.status}'` : ""}
        ORDER BY q.createdAt DESC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `) as any;
      return rows[0] as any[];
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
        // All disciplines
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

      const discFilter = input.disciplineId
        ? `AND q.disciplineId = ${input.disciplineId}`
        : `AND q.disciplineId IN (${allowedDisciplineIds.join(",")})`;

      const rows = await db.execute(`
        SELECT q.id, q.textPt, q.difficulty, q.questionModel, q.options, q.correctOption,
          q.explanationPt, q.imageUrl, q.createdAt,
          d.namePt as disciplineName, s.namePt as subjectName,
          u.name as creatorName
        FROM questions q
        LEFT JOIN disciplines d ON q.disciplineId = d.id
        LEFT JOIN subjects s ON q.subjectId = s.id
        LEFT JOIN users u ON q.createdBy = u.id
        WHERE q.status = 'pending' AND q.active = 1 ${discFilter}
        ORDER BY q.createdAt ASC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `) as any;
      return rows[0] as any[];
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
