import { TRPCError } from "@trpc/server";
import { activateTrial, getUserById, getUserPlanStatus } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const subscriptionRouter = router({
  myPlan: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return getUserPlanStatus(user);
  }),

  startTrial: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });

    if (user.plan !== "free") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Trial already used or you have an active plan" });
    }

    if (user.trialStartedAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Trial already used" });
    }

    await activateTrial(ctx.user.id);
    return { success: true, message: "7-day premium trial activated!" };
  }),
});
