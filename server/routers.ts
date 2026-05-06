import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { questionsRouter, discursiveRouter } from "./routers/questions";
import { examsRouter } from "./routers/exams";
import { gamificationRouter } from "./routers/gamification";
import { leaderboardRouter } from "./routers/leaderboard";
import { subscriptionRouter } from "./routers/subscription";
import { adminRouter } from "./routers/admin";
import { aiRouter } from "./routers/ai";
import { coordinatorRouter } from "./routers/coordinator";
import { teacherRouter } from "./routers/teacher";
import { announcementsRouter } from "./routers/announcements";
import { reportsRouter } from "./routers/reports";
import { lgpdRouter, practiceRouter } from "./routers/lgpd";
import { paymentRouter } from "./routers/payment";
import { notificationsRouter } from "./routers/notifications";
import { trailsRouter } from "./routers/trails";
import { referralsRouter } from "./routers/referrals";
import { validationRouter } from "./routers/validation";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    // Session is managed client-side by Supabase; this is a no-op kept for API compatibility
    logout: publicProcedure.mutation(() => {
      return { success: true } as const;
    }),
  }),
  questions: questionsRouter,
  discursive: discursiveRouter,
  exams: examsRouter,
  gamification: gamificationRouter,
  leaderboard: leaderboardRouter,
  subscription: subscriptionRouter,
  admin: adminRouter,
  ai: aiRouter,
  coordinator: coordinatorRouter,
  teacher: teacherRouter,
  announcements: announcementsRouter,
  reports: reportsRouter,
  lgpd: lgpdRouter,
  practice: practiceRouter,
  payment: paymentRouter,
  notifications: notificationsRouter,
  trails: trailsRouter,
  referrals: referralsRouter,
  validation: validationRouter,
});

export type AppRouter = typeof appRouter;
