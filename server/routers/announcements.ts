import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { announcements, users } from "../../drizzle/schema";
import { eq, desc, and, lte, gt, or, isNull } from "drizzle-orm";

const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["teacher", "coordinator", "superuser", "admin"];
  if (!allowed.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const announcementsRouter = router({
  // ── Public: list active announcements ─────────────────────────────────────
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const now = new Date();
      return db
        .select({
          id: announcements.id,
          titlePt: announcements.titlePt,
          titleEn: announcements.titleEn,
          bodyPt: announcements.bodyPt,
          bodyEn: announcements.bodyEn,
          type: announcements.type,
          pinned: announcements.pinned,
          scheduledFor: announcements.scheduledFor,
          expiresAt: announcements.expiresAt,
          createdAt: announcements.createdAt,
          authorName: users.name,
        })
        .from(announcements)
        .leftJoin(users, eq(announcements.authorId, users.id))
        .where(and(
          eq(announcements.active, true),
          or(isNull(announcements.scheduledFor), lte(announcements.scheduledFor, now)),
          or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)),
        ))
        .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // ── Staff: create announcement ─────────────────────────────────────────────
  create: staffProcedure
    .input(z.object({
      titlePt: z.string().min(3).max(256),
      titleEn: z.string().max(256).optional(),
      bodyPt: z.string().min(10),
      bodyEn: z.string().optional(),
      type: z.enum(["info", "exam", "update", "warning"]).default("info"),
      pinned: z.boolean().default(false),
      scheduledFor: z.string().optional(), // ISO date string
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(announcements).values({
        authorId: ctx.user.id,
        titlePt: input.titlePt,
        titleEn: input.titleEn,
        bodyPt: input.bodyPt,
        bodyEn: input.bodyEn,
        type: input.type,
        pinned: input.pinned,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      });
      return { success: true };
    }),

  // ── Staff: update announcement ─────────────────────────────────────────────
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      titlePt: z.string().min(3).max(256).optional(),
      titleEn: z.string().max(256).optional(),
      bodyPt: z.string().min(10).optional(),
      bodyEn: z.string().optional(),
      type: z.enum(["info", "exam", "update", "warning"]).optional(),
      pinned: z.boolean().optional(),
      active: z.boolean().optional(),
      scheduledFor: z.string().nullable().optional(),
      expiresAt: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, scheduledFor, expiresAt, ...rest } = input;
      const updateData: Partial<typeof announcements.$inferInsert> = { ...rest };
      if (scheduledFor !== undefined) updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      await db.update(announcements).set(updateData).where(eq(announcements.id, id));
      return { success: true };
    }),

  // ── Staff: delete announcement ─────────────────────────────────────────────
  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(announcements).set({ active: false }).where(eq(announcements.id, input.id));
      return { success: true };
    }),

  // ── Staff: list all (including inactive) ──────────────────────────────────
  listAll: staffProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: announcements.id,
          titlePt: announcements.titlePt,
          bodyPt: announcements.bodyPt,
          type: announcements.type,
          pinned: announcements.pinned,
          active: announcements.active,
          scheduledFor: announcements.scheduledFor,
          expiresAt: announcements.expiresAt,
          createdAt: announcements.createdAt,
          authorName: users.name,
        })
        .from(announcements)
        .leftJoin(users, eq(announcements.authorId, users.id))
        .orderBy(desc(announcements.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),
});
