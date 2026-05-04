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
    }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user.role, ["teacher", "coordinator", "superuser", "admin"]);
      const db = await requireDb();

      // Verify ownership
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
        .set({ status: input.status, notes: input.notes })
        .where(eq(questionAssignments.id, input.assignmentId));

      // Also update the question's isValidated flag
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
});
