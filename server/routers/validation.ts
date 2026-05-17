import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  questions,
  discursiveQuestions,
  questionAssignments,
  users,
} from "../../drizzle/schema";
import { eq, and, inArray, sql, desc, count } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { createRequire } from "module";
import mammoth from "mammoth";
const _require = createRequire(import.meta.url);
// pdf-parse is a CommonJS module — use createRequire for ESM compatibility
const pdfParse = _require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  return db;
}

function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const validationRouter = router({
  // ── Validate / unvalidate a question (coordinator or teacher) ──────────────
  validateQuestion: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      questionType: z.enum(["multiple_choice", "discursive"]),
      isValidated: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user.role, ["teacher", "coordinator", "superuser", "admin"]);
      const db = await requireDb();
      const now = new Date();

      if (input.questionType === "multiple_choice") {
        await db.update(questions)
          .set({
            isValidated: input.isValidated,
            validatedBy: ctx.user.id,
            validatedAt: input.isValidated ? now : null,
            status: input.isValidated ? "approved" : "pending",
          })
          .where(eq(questions.id, input.questionId));
      } else {
        await db.update(discursiveQuestions)
          .set({
            isValidated: input.isValidated,
            validatedBy: ctx.user.id,
            validatedAt: input.isValidated ? now : null,
          })
          .where(eq(discursiveQuestions.id, input.questionId));
      }

      return { success: true };
    }),

  // ── Get validation stats (coordinator only) ────────────────────────────────
  getValidationStats: protectedProcedure
    .query(async ({ ctx }) => {
      requireRole(ctx.user.role, ["coordinator", "superuser", "admin"]);
      const db = await requireDb();

      const [mcStats] = await db.select({
        total: count(),
        validated: sql<number>`SUM(CASE WHEN is_validated = 1 THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN is_validated = 0 THEN 1 ELSE 0 END)`,
      }).from(questions).where(eq(questions.active, true));

      const [discStats] = await db.select({
        total: count(),
        validated: sql<number>`SUM(CASE WHEN is_validated = 1 THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN is_validated = 0 THEN 1 ELSE 0 END)`,
      }).from(discursiveQuestions).where(eq(discursiveQuestions.active, true));

      // Assignments by professor
      const byProfessor = await db.select({
        professorId: questionAssignments.assignedTo,
        total: count(),
        approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
        rejected: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
      })
        .from(questionAssignments)
        .groupBy(questionAssignments.assignedTo);

      type ProfRow = (typeof byProfessor)[0];

      // Get professor names
      const professorIds = byProfessor.map((r: ProfRow) => r.professorId);
      let professorNames: Record<number, string> = {};
      if (professorIds.length > 0) {
        const profs = await db.select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, professorIds));
        for (const p of profs) {
          professorNames[p.id] = p.name ?? `Professor #${p.id}`;
        }
      }

      return {
        multipleChoice: {
          total: Number(mcStats?.total ?? 0),
          validated: Number(mcStats?.validated ?? 0),
          pending: Number(mcStats?.pending ?? 0),
        },
        discursive: {
          total: Number(discStats?.total ?? 0),
          validated: Number(discStats?.validated ?? 0),
          pending: Number(discStats?.pending ?? 0),
        },
        byProfessor: byProfessor.map((r: ProfRow) => ({
          professorId: r.professorId,
          professorName: professorNames[r.professorId] ?? `Professor #${r.professorId}`,
          total: Number(r.total),
          approved: Number(r.approved ?? 0),
          rejected: Number(r.rejected ?? 0),
          pending: Number(r.pending ?? 0),
        })),
      };
    }),

  // ── List questions for validation (coordinator or teacher) ─────────────────
  listForValidation: protectedProcedure
    .input(z.object({
      questionType: z.enum(["multiple_choice", "discursive"]).default("multiple_choice"),
      disciplineId: z.number().optional(),
      isValidated: z.boolean().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      requireRole(ctx.user.role, ["teacher", "coordinator", "superuser", "admin"]);
      const db = await requireDb();
      const offset = (input.page - 1) * input.pageSize;

      if (input.questionType === "multiple_choice") {
        const conditions = [eq(questions.active, true)];
        if (input.disciplineId) conditions.push(eq(questions.disciplineId, input.disciplineId));
        if (input.isValidated !== undefined) conditions.push(eq(questions.isValidated, input.isValidated));

        const rows = await db.select({
          id: questions.id,
          textPt: questions.textPt,
          disciplineId: questions.disciplineId,
          subjectId: questions.subjectId,
          difficulty: questions.difficulty,
          isValidated: questions.isValidated,
          validatedBy: questions.validatedBy,
          validatedAt: questions.validatedAt,
          status: questions.status,
          author: questions.author,
          year: questions.year,
          createdAt: questions.createdAt,
        })
          .from(questions)
          .where(and(...conditions))
          .orderBy(desc(questions.createdAt))
          .limit(input.pageSize)
          .offset(offset);

        const [{ total }] = await db.select({ total: count() })
          .from(questions)
          .where(and(...conditions));

        return { rows, total: Number(total), page: input.page, pageSize: input.pageSize };
      } else {
        const conditions = [eq(discursiveQuestions.active, true)];
        if (input.disciplineId) conditions.push(eq(discursiveQuestions.disciplineId, input.disciplineId));
        if (input.isValidated !== undefined) conditions.push(eq(discursiveQuestions.isValidated, input.isValidated));

        const rows = await db.select({
          id: discursiveQuestions.id,
          textPt: discursiveQuestions.textPt,
          disciplineId: discursiveQuestions.disciplineId,
          subjectId: discursiveQuestions.subjectId,
          difficulty: discursiveQuestions.difficulty,
          isValidated: discursiveQuestions.isValidated,
          validatedBy: discursiveQuestions.validatedBy,
          validatedAt: discursiveQuestions.validatedAt,
          author: discursiveQuestions.author,
          year: discursiveQuestions.year,
          createdAt: discursiveQuestions.createdAt,
        })
          .from(discursiveQuestions)
          .where(and(...conditions))
          .orderBy(desc(discursiveQuestions.createdAt))
          .limit(input.pageSize)
          .offset(offset);

        const [{ total }] = await db.select({ total: count() })
          .from(discursiveQuestions)
          .where(and(...conditions));

        return { rows, total: Number(total), page: input.page, pageSize: input.pageSize };
      }
    }),

  // ── Create assignment (coordinator assigns questions to professor) ──────────
  createAssignment: protectedProcedure
    .input(z.object({
      assignedTo: z.number(),
      questionIds: z.array(z.number()),
      questionType: z.enum(["multiple_choice", "discursive"]).default("multiple_choice"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user.role, ["coordinator", "superuser", "admin"]);
      const db = await requireDb();

      const rows = input.questionIds.map(qid => ({
        assignedBy: ctx.user.id,
        assignedTo: input.assignedTo,
        questionId: qid,
        questionType: input.questionType,
        status: "pending" as const,
      }));

      await db.insert(questionAssignments).values(rows);
      return { success: true, count: rows.length };
    }),

  // ── List my assignments (professor) ────────────────────────────────────────
  listMyAssignments: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      requireRole(ctx.user.role, ["teacher", "coordinator", "superuser", "admin"]);
      const db = await requireDb();
      const offset = (input.page - 1) * input.pageSize;

      const conditions = [eq(questionAssignments.assignedTo, ctx.user.id)];
      if (input.status !== "all") {
        conditions.push(eq(questionAssignments.status, input.status));
      }

      const assignments = await db.select()
        .from(questionAssignments)
        .where(and(...conditions))
        .orderBy(desc(questionAssignments.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const [{ total }] = await db.select({ total: count() })
        .from(questionAssignments)
        .where(and(...conditions));

      // Fetch question details for each assignment
      type AssignmentRow = (typeof assignments)[0];
      const mcIds = assignments.filter((a: AssignmentRow) => a.questionType === "multiple_choice").map((a: AssignmentRow) => a.questionId);
      const discIds = assignments.filter((a: AssignmentRow) => a.questionType === "discursive").map((a: AssignmentRow) => a.questionId);

      let mcQuestions: any[] = [];
      let discQuestions: any[] = [];

      if (mcIds.length > 0) {
        mcQuestions = await db.select({
          id: questions.id,
          textPt: questions.textPt,
          disciplineId: questions.disciplineId,
          difficulty: questions.difficulty,
          isValidated: questions.isValidated,
          options: questions.options,
          correctOption: questions.correctOption,
        }).from(questions).where(inArray(questions.id, mcIds));
      }

      if (discIds.length > 0) {
        discQuestions = await db.select({
          id: discursiveQuestions.id,
          textPt: discursiveQuestions.textPt,
          disciplineId: discursiveQuestions.disciplineId,
          difficulty: discursiveQuestions.difficulty,
          isValidated: discursiveQuestions.isValidated,
          expectedAnswerPt: discursiveQuestions.expectedAnswerPt,
        }).from(discursiveQuestions).where(inArray(discursiveQuestions.id, discIds));
      }

      const mcMap: Record<number, (typeof mcQuestions)[0]> = Object.fromEntries(mcQuestions.map((q: (typeof mcQuestions)[0]) => [q.id, q]));
      const discMap: Record<number, (typeof discQuestions)[0]> = Object.fromEntries(discQuestions.map((q: (typeof discQuestions)[0]) => [q.id, q]));

      const enriched = assignments.map((a: (typeof assignments)[0]) => ({
        ...a,
        question: a.questionType === "multiple_choice"
          ? mcMap[a.questionId]
          : discMap[a.questionId],
      }));

      return { rows: enriched, total: Number(total), page: input.page, pageSize: input.pageSize };
    }),

  // ── Update assignment status (professor validates/rejects) ─────────────────
  updateAssignment: protectedProcedure
    .input(z.object({
      assignmentId: z.number(),
      status: z.enum(["approved", "rejected"]),
      notes: z.string().optional(),
      // Obrigatório quando status = "rejected"
      rejectionReason: z.enum([
        "erro_conteudo", "gabarito_incorreto", "alternativas",
        "enunciado_ambiguo", "nivel_inadequado", "fora_escopo",
        "duplicata", "linguagem", "outros",
      ]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user.role, ["teacher", "coordinator", "superuser", "admin"]);
      const db = await requireDb();

      // Rejeição exige motivo e justificativa
      if (input.status === "rejected") {
        if (!input.rejectionReason) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o motivo da recusa." });
        }
        if (!input.notes || input.notes.trim().length < 20) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A justificativa deve ter no mínimo 20 caracteres." });
        }
      }

      const [assignment] = await db.select()
        .from(questionAssignments)
        .where(and(
          eq(questionAssignments.id, input.assignmentId),
          eq(questionAssignments.assignedTo, ctx.user.id),
        ));

      if (!assignment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Atribuição não encontrada" });
      }

      await db.update(questionAssignments)
        .set({
          status: input.status,
          notes: input.notes,
          rejectionReason: input.rejectionReason,
        })
        .where(eq(questionAssignments.id, input.assignmentId));

      const isValidated = input.status === "approved";
      const now = new Date();

      if (assignment.questionType === "multiple_choice") {
        await db.update(questions)
          .set({
            isValidated,
            validatedBy: ctx.user.id,
            validatedAt: isValidated ? now : null,
            status: isValidated ? "approved" : "rejected",
          })
          .where(eq(questions.id, assignment.questionId));
      } else {
        await db.update(discursiveQuestions)
          .set({
            isValidated,
            validatedBy: ctx.user.id,
            validatedAt: isValidated ? now : null,
          })
          .where(eq(discursiveQuestions.id, assignment.questionId));
      }

      return { success: true };
    }),

  // ── List rejected questions created by this teacher ────────────────────────
  listMyRejectedQuestions: protectedProcedure
    .query(async ({ ctx }) => {
      requireRole(ctx.user.role, ["teacher", "coordinator", "superuser", "admin"]);
      const db = await requireDb();

      // Find rejected questions created by this user
      const rejected = await db.select({
        id: questions.id,
        textPt: questions.textPt,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        modelId: (questions as any).modelId,
        banca: (questions as any).banca,
        year: questions.year,
        disciplineId: questions.disciplineId,
        revisionCount: (questions as any).revisionCount,
        revisedAt: (questions as any).revisedAt,
        updatedAt: questions.updatedAt,
      })
        .from(questions)
        .where(and(
          eq(questions.createdBy, ctx.user.id),
          eq(questions.status, "rejected"),
          eq(questions.active, true),
        ))
        .orderBy(desc(questions.updatedAt));

      // Get latest rejection reason for each question
      if (rejected.length === 0) return [];
      const qIds = rejected.map(q => q.id);
      const latestAssignments = await db.select({
        questionId: questionAssignments.questionId,
        rejectionReason: questionAssignments.rejectionReason,
        notes: questionAssignments.notes,
        assignedTo: questionAssignments.assignedTo,
        updatedAt: questionAssignments.updatedAt,
      })
        .from(questionAssignments)
        .where(and(
          inArray(questionAssignments.questionId, qIds),
          eq(questionAssignments.status, "rejected"),
        ))
        .orderBy(desc(questionAssignments.updatedAt));

      // Latest rejection per question
      const latestMap: Record<number, typeof latestAssignments[0]> = {};
      for (const a of latestAssignments) {
        if (!latestMap[a.questionId]) latestMap[a.questionId] = a;
      }

      return rejected.map(q => ({
        ...q,
        rejection: latestMap[q.id] ?? null,
      }));
    }),

  // ── Submit revision: teacher revises a rejected question and resubmits ──────
  submitRevision: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      // Fields that can be updated in revision
      textPt: z.string().min(10),
      textEn: z.string().optional(),
      options: z.array(z.object({ id: z.string(), textPt: z.string(), textEn: z.string().optional() })),
      correctOption: z.string(),
      explanationPt: z.string().optional(),
      explanationEn: z.string().optional(),
      assertion1: z.string().optional(),
      assertion2: z.string().optional(),
      a1Verdadeira: z.boolean().optional(),
      a2Verdadeira: z.boolean().optional(),
      relacaoCausal: z.boolean().optional(),
      formatData: z.any().optional(),
      imageUrl: z.string().optional(),
      // What changed
      revisionNotes: z.string().min(10, "Descreva o que foi alterado na revisão (mínimo 10 caracteres)."),
    }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user.role, ["teacher", "coordinator", "superuser", "admin"]);
      const db = await requireDb();

      // Verify ownership and status
      const [q] = await db.select({ id: questions.id, createdBy: questions.createdBy, status: questions.status })
        .from(questions)
        .where(eq(questions.id, input.questionId));

      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      if (q.createdBy !== ctx.user.id && !["coordinator","superuser","admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode revisar questão de outro professor." });
      }
      if (q.status !== "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas questões rejeitadas podem ser revisadas." });
      }

      const { questionId, revisionNotes, ...fields } = input;
      const now = new Date();

      await db.update(questions)
        .set({
          ...fields,
          status: "pending",
          isValidated: false,
          validatedBy: null,
          validatedAt: null,
          revisionNotes,
          revisedAt: now,
          // increment revisionCount
          revisionCount: sql`revision_count + 1`,
        } as any)
        .where(eq(questions.id, questionId));

      return { success: true };
    }),

  // ── List pending-assignment questions (questions without any assignment) ─────
  listPendingAssignment: protectedProcedure
    .input(z.object({
      disciplineId: z.number().optional(),
      modelId: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      requireRole(ctx.user.role, ["coordinator", "superuser", "admin"]);
      const db = await requireDb();
      const offset = (input.page - 1) * input.pageSize;

      // Questions in "pending" status (created by teachers, not yet assigned or re-submitted)
      const conditions = [
        eq(questions.active, true),
        eq(questions.status, "pending"),
      ];
      if (input.disciplineId) conditions.push(eq(questions.disciplineId, input.disciplineId));

      const rows = await db.select({
        id: questions.id,
        textPt: questions.textPt,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        disciplineId: questions.disciplineId,
        year: questions.year,
        banca: (questions as any).banca,
        modelId: (questions as any).modelId,
        revisionCount: (questions as any).revisionCount,
        createdBy: questions.createdBy,
        createdAt: questions.createdAt,
      })
        .from(questions)
        .where(and(...conditions))
        .orderBy(desc(questions.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const [{ total }] = await db.select({ total: count() }).from(questions).where(and(...conditions));
      return { rows, total: Number(total) };
    }),

  // ── List all assignments (coordinator monitoring) ──────────────────────────
  listAllAssignments: protectedProcedure
    .input(z.object({
      professorId: z.number().optional(),
      status: z.enum(["pending", "approved", "rejected", "all"]).default("all"),
      page: z.number().default(1),
      pageSize: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      requireRole(ctx.user.role, ["coordinator", "superuser", "admin"]);
      const db = await requireDb();
      const offset = (input.page - 1) * input.pageSize;

      const conditions: any[] = [];
      if (input.professorId) conditions.push(eq(questionAssignments.assignedTo, input.professorId));
      if (input.status !== "all") conditions.push(eq(questionAssignments.status, input.status));

      const rows = await db.select()
        .from(questionAssignments)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(questionAssignments.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const [{ total }] = await db.select({ total: count() })
        .from(questionAssignments)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return { rows, total: Number(total) };
    }),

  // ── List professors for assignment ─────────────────────────────────────────
  listProfessors: protectedProcedure
    .query(async ({ ctx }) => {
      requireRole(ctx.user.role, ["coordinator", "superuser", "admin"]);
      const db = await requireDb();

      return db.select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.role, ["teacher", "coordinator"]));
    }),

  // ── Extract questions from PDF or DOCX via AI ──────────────────────────────
  extractFromFile: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),          // base64-encoded file content
      mimeType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]),
      fileName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user.role, ["teacher", "coordinator", "superuser", "admin"]);

      // ── 1. Extract raw text from file ──────────────────────────────────────
      let rawText = "";
      const buffer = Buffer.from(input.fileBase64, "base64");

      if (input.mimeType === "application/pdf") {
        try {
          const parsed = await pdfParse(buffer);
          rawText = parsed.text;
        } catch (err: unknown) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Erro ao processar PDF: ${(err as Error).message}` });
        }
      } else {
        // DOCX / DOC
        try {
          const result = await mammoth.extractRawText({ buffer });
          rawText = result.value;
        } catch (err: unknown) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Erro ao processar Word: ${(err as Error).message}` });
        }
      }

      if (!rawText.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum texto encontrado no arquivo. Verifique se o arquivo não está protegido ou escaneado como imagem." });
      }

      // Limit text to avoid token overflow (keep first 30k chars)
      const textForLLM = rawText.slice(0, 30000);

      // ── 2. Call LLM to extract structured questions ────────────────────────
      const systemPrompt = `Você é um especialista em medicina veterinária e criação de questões para concursos e provas do CFMV/CRMV.
Sua tarefa é extrair questões de múltipla escolha do texto fornecido e retornar um JSON estruturado.

Regras:
- Identifique cada questão com seu enunciado completo (textPt)
- Identifique as alternativas A, B, C, D e E (se existirem; preencha com texto vazio se não houver)
- Identifique o gabarito (correctOption: "A", "B", "C", "D" ou "E")
- Classifique a dificuldade: "easy" (fácil), "medium" (médio) ou "hard" (difícil)
- Identifique o tipo: "multiple_choice" (padrão), "assertion_reason" (asserção-razão), "true_false" (V/F), "clinical_case" (caso clínico)
- Sugira a área/disciplina em português (ex: "Clínica de Pequenos Animais", "Farmacologia", "Patologia Geral")
- Extraia o ano se mencionado (ex: 2023)
- Extraia o autor/banca se mencionado (ex: "CFMV", "CRMV-SP")
- Se houver explicação ou justificativa, inclua em explanationPt
- Se for asserção-razão, coloque as duas proposições em assertion1 e assertion2
- Ignore textos que não sejam questões (cabeçalhos, instruções gerais, gabaritos isolados)

Retorne SOMENTE um JSON válido com a estrutura:
{
  "questions": [
    {
      "textPt": "string",
      "optA": "string",
      "optB": "string",
      "optC": "string",
      "optD": "string",
      "optE": "string",
      "correctOption": "A"|"B"|"C"|"D"|"E",
      "difficulty": "easy"|"medium"|"hard",
      "questionType": "multiple_choice"|"assertion_reason"|"true_false"|"clinical_case",
      "disciplineSuggestion": "string",
      "year": number|null,
      "author": "string",
      "explanationPt": "string",
      "assertion1": "string",
      "assertion2": "string"
    }
  ]
}`;

      let llmResult: { questions: any[] };
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Extraia todas as questões do seguinte texto:\n\n${textForLLM}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "extracted_questions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        textPt: { type: "string" },
                        optA: { type: "string" },
                        optB: { type: "string" },
                        optC: { type: "string" },
                        optD: { type: "string" },
                        optE: { type: "string" },
                        correctOption: { type: "string" },
                        difficulty: { type: "string" },
                        questionType: { type: "string" },
                        disciplineSuggestion: { type: "string" },
                        year: { type: ["number", "null"] },
                        author: { type: "string" },
                        explanationPt: { type: "string" },
                        assertion1: { type: "string" },
                        assertion2: { type: "string" },
                      },
                      required: ["textPt", "optA", "optB", "optC", "optD", "optE", "correctOption", "difficulty", "questionType", "disciplineSuggestion", "year", "author", "explanationPt", "assertion1", "assertion2"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) throw new Error("LLM retornou resposta vazia");
        const parsed = typeof content === "string" ? JSON.parse(content) : content;
        llmResult = parsed as { questions: any[] };
      } catch (err: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro na extração via IA: ${(err as Error).message}`,
        });
      }

      // ── 3. Validate and normalize extracted questions ──────────────────────
      const VALID_OPTIONS = ["A", "B", "C", "D", "E"];
      const VALID_DIFFICULTIES = ["easy", "medium", "hard"];
      const VALID_TYPES = ["multiple_choice", "assertion_reason", "complex_multiple_choice", "matching", "true_false", "ordering", "cloze", "clinical_case", "image_analysis", "interpretation", "discursive"];

      const normalized = (llmResult.questions ?? []).map((q: any, i: number) => {
        const errors: string[] = [];
        if (!q.textPt?.trim()) errors.push("Enunciado vazio");
        if (!VALID_OPTIONS.includes(q.correctOption?.toUpperCase())) errors.push(`Gabarito inválido: ${q.correctOption}`);
        if (!q.optA?.trim() || !q.optB?.trim() || !q.optC?.trim() || !q.optD?.trim()) errors.push("Alternativas incompletas");

        return {
          textPt: q.textPt ?? "",
          optA: q.optA ?? "",
          optB: q.optB ?? "",
          optC: q.optC ?? "",
          optD: q.optD ?? "",
          optE: q.optE ?? "",
          correctOption: (q.correctOption ?? "A").toUpperCase(),
          difficulty: VALID_DIFFICULTIES.includes(q.difficulty) ? q.difficulty : "medium",
          questionType: VALID_TYPES.includes(q.questionType) ? q.questionType : "multiple_choice",
          disciplineSuggestion: q.disciplineSuggestion ?? "",
          year: q.year ? Number(q.year) : undefined,
          author: q.author ?? "",
          explanationPt: q.explanationPt ?? "",
          assertion1: q.assertion1 ?? "",
          assertion2: q.assertion2 ?? "",
          _rowIndex: i + 1,
          _errors: errors,
          _valid: errors.length === 0,
          _aiExtracted: true,
        };
      });

      return {
        questions: normalized,
        totalExtracted: normalized.length,
        validCount: normalized.filter((q: any) => q._valid).length,
        rawTextLength: rawText.length,
      };
    }),
});
