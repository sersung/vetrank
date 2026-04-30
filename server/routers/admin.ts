import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createDiscipline,
  createSubject,
  getAdminStats,
  getAllDisciplines,
  getAllSubjects,
  seedBadges,
  seedDisciplines,
  updateDiscipline,
  updateSubject,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const adminRouter = router({
  stats: adminProcedure.query(() => getAdminStats()),

  seed: adminProcedure.mutation(async () => {
    await seedDisciplines();
    await seedBadges();
    return { success: true };
  }),

  disciplines: adminProcedure.query(() => getAllDisciplines()),

  createDiscipline: adminProcedure
    .input(
      z.object({
        slug: z.string().min(2),
        namePt: z.string().min(2),
        nameEn: z.string().min(2),
        icon: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createDiscipline(input);
      return { id };
    }),

  updateDiscipline: adminProcedure
    .input(
      z.object({
        id: z.number(),
        namePt: z.string().optional(),
        nameEn: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateDiscipline(id, data as any);
      return { success: true };
    }),

  subjects: adminProcedure.query(() => getAllSubjects()),

  createSubject: adminProcedure
    .input(
      z.object({
        disciplineId: z.number(),
        slug: z.string().min(2),
        namePt: z.string().min(2),
        nameEn: z.string().min(2),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createSubject(input);
      return { id };
    }),

  updateSubject: adminProcedure
    .input(
      z.object({
        id: z.number(),
        namePt: z.string().optional(),
        nameEn: z.string().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSubject(id, data as any);
      return { success: true };
    }),
});
