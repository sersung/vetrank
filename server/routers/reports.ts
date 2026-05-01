import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { questionReports, users, questions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["teacher", "coordinator", "superuser", "admin"];
  if (!allowed.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const reportsRouter = router({
  // ── Submit a question error report ────────────────────────────────────────
  submit: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      category: z.enum(["wrong_answer", "typo", "outdated", "unclear", "image_issue", "other"]),
      description: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(questionReports).values({
        questionId: input.questionId,
        reporterId: ctx.user.id,
        category: input.category,
        description: input.description,
      });
      return { success: true };
    }),

  // ── Staff: list pending reports ────────────────────────────────────────────
  listPending: staffProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(`
        SELECT r.id, r.questionId, r.category, r.description, r.status, r.createdAt,
          q.textPt as questionText,
          u.name as reporterName
        FROM question_reports r
        LEFT JOIN questions q ON r.questionId = q.id
        LEFT JOIN users u ON r.reporterId = u.id
        WHERE r.status = 'pending'
        ORDER BY r.createdAt DESC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `) as any;
      return rows[0] as any[];
    }),

  // ── Staff: review a report ─────────────────────────────────────────────────
  review: staffProcedure
    .input(z.object({
      reportId: z.number(),
      status: z.enum(["reviewed", "resolved", "dismissed"]),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(questionReports)
        .set({ status: input.status, reviewedBy: ctx.user.id, reviewNote: input.note })
        .where(eq(questionReports.id, input.reportId));
      return { success: true };
    }),

  // ── Staff: list all reports ────────────────────────────────────────────────
  listAll: staffProcedure
    .input(z.object({
      status: z.enum(["pending", "reviewed", "resolved", "dismissed", "all"]).default("all"),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const statusFilter = input.status !== "all" ? `AND r.status = '${input.status}'` : "";
      const rows = await db.execute(`
        SELECT r.id, r.questionId, r.category, r.description, r.status, r.reviewNote, r.createdAt,
          q.textPt as questionText,
          u.name as reporterName,
          rv.name as reviewerName
        FROM question_reports r
        LEFT JOIN questions q ON r.questionId = q.id
        LEFT JOIN users u ON r.reporterId = u.id
        LEFT JOIN users rv ON r.reviewedBy = rv.id
        WHERE 1=1 ${statusFilter}
        ORDER BY r.createdAt DESC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `) as any;
      return rows[0] as any[];
    }),
});
