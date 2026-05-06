import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
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
import { plansRouter } from "./routers/plans";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
  plans: plansRouter,
});

export type AppRouter = typeof appRouter;
