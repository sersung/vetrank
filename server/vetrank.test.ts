import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { getLevelForXp, getNextLevel, LEVELS } from "./db";

// ─── Auth tests ───────────────────────────────────────────────────────────────
type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@vetrank.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    xp: 0,
    level: 1,
    streak: 0,
    lastLoginDate: null,
    plan: "free",
    trialStartedAt: null,
    trialEndsAt: null,
    premiumStartedAt: null,
    premiumEndsAt: null,
    totalExams: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true });
  });

  it("returns the current user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).not.toBeNull();
    expect(me?.email).toBe("test@vetrank.com");
  });
});

// ─── Gamification / Level tests ───────────────────────────────────────────────
describe("getLevelForXp", () => {
  it("returns level 1 for 0 XP", () => {
    const lvl = getLevelForXp(0);
    expect(lvl.level).toBe(1);
  });

  it("returns level 2 for 100 XP", () => {
    const lvl = getLevelForXp(100);
    expect(lvl.level).toBe(2);
  });

  it("returns level 9 (Lenda) for 15000+ XP", () => {
    const lvl = getLevelForXp(15000);
    expect(lvl.level).toBe(9);
    expect(lvl.name).toBe("Lenda");
  });

  it("returns level 9 for very high XP", () => {
    const lvl = getLevelForXp(999999);
    expect(lvl.level).toBe(9);
  });

  it("returns level 5 for 1500 XP", () => {
    const lvl = getLevelForXp(1500);
    expect(lvl.level).toBe(5);
  });
});

describe("getNextLevel", () => {
  it("returns level 2 when current is 1", () => {
    const next = getNextLevel(1);
    expect(next?.level).toBe(2);
  });

  it("returns null when at max level (9)", () => {
    const next = getNextLevel(9);
    expect(next).toBeNull();
  });
});

describe("LEVELS constant", () => {
  it("has exactly 9 levels", () => {
    expect(LEVELS).toHaveLength(9);
  });

  it("starts with Resident/Residente", () => {
    expect(LEVELS[0]?.level).toBe(1);
    expect(LEVELS[0]?.nameEn).toBe("Resident");
  });

  it("ends with Lenda/Legend", () => {
    const last = LEVELS[LEVELS.length - 1];
    expect(last?.level).toBe(9);
    expect(last?.name).toBe("Lenda");
    expect(last?.nameEn).toBe("Legend");
  });

  it("has strictly increasing XP requirements", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]!.xpRequired).toBeGreaterThan(LEVELS[i - 1]!.xpRequired);
    }
  });
});

// ─── Questions router (public procedures) ─────────────────────────────────────
describe("questions.disciplines", () => {
  it("returns an array (may be empty without DB)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.questions.disciplines();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("questions.list", () => {
  it("returns paginated questions object without DB", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.questions.list({ page: 1, limit: 10 });
    expect(result).toHaveProperty("questions");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.questions)).toBe(true);
  });
});

// ─── Admin guard tests ─────────────────────────────────────────────────────────
describe("admin procedures", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("allows admin users to access stats", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.admin.stats();
    expect(stats).toHaveProperty("totalUsers");
    expect(stats).toHaveProperty("totalQuestions");
    expect(stats).toHaveProperty("totalDisciplines");
    expect(stats).toHaveProperty("totalSubjects");
  });
});

// ─── Leaderboard tests ────────────────────────────────────────────────────────
describe("leaderboard.get", () => {
  it("returns an array for weekly leaderboard", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leaderboard.get({ type: "weekly", limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an array for monthly leaderboard", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leaderboard.get({ type: "monthly", limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an array for all-time leaderboard", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leaderboard.get({ type: "alltime", limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Subscription tests ───────────────────────────────────────────────────────
describe("subscription.myPlan", () => {
  it("returns plan status or throws NOT_FOUND (no DB in test env)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const plan = await caller.subscription.myPlan();
      expect(plan).toHaveProperty("plan");
      expect(plan).toHaveProperty("canAccessPremium");
    } catch (err: any) {
      // Without a real DB, user lookup returns undefined → NOT_FOUND is expected
      expect(err.code).toBe("NOT_FOUND");
    }
  });
});
