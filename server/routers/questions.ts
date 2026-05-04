import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createQuestion,
  deleteQuestion,
  getAllDisciplines,
  getAllSubjects,
  getDisciplines,
  getQuestionById,
  getQuestions,
  getSubjectsByDiscipline,
  updateQuestion,
  createDiscursiveQuestion,
  updateDiscursiveQuestion,
  deleteDiscursiveQuestion,
  getDiscursiveQuestions,
  getDiscursiveQuestionById,
} from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const questionTypeEnum = z.enum([
  "multiple_choice",
  "assertion_reason",
  "complex_multiple_choice",
  "matching",
  "true_false",
  "ordering",
  "cloze",
  "clinical_case",
  "image_analysis",
  "interpretation",
  "discursive",
]);

// formatData schema — flexible JSON for each question type
const formatDataSchema = z.any().optional();

export const questionsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        disciplineId: z.number().optional(),
        subjectId: z.number().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        year: z.number().optional(),
        questionType: questionTypeEnum.optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const isPremium = ctx.user ? undefined : false;
      return getQuestions({ ...input, isPremium });
    }),
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const q = await getQuestionById(input.id);
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      return q;
    }),
  disciplines: publicProcedure.query(() => getDisciplines()),
  allDisciplines: publicProcedure.query(() => getAllDisciplines()),
  subjects: publicProcedure
    .input(z.object({ disciplineId: z.number() }))
    .query(({ input }) => getSubjectsByDiscipline(input.disciplineId)),
  allSubjects: publicProcedure.query(() => getAllSubjects()),

  // Admin procedures
  create: protectedProcedure
    .input(
      z.object({
        disciplineId: z.number(),
        subjectId: z.number().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        year: z.number().optional(),
        questionType: questionTypeEnum.default("multiple_choice"),
        subjectTag: z.string().optional(),
        author: z.string().optional(),
        textPt: z.string().min(5),
        textEn: z.string().optional(),
        options: z.array(
          z.object({ id: z.string(), textPt: z.string(), textEn: z.string().optional() })
        ),
        correctOption: z.string(),
        explanationPt: z.string().optional(),
        explanationEn: z.string().optional(),
        assertion1: z.string().optional(),
        assertion2: z.string().optional(),
        formatData: formatDataSchema,
        isPremium: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "teacher") throw new TRPCError({ code: "FORBIDDEN" });
      const id = await createQuestion(input as any);
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        disciplineId: z.number().optional(),
        subjectId: z.number().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        year: z.number().optional(),
        questionType: questionTypeEnum.optional(),
        subjectTag: z.string().optional(),
        author: z.string().optional(),
        textPt: z.string().optional(),
        textEn: z.string().optional(),
        options: z.array(z.object({ id: z.string(), textPt: z.string(), textEn: z.string().optional() })).optional(),
        correctOption: z.string().optional(),
        explanationPt: z.string().optional(),
        explanationEn: z.string().optional(),
        assertion1: z.string().optional(),
        assertion2: z.string().optional(),
        formatData: formatDataSchema,
        isPremium: z.boolean().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "teacher") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateQuestion(id, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteQuestion(input.id);
      return { success: true };
    }),

  importCsv: protectedProcedure
    .input(z.object({ csv: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const lines = input.csv.split("\n").filter((l) => l.trim() && !l.startsWith("textPt"));
      let imported = 0;
      for (const line of lines) {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const [textPt, textEn, disciplineId, difficulty, optA, optB, optC, optD, optE, correctOption, explanationPt, year, isPremium, subjectTag, author] = cols;
        if (!textPt || !disciplineId || !difficulty || !optA) continue;
        const options = [
          { id: "A", textPt: optA, textEn: optA },
          { id: "B", textPt: optB || "", textEn: optB || "" },
          { id: "C", textPt: optC || "", textEn: optC || "" },
          { id: "D", textPt: optD || "", textEn: optD || "" },
          ...(optE ? [{ id: "E", textPt: optE, textEn: optE }] : []),
        ];
        await createQuestion({
          textPt, textEn: textEn || undefined,
          disciplineId: parseInt(disciplineId),
          difficulty: (difficulty as "easy" | "medium" | "hard"),
          options, correctOption: correctOption || "A",
          explanationPt: explanationPt || undefined,
          year: year ? parseInt(year) : undefined,
          isPremium: isPremium === "true",
          subjectTag: subjectTag || undefined,
          author: author || undefined,
          questionType: "multiple_choice",
        } as any);
        imported++;
      }
      return { imported };
    }),

  bulkImport: protectedProcedure
    .input(
      z.object({
        questions: z.array(
          z.object({
            disciplineId: z.number(),
            subjectId: z.number().optional(),
            difficulty: z.enum(["easy", "medium", "hard"]),
            year: z.number().optional(),
            questionType: questionTypeEnum.optional(),
            subjectTag: z.string().optional(),
            author: z.string().optional(),
            textPt: z.string(),
            textEn: z.string().optional(),
            options: z.array(z.object({ id: z.string(), textPt: z.string(), textEn: z.string().optional() })),
            correctOption: z.string(),
            explanationPt: z.string().optional(),
            explanationEn: z.string().optional(),
            assertion1: z.string().optional(),
            assertion2: z.string().optional(),
            isPremium: z.boolean().default(false),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      let imported = 0;
      for (const q of input.questions) {
        await createQuestion(q as any);
        imported++;
      }
      return { imported };
    }),
});

// ─── Discursive Questions Router ──────────────────────────────────────────────
export const discursiveRouter = router({
  list: publicProcedure
    .input(
      z.object({
        disciplineId: z.number().optional(),
        subjectId: z.number().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const isPremium = ctx.user ? undefined : false;
      return getDiscursiveQuestions({ ...input, isPremium });
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const q = await getDiscursiveQuestionById(input.id);
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      // Gate answer behind premium/trial
      if (!ctx.user || (ctx.user.plan === "free" && ctx.user.role === "user")) {
        return { ...q, expectedAnswerPt: null, expectedAnswerEn: null };
      }
      return q;
    }),

  create: protectedProcedure
    .input(
      z.object({
        disciplineId: z.number(),
        subjectId: z.number().optional(),
        subjectTag: z.string().optional(),
        author: z.string().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        year: z.number().optional(),
        textPt: z.string().min(5),
        textEn: z.string().optional(),
        expectedAnswerPt: z.string().min(5),
        expectedAnswerEn: z.string().optional(),
        isPremium: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "teacher") throw new TRPCError({ code: "FORBIDDEN" });
      const id = await createDiscursiveQuestion({ ...input, createdBy: ctx.user.id } as any);
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        disciplineId: z.number().optional(),
        subjectId: z.number().optional(),
        subjectTag: z.string().optional(),
        author: z.string().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        year: z.number().optional(),
        textPt: z.string().optional(),
        textEn: z.string().optional(),
        expectedAnswerPt: z.string().optional(),
        expectedAnswerEn: z.string().optional(),
        isPremium: z.boolean().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "teacher") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateDiscursiveQuestion(id, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteDiscursiveQuestion(input.id);
      return { success: true };
    }),
});
