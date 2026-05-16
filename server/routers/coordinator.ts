import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, teacherPermissions, activityLog, disciplines } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

// Middleware: must be coordinator, superuser, or admin
const coordinatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["coordinator", "superuser", "admin"];
  if (!allowed.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coordinator access required" });
  }
  return next({ ctx });
});

export const coordinatorRouter = router({
  // ── List all teachers ──────────────────────────────────────────────────────
  listTeachers: coordinatorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const teachers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .where(eq(users.role, "teacher"));
    return teachers;
  }),

  // ── List all users (for role management) ──────────────────────────────────
  listUsers: coordinatorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  }),

  // ── Promote user to teacher ────────────────────────────────────────────────
  promoteToTeacher: coordinatorProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      const elevated = ["coordinator", "superuser", "admin"];
      if (elevated.includes(target.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Não é possível alterar o papel de um coordenador ou superior." });
      }
      await db.update(users).set({ role: "teacher" }).where(eq(users.id, input.userId));
      await db.insert(activityLog).values({
        userId: ctx.user.id,
        action: "promote_to_teacher",
        entityType: "user",
        entityId: input.userId,
      });
      return { success: true };
    }),

  // ── Demote teacher to user ─────────────────────────────────────────────────
  demoteToUser: coordinatorProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      const elevated = ["coordinator", "superuser", "admin"];
      if (elevated.includes(target.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Não é possível rebaixar um coordenador ou superior." });
      }
      await db.update(users).set({ role: "user" }).where(eq(users.id, input.userId));
      await db.insert(activityLog).values({
        userId: ctx.user.id,
        action: "demote_to_user",
        entityType: "user",
        entityId: input.userId,
      });
      return { success: true };
    }),

  // ── Get teacher permissions ────────────────────────────────────────────────
  getTeacherPermissions: coordinatorProcedure
    .input(z.object({ teacherId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const perms = await db
        .select({
          id: teacherPermissions.id,
          disciplineId: teacherPermissions.disciplineId,
          canCreateQuestions: teacherPermissions.canCreateQuestions,
          canValidateQuestions: teacherPermissions.canValidateQuestions,
          canCreateExams: teacherPermissions.canCreateExams,
          disciplineName: disciplines.namePt,
        })
        .from(teacherPermissions)
        .leftJoin(disciplines, eq(teacherPermissions.disciplineId, disciplines.id))
        .where(eq(teacherPermissions.teacherId, input.teacherId));
      return perms;
    }),

  // ── Grant discipline permission to teacher ─────────────────────────────────
  grantPermission: coordinatorProcedure
    .input(z.object({
      teacherId: z.number(),
      disciplineId: z.number(),
      canCreateQuestions: z.boolean().default(true),
      canValidateQuestions: z.boolean().default(false),
      canCreateExams: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check if already exists
      const existing = await db
        .select()
        .from(teacherPermissions)
        .where(and(
          eq(teacherPermissions.teacherId, input.teacherId),
          eq(teacherPermissions.disciplineId, input.disciplineId)
        ))
        .limit(1);
      if (existing.length > 0) {
        await db.update(teacherPermissions)
          .set({
            canCreateQuestions: input.canCreateQuestions,
            canValidateQuestions: input.canValidateQuestions,
            canCreateExams: input.canCreateExams,
          })
          .where(eq(teacherPermissions.id, existing[0].id));
      } else {
        await db.insert(teacherPermissions).values({
          teacherId: input.teacherId,
          disciplineId: input.disciplineId,
          canCreateQuestions: input.canCreateQuestions,
          canValidateQuestions: input.canValidateQuestions,
          canCreateExams: input.canCreateExams,
          grantedBy: ctx.user.id,
        });
      }
      await db.insert(activityLog).values({
        userId: ctx.user.id,
        action: "grant_permission",
        entityType: "teacher_permission",
        entityId: input.teacherId,
        details: { disciplineId: input.disciplineId },
      });
      return { success: true };
    }),

  // ── Revoke discipline permission ───────────────────────────────────────────
  revokePermission: coordinatorProcedure
    .input(z.object({ permissionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(teacherPermissions).where(eq(teacherPermissions.id, input.permissionId));
      await db.insert(activityLog).values({
        userId: ctx.user.id,
        action: "revoke_permission",
        entityType: "teacher_permission",
        entityId: input.permissionId,
      });
      return { success: true };
    }),

  // ── Activity log ──────────────────────────────────────────────────────────
  getActivityLog: coordinatorProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().default(0),
      userId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const query = db
        .select({
          id: activityLog.id,
          action: activityLog.action,
          entityType: activityLog.entityType,
          entityId: activityLog.entityId,
          details: activityLog.details,
          createdAt: activityLog.createdAt,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
        })
        .from(activityLog)
        .leftJoin(users, eq(activityLog.userId, users.id))
        .orderBy(desc(activityLog.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return query;
    }),

  // ── Platform stats ─────────────────────────────────────────────────────────
  getPlatformStats: coordinatorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [userStats] = await db.execute(`
      SELECT
        COUNT(*) as totalUsers,
        SUM(CASE WHEN role='teacher' THEN 1 ELSE 0 END) as teachers,
        SUM(CASE WHEN role='coordinator' THEN 1 ELSE 0 END) as coordinators,
        SUM(CASE WHEN plan='premium' THEN 1 ELSE 0 END) as premiumUsers,
        SUM(CASE WHEN plan='trial' THEN 1 ELSE 0 END) as trialUsers,
        SUM(CASE WHEN DATE(createdAt) = CURDATE() THEN 1 ELSE 0 END) as newToday
      FROM users
    `) as any;
    const [examStats] = await db.execute(`
      SELECT COUNT(*) as totalExams,
        SUM(CASE WHEN DATE(createdAt) = CURDATE() THEN 1 ELSE 0 END) as examsToday
      FROM exams WHERE status='completed'
    `) as any;
    const [qStats] = await db.execute(`
      SELECT COUNT(*) as totalQuestions,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pendingValidation
      FROM questions WHERE active=1
    `) as any;
    return {
      users: userStats[0],
      exams: examStats[0],
      questions: qStats[0],
    };
  }),
});
