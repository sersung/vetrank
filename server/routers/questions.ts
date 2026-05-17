import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { storagePut } from "../storage";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharp = require("sharp") as any;
import {
  createQuestion,
  deleteQuestion,
  getAllDisciplines,
  getAllSubjects,
  getDisciplines,
  getDistinctAuthors,
  getDistinctBancas,
  getDistinctInstituicoes,
  getDistinctCargos,
  getDistinctCarreiras,
  getDistinctAreasFormacao,
  getDistinctYears,
  getQuestionById,
  getQuestions,
  getSubjectsByDiscipline,
  updateQuestion,
  createDiscursiveQuestion,
  updateDiscursiveQuestion,
  deleteDiscursiveQuestion,
  getDiscursiveQuestions,
  getDiscursiveQuestionById,
  getSavedFilters,
  saveFilter,
  deleteSavedFilter,
  getDb,
} from "../db";
import { questions, users, exams } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
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
  // Public stats for Home page counters
  publicStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totalQuestions: 0, totalUsers: 0, totalExams: 0, avgAccuracy: 78 };
    const [qCount, uCount, eCount, accRow] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(questions).where(eq(questions.active, true)),
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(exams).where(eq(exams.status, "completed")),
      db.select({ avg: sql<number>`AVG(score)` }).from(exams).where(eq(exams.status, "completed")),
    ]);
    return {
      totalQuestions: Number(qCount[0]?.count ?? 0),
      totalUsers: Number(uCount[0]?.count ?? 0),
      totalExams: Number(eCount[0]?.count ?? 0),
      avgAccuracy: Math.round(Number(accRow[0]?.avg ?? 78)),
    };
  }),
  list: publicProcedure
    .input(
      z.object({
        // Basic
        disciplineId: z.number().optional(),
        subjectId: z.number().optional(),
        search: z.string().optional(),
        // Classification
        questionType: questionTypeEnum.optional(),
        difficulty: z.enum(["very_easy", "easy", "medium", "hard", "very_hard"]).optional(),
        year: z.number().optional(),
        yearFrom: z.number().optional(),
        yearTo: z.number().optional(),
        author: z.string().optional(),
        banca: z.string().optional(),
        instituicao: z.string().optional(),
        cargo: z.string().optional(),
        carreira: z.string().optional(),
        areaFormacao: z.string().optional(),
        escolaridade: z.enum(["fundamental", "medio", "superior"]).optional(),
        // Status (admin)
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        isValidated: z.boolean().optional(),
        // Flags
        includeAnuladas: z.boolean().optional(),
        includeDesatualizadas: z.boolean().optional(),
        hasExplanation: z.boolean().optional(),
        // User activity
        myAnswers: z.enum(["answered", "unanswered", "correct", "incorrect"]).optional(),
        // Sorting & pagination
        orderBy: z.enum(["newest", "oldest", "year_desc", "year_asc"]).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const isPremium = ctx.user ? undefined : false;
      const userId = ctx.user?.id;
      return getQuestions({ ...input, isPremium, userId });
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
  distinctAuthors: publicProcedure.query(() => getDistinctAuthors()),
  distinctYears: publicProcedure.query(() => getDistinctYears()),
  distinctBancas: publicProcedure.query(() => getDistinctBancas()),
  distinctInstituicoes: publicProcedure.query(() => getDistinctInstituicoes()),
  distinctCargos: publicProcedure.query(() => getDistinctCargos()),
  distinctCarreiras: publicProcedure.query(() => getDistinctCarreiras()),
  distinctAreasFormacao: publicProcedure.query(() => getDistinctAreasFormacao()),

  // Saved filters (requires auth)
  savedFilters: protectedProcedure.query(({ ctx }) => getSavedFilters(ctx.user!.id)),
  saveFilter: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(128), filters: z.record(z.string(), z.any()) }))
    .mutation(({ input, ctx }) => saveFilter(ctx.user!.id, input.name, input.filters)),
  deleteSavedFilter: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => deleteSavedFilter(input.id, ctx.user!.id)),

  // Admin procedures
  create: protectedProcedure
    .input(
      z.object({
        disciplineId: z.number(),
        subjectId: z.number().optional(),
        difficulty: z.enum(["very_easy", "easy", "medium", "hard", "very_hard"]),
        year: z.number().optional(),
        questionType: questionTypeEnum.default("multiple_choice"),
        modelId: z.string().max(4).optional(),   // M1–M10
        grupoId: z.string().max(64).optional(),  // M10 block id
        posicaoBloco: z.number().optional(),     // M10 position in block
        subjectTag: z.string().optional(),
        author: z.string().optional(),
        banca: z.string().optional(),
        instituicao: z.string().optional(),
        cargo: z.string().optional(),
        carreira: z.string().optional(),
        areaFormacao: z.string().optional(),
        escolaridade: z.enum(["fundamental", "medio", "superior"]).optional(),
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
        isAnulada: z.boolean().default(false),
        isDesatualizada: z.boolean().default(false),
        imageUrl: z.string().optional(),
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
        difficulty: z.enum(["very_easy", "easy", "medium", "hard", "very_hard"]).optional(),
        year: z.number().optional(),
        questionType: questionTypeEnum.optional(),
        modelId: z.string().max(4).optional(),
        grupoId: z.string().max(64).optional(),
        posicaoBloco: z.number().optional(),
        subjectTag: z.string().optional(),
        author: z.string().optional(),
        banca: z.string().optional(),
        instituicao: z.string().optional(),
        cargo: z.string().optional(),
        carreira: z.string().optional(),
        areaFormacao: z.string().optional(),
        escolaridade: z.enum(["fundamental", "medio", "superior"]).optional(),
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
        isAnulada: z.boolean().optional(),
        isDesatualizada: z.boolean().optional(),
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
            imageUrl: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "teacher" && ctx.user.role !== "coordinator" && ctx.user.role !== "superuser") throw new TRPCError({ code: "FORBIDDEN" });
      let imported = 0;
      for (const q of input.questions) {
        await createQuestion(q as any);
        imported++;
      }
      return { imported };
    }),

  // Upload and optimize a question image → 3 responsive WebP variants (sm/md/lg)
  uploadImage: protectedProcedure
    .input(
      z.object({
        base64: z.string(),           // data:[mime];base64,... or raw base64
        filename: z.string().optional(),
        questionId: z.number().optional(),
        questionType: z.enum(["mc", "discursive"]).default("mc"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const allowed = ["admin", "teacher", "coordinator", "superuser"];
      if (!allowed.includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });

      const base64Data = input.base64.replace(/^data:[^;]+;base64,/, "");
      const inputBuffer = Buffer.from(base64Data, "base64");

      // Generate 3 responsive variants in parallel
      const [smBuf, mdBuf, lgBuf] = await Promise.all([
        sharp(inputBuffer).resize({ width: 480,  withoutEnlargement: true }).webp({ quality: 75 }).toBuffer(),
        sharp(inputBuffer).resize({ width: 960,  withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
        sharp(inputBuffer).resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer(),
      ]);

      const slug = (input.filename ?? "question").replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]/gi, "_");
      const base = `questions/images/${slug}_${Date.now()}`;

      // Upload all 3 variants in parallel
      const [smRes, mdRes, lgRes] = await Promise.all([
        storagePut(`${base}_sm.webp`, smBuf, "image/webp"),
        storagePut(`${base}_md.webp`, mdBuf, "image/webp"),
        storagePut(`${base}_lg.webp`, lgBuf, "image/webp"),
      ]);

      // Primary URL is the md variant (960px) — renderer derives sm/lg by suffix replacement
      const imageUrl = mdRes.url;

      if (input.questionId) {
        if (input.questionType === "discursive") {
          await updateDiscursiveQuestion(input.questionId, { imageUrl } as any);
        } else {
          await updateQuestion(input.questionId, { imageUrl } as any);
        }
      }

      return {
        url: imageUrl,          // primary (md)
        urls: { sm: smRes.url, md: mdRes.url, lg: lgRes.url },
        sizes: { sm: smBuf.length, md: mdBuf.length, lg: lgBuf.length },
      };
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
