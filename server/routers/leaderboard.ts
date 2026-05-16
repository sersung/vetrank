import { z } from "zod";
import { getLeaderboard } from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const leaderboardRouter = router({
  get: publicProcedure
    .input(
      z.object({
        type: z.enum(["weekly", "monthly", "alltime"]).default("weekly"),
        limit: z.number().min(1).max(200).default(50),
      })
    )
    .query(async ({ input }) => {
      return getLeaderboard(input.type, input.limit);
    }),
});
