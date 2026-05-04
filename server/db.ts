import { and, asc, desc, eq, gte, inArray, isNotNull, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Badge,
  Discipline,
  DiscursiveQuestion,
  Exam,
  InsertDiscursiveQuestion,
  InsertQuestion,
  InsertUser,
  Question,
  Subject,
  User,
  badges,
  discursiveQuestions,
  disciplines,
  examAnswers,
  exams,
  monthlyXp,
  questions,
  subjects,
  userBadges,
  users,
  weeklyXp,
  xpEvents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ─────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }

  if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUser(id: number, data: Partial<User>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

// ─── Streak & Login ───────────────────────────────────────────────────────────
export async function updateLoginStreak(userId: number): Promise<{ streak: number; xpBonus: number }> {
  const db = await getDb();
  if (!db) return { streak: 0, xpBonus: 0 };

  const user = await getUserById(userId);
  if (!user) return { streak: 0, xpBonus: 0 };

  const today = new Date().toISOString().split("T")[0]!;
  if (user.lastLoginDate === today) return { streak: user.streak, xpBonus: 0 };

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]!;
  const newStreak = user.lastLoginDate === yesterday ? user.streak + 1 : 1;
  const xpBonus = newStreak >= 7 ? 50 : newStreak >= 3 ? 20 : 10;

  await db.update(users).set({ streak: newStreak, lastLoginDate: today }).where(eq(users.id, userId));
  await addXp(userId, xpBonus, `Daily login streak (day ${newStreak})`);

  return { streak: newStreak, xpBonus };
}

// ─── XP & Levels ─────────────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1, name: "Resident", nameEn: "Resident", xpRequired: 0 },
  { level: 2, name: "Estagiário", nameEn: "Intern", xpRequired: 100 },
  { level: 3, name: "Clínico Geral", nameEn: "General Practitioner", xpRequired: 300 },
  { level: 4, name: "Especialista", nameEn: "Specialist", xpRequired: 700 },
  { level: 5, name: "Consultor", nameEn: "Consultant", xpRequired: 1500 },
  { level: 6, name: "Pesquisador", nameEn: "Researcher", xpRequired: 3000 },
  { level: 7, name: "Professor", nameEn: "Professor", xpRequired: 5500 },
  { level: 8, name: "Mestre", nameEn: "Master", xpRequired: 9000 },
  { level: 9, name: "Lenda", nameEn: "Legend", xpRequired: 15000 },
];

export function getLevelForXp(xp: number) {
  let current = LEVELS[0]!;
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  return current;
}

export function getNextLevel(currentLevel: number) {
  return LEVELS.find((l) => l.level === currentLevel + 1) ?? null;
}

export async function addXp(
  userId: number,
  amount: number,
  reason: string,
  examId?: number
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  const db = await getDb();
  if (!db) return { newXp: 0, newLevel: 1, leveledUp: false };

  const user = await getUserById(userId);
  if (!user) return { newXp: 0, newLevel: 1, leveledUp: false };

  const newXp = user.xp + amount;
  const oldLevel = user.level;
  const newLevelObj = getLevelForXp(newXp);
  const newLevel = newLevelObj.level;

  await db.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, userId));
  await db.insert(xpEvents).values({ userId, amount, reason, examId: examId ?? null });

  // Update weekly/monthly XP
  const now = new Date();
  const weekKey = getWeekKey(now);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await db
    .insert(weeklyXp)
    .values({ userId, weekKey, xp: amount })
    .onDuplicateKeyUpdate({ set: { xp: sql`${weeklyXp.xp} + ${amount}` } });

  await db
    .insert(monthlyXp)
    .values({ userId, monthKey, xp: amount })
    .onDuplicateKeyUpdate({ set: { xp: sql`${monthlyXp.xp} + ${amount}` } });

  return { newXp, newLevel, leveledUp: newLevel > oldLevel };
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

// ─── Badges ───────────────────────────────────────────────────────────────────
export async function getAllBadges(): Promise<Badge[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(badges).orderBy(asc(badges.id));
}

