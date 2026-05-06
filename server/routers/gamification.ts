import { z } from "zod";
import {
  LEVELS,
  getAllBadges,
  getLevelForXp,
  getNextLevel,
  getUserBadgeIds,
  getUserById,
  updateLoginStreak,
} from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const gamificationRouter = router({
  levels: publicProcedure.query(() => LEVELS),

  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) return null;

    const currentLevel = getLevelForXp(user.xp);
    const nextLevel = getNextLevel(currentLevel.level);
    const allBadges = await getAllBadges();
    const earnedBadgeIds = await getUserBadgeIds(user.id);

    const xpInCurrentLevel = user.xp - currentLevel.xpRequired;
    const xpForNextLevel = nextLevel ? nextLevel.xpRequired - currentLevel.xpRequired : 0;
    const progressPercent = nextLevel && xpForNextLevel > 0 ? Math.min(100, (xpInCurrentLevel / xpForNextLevel) * 100) : 100;

    const accuracy = user.totalQuestions > 0 ? (user.totalCorrect / user.totalQuestions) * 100 : 0;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
        totalExams: user.totalExams,
        totalQuestions: user.totalQuestions,
        totalCorrect: user.totalCorrect,
        accuracy: Math.round(accuracy * 10) / 10,
      },
      currentLevel,
      nextLevel,
      progressPercent: Math.round(progressPercent),
      xpInCurrentLevel,
      xpForNextLevel,
      badges: allBadges.map((b) => ({ ...b, earned: earnedBadgeIds.includes(b.id) })),
    };
  }),

  badges: publicProcedure.query(() => getAllBadges()),

  dailyLogin: protectedProcedure.mutation(async ({ ctx }) => {
    return updateLoginStreak(ctx.user.id);
  }),
});