export async function getUserBadgeIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, userId));
  return rows.map((r) => r.badgeId);
}

export async function awardBadge(userId: number, badgeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await db
    .select()
    .from(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
    .limit(1);
  if (existing.length > 0) return false;
  await db.insert(userBadges).values({ userId, badgeId });
  return true;
}

export async function checkAndAwardBadges(userId: number): Promise<Badge[]> {
  const db = await getDb();
  if (!db) return [];

  const user = await getUserById(userId);
  if (!user) return [];

  const allBadges = await getAllBadges();
  const earnedIds = await getUserBadgeIds(userId);
  const newBadges: Badge[] = [];

  const examCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(exams)
    .where(and(eq(exams.userId, userId), eq(exams.status, "completed")));
  const totalExams = Number(examCount[0]?.count ?? 0);

  for (const badge of allBadges) {
    if (earnedIds.includes(badge.id)) continue;
    const cond = badge.condition as { type: string; value: number } | null;
    if (!cond) continue;

    let earned = false;
    if (cond.type === "xp" && user.xp >= cond.value) earned = true;
    if (cond.type === "level" && user.level >= cond.value) earned = true;
    if (cond.type === "streak" && user.streak >= cond.value) earned = true;
    if (cond.type === "exams" && totalExams >= cond.value) earned = true;
    if (cond.type === "accuracy" && user.totalQuestions > 0) {
      const acc = (user.totalCorrect / user.totalQuestions) * 100;
      if (acc >= cond.value) earned = true;
    }

    if (earned) {
      await awardBadge(userId, badge.id);
      newBadges.push(badge);
    }
  }

  return newBadges;
}

// ─── Disciplines & Subjects ───────────────────────────────────────────────────
export async function getDisciplines(): Promise<Discipline[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(disciplines).where(eq(disciplines.active, true)).orderBy(asc(disciplines.namePt));
}

export async function getAllDisciplines(): Promise<Discipline[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(disciplines).orderBy(asc(disciplines.namePt));
}

export async function getSubjectsByDiscipline(disciplineId: number): Promise<Subject[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(subjects)
    .where(and(eq(subjects.disciplineId, disciplineId), eq(subjects.active, true)))
    .orderBy(asc(subjects.namePt));
}

export async function getAllSubjects(): Promise<Subject[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subjects).orderBy(asc(subjects.namePt));
}

// ─── Questions ────────────────────────────────────────────────────────────────
export async function getQuestions(filters: {
  disciplineId?: number;
  subjectId?: number;
  difficulty?: string;
  year?: number;
  search?: string;
  isPremium?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ questions: Question[]; total: number }> {
  const db = await getDb();
  if (!db) return { questions: [], total: 0 };

  const conditions = [eq(questions.active, true)];
  if (filters.disciplineId) conditions.push(eq(questions.disciplineId, filters.disciplineId));
  if (filters.subjectId) conditions.push(eq(questions.subjectId, filters.subjectId));
  if (filters.difficulty) conditions.push(eq(questions.difficulty, filters.difficulty as "easy" | "medium" | "hard"));
  if (filters.year) conditions.push(eq(questions.year, filters.year));
  if (filters.isPremium !== undefined) conditions.push(eq(questions.isPremium, filters.isPremium));
  if (filters.search) conditions.push(like(questions.textPt, `%${filters.search}%`));

  const where = and(...conditions);
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const [rows, countRows] = await Promise.all([
    db.select().from(questions).where(where).orderBy(desc(questions.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(questions).where(where),
  ]);

  return { questions: rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function getQuestionById(id: number): Promise<Question | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return result[0];
}

export async function getRandomQuestions(filters: {
  disciplineId?: number;
  disciplineIds?: number[];
  subjectId?: number;
  author?: string;
  year?: number;
  difficulty?: string;
  count: number;
  excludeIds?: number[];
}): Promise<Question[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(questions.active, true)];

  // Single discipline (legacy) or multi-discipline
  if (filters.disciplineIds && filters.disciplineIds.length > 0) {
    conditions.push(inArray(questions.disciplineId, filters.disciplineIds));
  } else if (filters.disciplineId) {
    conditions.push(eq(questions.disciplineId, filters.disciplineId));
  }

  if (filters.subjectId) conditions.push(eq(questions.subjectId, filters.subjectId));
  if (filters.author) conditions.push(eq(questions.author, filters.author));
  if (filters.year) conditions.push(eq(questions.year, filters.year));
  if (filters.difficulty && filters.difficulty !== "mixed")
    conditions.push(eq(questions.difficulty, filters.difficulty as "easy" | "medium" | "hard"));

  const rows = await db
    .select()
    .from(questions)
    .where(and(...conditions))
    .orderBy(sql`RAND()`)
    .limit(filters.count);

  return rows;
}

export async function getDistinctAuthors(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({ author: questions.author })
    .from(questions)
    .where(and(eq(questions.active, true), isNotNull(questions.author)))
    .orderBy(questions.author);
  return rows.map((r) => r.author!).filter(Boolean);
}

export async function getDistinctYears(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({ year: questions.year })
    .from(questions)
    .where(and(eq(questions.active, true), isNotNull(questions.year)))
    .orderBy(desc(questions.year));
  return rows.map((r) => r.year!).filter(Boolean);
}

export async function createQuestion(data: InsertQuestion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(questions).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateQuestion(id: number, data: Partial<InsertQuestion>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(questions).set(data).where(eq(questions.id, id));
}

export async function deleteQuestion(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(questions).set({ active: false }).where(eq(questions.id, id));
}

// ─── Exams ────────────────────────────────────────────────────────────────────
export async function createExam(data: {
  userId: number;
  disciplineId?: number;
  difficulty?: string;
  questionCount: number;
  timeLimitSeconds?: number;
  questionIds: number[];
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(exams).values({
    userId: data.userId,
    disciplineId: data.disciplineId ?? null,
    difficulty: (data.difficulty as "easy" | "medium" | "hard" | "mixed") ?? "mixed",
    questionCount: data.questionCount,
    timeLimitSeconds: data.timeLimitSeconds ?? null,
    totalQuestions: data.questionIds.length,
    questionIds: data.questionIds,
    status: "in_progress",
  });
  return (result[0] as { insertId: number }).insertId;
}

export async function getExamById(id: number): Promise<Exam | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
  return result[0];
}

export async function submitExamAnswer(data: {
  examId: number;
  questionId: number;
  selectedOption: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(examAnswers)
    .values({
      examId: data.examId,
      questionId: data.questionId,
      selectedOption: data.selectedOption,
      isCorrect: data.isCorrect,
      timeSpentSeconds: data.timeSpentSeconds ?? null,
    })
    .onDuplicateKeyUpdate({
      set: {
        selectedOption: data.selectedOption,
        isCorrect: data.isCorrect,
        timeSpentSeconds: data.timeSpentSeconds ?? null,
      },
    });
}

export async function completeExam(
  examId: number,
  userId: number,
  timeSpentSeconds: number
): Promise<{ xpEarned: number; accuracy: number; correctAnswers: number; newBadges: Badge[] }> {
  const db = await getDb();
  if (!db) return { xpEarned: 0, accuracy: 0, correctAnswers: 0, newBadges: [] };

  const exam = await getExamById(examId);
  if (!exam) throw new Error("Exam not found");

  const answers = await db.select().from(examAnswers).where(eq(examAnswers.examId, examId));
  const correctAnswers = answers.filter((a) => a.isCorrect).length;
  const accuracy = exam.totalQuestions > 0 ? (correctAnswers / exam.totalQuestions) * 100 : 0;

  // XP calculation
  const baseXp = correctAnswers * 10;
  const difficultyBonus = exam.difficulty === "hard" ? 1.5 : exam.difficulty === "medium" ? 1.2 : 1.0;
  const xpEarned = Math.round(baseXp * difficultyBonus);

  await db.update(exams).set({
    status: "completed",
    correctAnswers,
    accuracy,
    xpEarned,
    timeSpentSeconds,
    completedAt: new Date(),
  }).where(eq(exams.id, examId));

  // Update user stats
  await db.update(users).set({
    totalExams: sql`${users.totalExams} + 1`,
    totalQuestions: sql`${users.totalQuestions} + ${exam.totalQuestions}`,
    totalCorrect: sql`${users.totalCorrect} + ${correctAnswers}`,
  }).where(eq(users.id, userId));

  // Award XP
  await addXp(userId, xpEarned, `Exam completed (${correctAnswers}/${exam.totalQuestions} correct)`, examId);

  // Check badges
  const newBadges = await checkAndAwardBadges(userId);

  return { xpEarned, accuracy, correctAnswers, newBadges };
}

export async function getUserExams(userId: number, limit = 10): Promise<Exam[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(exams)
    .where(and(eq(exams.userId, userId), eq(exams.status, "completed")))
    .orderBy(desc(exams.completedAt))
    .limit(limit);
}

export async function getExamAnswers(examId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(examAnswers).where(eq(examAnswers.examId, examId));
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export async function getLeaderboard(
  type: "weekly" | "monthly" | "alltime",
  limit = 50
): Promise<Array<{ userId: number; name: string | null; xp: number; level: number; rank: number }>> {
  const db = await getDb();
  if (!db) return [];

  if (type === "alltime") {
    const rows = await db
      .select({ userId: users.id, name: users.name, xp: users.xp, level: users.level })
      .from(users)
      .orderBy(desc(users.xp))
      .limit(limit);
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  if (type === "weekly") {
    const weekKey = getWeekKey(new Date());
    const rows = await db
      .select({ userId: weeklyXp.userId, name: users.name, xp: weeklyXp.xp, level: users.level })
      .from(weeklyXp)
      .innerJoin(users, eq(weeklyXp.userId, users.id))
      .where(eq(weeklyXp.weekKey, weekKey))
      .orderBy(desc(weeklyXp.xp))
      .limit(limit);
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  // Monthly
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rows = await db
    .select({ userId: monthlyXp.userId, name: users.name, xp: monthlyXp.xp, level: users.level })
    .from(monthlyXp)
    .innerJoin(users, eq(monthlyXp.userId, users.id))
    .where(eq(monthlyXp.monthKey, monthKey))
    .orderBy(desc(monthlyXp.xp))
    .limit(limit);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ─── Admin helpers ────────────────────────────────────────────────────────────
export async function createDiscipline(data: { slug: string; namePt: string; nameEn: string; icon?: string; color?: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(disciplines).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateDiscipline(id: number, data: Partial<Discipline>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(disciplines).set(data).where(eq(disciplines.id, id));
}

export async function createSubject(data: { disciplineId: number; slug: string; namePt: string; nameEn: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(subjects).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateSubject(id: number, data: Partial<Subject>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(subjects).set(data).where(eq(subjects.id, id));
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalQuestions: 0, totalExams: 0, premiumUsers: 0, totalDisciplines: 0, totalSubjects: 0 };

  const [userCount, questionCount, examCount, premiumCount, disciplineCount, subjectCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(questions).where(eq(questions.active, true)),
    db.select({ count: sql<number>`count(*)` }).from(exams).where(eq(exams.status, "completed")),
    db.select({ count: sql<number>`count(*)` }).from(users).where(or(eq(users.plan, "premium"), eq(users.plan, "trial"))),
    db.select({ count: sql<number>`count(*)` }).from(disciplines),
    db.select({ count: sql<number>`count(*)` }).from(subjects),
  ]);

  return {
    totalUsers: Number(userCount[0]?.count ?? 0),
    totalQuestions: Number(questionCount[0]?.count ?? 0),
    totalExams: Number(examCount[0]?.count ?? 0),
    premiumUsers: Number(premiumCount[0]?.count ?? 0),
    totalDisciplines: Number(disciplineCount[0]?.count ?? 0),
    totalSubjects: Number(subjectCount[0]?.count ?? 0),
  };
}

// ─── Subscription ─────────────────────────────────────────────────────────────
export async function activateTrial(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await db.update(users).set({ plan: "trial", trialStartedAt: now, trialEndsAt: trialEnd }).where(eq(users.id, userId));
}

export async function checkAndExpireTrials(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.update(users).set({ plan: "free" }).where(and(eq(users.plan, "trial"), lte(users.trialEndsAt, now)));
}

export async function getUserPlanStatus(user: User): Promise<{
  plan: string;
  isActive: boolean;
  trialDaysLeft?: number;
  canAccessPremium: boolean;
}> {
  if (user.plan === "premium") {
    const isActive = !user.premiumEndsAt || user.premiumEndsAt > new Date();
    return { plan: "premium", isActive, canAccessPremium: isActive };
  }
  if (user.plan === "trial") {
    const now = new Date();
    const trialActive = user.trialEndsAt ? user.trialEndsAt > now : false;
    const trialDaysLeft = user.trialEndsAt
      ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / 86400000))
      : 0;
    if (!trialActive) {
      await updateUser(user.id, { plan: "free" });
      return { plan: "free", isActive: false, canAccessPremium: false };
    }
    return { plan: "trial", isActive: true, trialDaysLeft, canAccessPremium: true };
  }
  return { plan: "free", isActive: true, canAccessPremium: false };
}

// ─── Discursive Questions ───────────────────────────────────────────────────────────────
export async function getDiscursiveQuestions(filters: {
  disciplineId?: number;
  subjectId?: number;
  difficulty?: string;
  search?: string;
  isPremium?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ questions: DiscursiveQuestion[]; total: number }> {
  const db = await getDb();
  if (!db) return { questions: [], total: 0 };

  const conditions = [eq(discursiveQuestions.active, true)];
  if (filters.disciplineId) conditions.push(eq(discursiveQuestions.disciplineId, filters.disciplineId));
  if (filters.subjectId) conditions.push(eq(discursiveQuestions.subjectId, filters.subjectId));
  if (filters.difficulty) conditions.push(eq(discursiveQuestions.difficulty, filters.difficulty as "easy" | "medium" | "hard"));
  if (filters.isPremium !== undefined) conditions.push(eq(discursiveQuestions.isPremium, filters.isPremium));
  if (filters.search) conditions.push(like(discursiveQuestions.textPt, `%${filters.search}%`));

  const where = and(...conditions);
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const [rows, countRows] = await Promise.all([
    db.select().from(discursiveQuestions).where(where).orderBy(desc(discursiveQuestions.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(discursiveQuestions).where(where),
  ]);

  return { questions: rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function getDiscursiveQuestionById(id: number): Promise<DiscursiveQuestion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(discursiveQuestions).where(eq(discursiveQuestions.id, id)).limit(1);
  return result[0];
}

export async function createDiscursiveQuestion(data: InsertDiscursiveQuestion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(discursiveQuestions).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateDiscursiveQuestion(id: number, data: Partial<InsertDiscursiveQuestion>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(discursiveQuestions).set(data).where(eq(discursiveQuestions.id, id));
}

export async function deleteDiscursiveQuestion(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(discursiveQuestions).set({ active: false }).where(eq(discursiveQuestions.id, id));
}

// ─── Seed badges ────────────────────────────────────────────────────────────────
export async function seedBadges(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select({ count: sql<number>`count(*)` }).from(badges);
  if (Number(existing[0]?.count ?? 0) > 0) return;

  const badgeData = [
    { slug: "first-exam", namePt: "Primeiro Passo", nameEn: "First Step", descriptionPt: "Complete seu primeiro simulado", descriptionEn: "Complete your first exam", icon: "🎯", color: "#4ade80", condition: { type: "exams", value: 1 } },
    { slug: "streak-3", namePt: "Dedicado", nameEn: "Dedicated", descriptionPt: "3 dias consecutivos de estudo", descriptionEn: "3 consecutive study days", icon: "🔥", color: "#f97316", condition: { type: "streak", value: 3 } },
    { slug: "streak-7", namePt: "Imparável", nameEn: "Unstoppable", descriptionPt: "7 dias consecutivos de estudo", descriptionEn: "7 consecutive study days", icon: "⚡", color: "#eab308", condition: { type: "streak", value: 7 } },
    { slug: "streak-30", namePt: "Lendário", nameEn: "Legendary", descriptionPt: "30 dias consecutivos de estudo", descriptionEn: "30 consecutive study days", icon: "👑", color: "#a855f7", condition: { type: "streak", value: 30 } },
    { slug: "xp-500", namePt: "Estudante Dedicado", nameEn: "Dedicated Student", descriptionPt: "Acumule 500 XP", descriptionEn: "Accumulate 500 XP", icon: "⭐", color: "#06b6d4", condition: { type: "xp", value: 500 } },
    { slug: "xp-2000", namePt: "Veterano", nameEn: "Veteran", descriptionPt: "Acumule 2000 XP", descriptionEn: "Accumulate 2000 XP", icon: "🏅", color: "#3b82f6", condition: { type: "xp", value: 2000 } },
    { slug: "level-5", namePt: "Meio do Caminho", nameEn: "Halfway There", descriptionPt: "Alcance o nível 5", descriptionEn: "Reach level 5", icon: "🚀", color: "#8b5cf6", condition: { type: "level", value: 5 } },
    { slug: "level-9", namePt: "A Lenda", nameEn: "The Legend", descriptionPt: "Alcance o nível máximo", descriptionEn: "Reach the maximum level", icon: "🌟", color: "#f59e0b", condition: { type: "level", value: 9 } },
    { slug: "accuracy-80", namePt: "Precisão Cirúrgica", nameEn: "Surgical Precision", descriptionPt: "Mantenha 80% de acerto", descriptionEn: "Maintain 80% accuracy", icon: "🎖️", color: "#10b981", condition: { type: "accuracy", value: 80 } },
    { slug: "exams-10", namePt: "Maratonista", nameEn: "Marathon Runner", descriptionPt: "Complete 10 simulados", descriptionEn: "Complete 10 exams", icon: "🏃", color: "#ef4444", condition: { type: "exams", value: 10 } },
  ];

  for (const badge of badgeData) {
    await db.insert(badges).values(badge).onDuplicateKeyUpdate({ set: { namePt: badge.namePt } });
  }
}

// ─── Seed disciplines ─────────────────────────────────────────────────────────
export async function seedDisciplines(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select({ count: sql<number>`count(*)` }).from(disciplines);
  if (Number(existing[0]?.count ?? 0) > 0) return;

  const disciplineData = [
    { slug: "pharmacology", namePt: "Farmacologia", nameEn: "Pharmacology", icon: "💊", color: "#4ade80" },
    { slug: "clinics", namePt: "Clínica", nameEn: "Clinics", icon: "🩺", color: "#06b6d4" },
    { slug: "herpetology", namePt: "Herpetologia", nameEn: "Herpetology", icon: "🦎", color: "#84cc16" },
    { slug: "ornithology", namePt: "Ornitologia", nameEn: "Ornithology", icon: "🦜", color: "#f59e0b" },
    { slug: "anesthesiology", namePt: "Anestesiologia", nameEn: "Anesthesiology", icon: "💉", color: "#8b5cf6" },
    { slug: "small-mammals", namePt: "Pequenos Mamíferos", nameEn: "Small Mammals", icon: "🐹", color: "#f97316" },
  ];

  for (const d of disciplineData) {
    await db.insert(disciplines).values(d).onDuplicateKeyUpdate({ set: { namePt: d.namePt } });
  }
}
