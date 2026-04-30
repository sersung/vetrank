import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Gamification
  xp: int("xp").default(0).notNull(),
  level: int("level").default(1).notNull(),
  streak: int("streak").default(0).notNull(),
  lastLoginDate: varchar("lastLoginDate", { length: 10 }), // YYYY-MM-DD
  // Subscription
  plan: mysqlEnum("plan", ["free", "trial", "premium"]).default("free").notNull(),
  trialStartedAt: timestamp("trialStartedAt"),
  trialEndsAt: timestamp("trialEndsAt"),
  premiumStartedAt: timestamp("premiumStartedAt"),
  premiumEndsAt: timestamp("premiumEndsAt"),
  // Stats
  totalExams: int("totalExams").default(0).notNull(),
  totalQuestions: int("totalQuestions").default(0).notNull(),
  totalCorrect: int("totalCorrect").default(0).notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Disciplines ──────────────────────────────────────────────────────────────
export const disciplines = mysqlTable("disciplines", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  namePt: varchar("namePt", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }).notNull(),
  icon: varchar("icon", { length: 64 }),
  color: varchar("color", { length: 32 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Discipline = typeof disciplines.$inferSelect;

// ─── Subjects ─────────────────────────────────────────────────────────────────
export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  disciplineId: int("disciplineId").notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  namePt: varchar("namePt", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Subject = typeof subjects.$inferSelect;

// ─── Questions ────────────────────────────────────────────────────────────────
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  disciplineId: int("disciplineId").notNull(),
  subjectId: int("subjectId"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  year: int("year"),
  // Content (bilingual)
  textPt: text("textPt").notNull(),
  textEn: text("textEn"),
  // Options stored as JSON array [{id, textPt, textEn}]
  options: json("options").notNull(),
  correctOption: varchar("correctOption", { length: 4 }).notNull(),
  explanationPt: text("explanationPt"),
  explanationEn: text("explanationEn"),
  // Meta
  active: boolean("active").default(true).notNull(),
  isPremium: boolean("isPremium").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

// ─── Exams (sessions) ─────────────────────────────────────────────────────────
export const exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Config
  disciplineId: int("disciplineId"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard", "mixed"]),
  questionCount: int("questionCount").notNull(),
  timeLimitSeconds: int("timeLimitSeconds"),
  // Results
  score: int("score").default(0),
  totalQuestions: int("totalQuestions").notNull(),
  correctAnswers: int("correctAnswers").default(0),
  accuracy: float("accuracy").default(0),
  xpEarned: int("xpEarned").default(0),
  timeSpentSeconds: int("timeSpentSeconds"),
  status: mysqlEnum("status", ["in_progress", "completed", "abandoned"]).default("in_progress").notNull(),
  // Question IDs stored as JSON
  questionIds: json("questionIds").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;

// ─── Exam Answers ─────────────────────────────────────────────────────────────
export const examAnswers = mysqlTable("exam_answers", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  questionId: int("questionId").notNull(),
  selectedOption: varchar("selectedOption", { length: 4 }),
  isCorrect: boolean("isCorrect").default(false),
  timeSpentSeconds: int("timeSpentSeconds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamAnswer = typeof examAnswers.$inferSelect;

// ─── Badges ───────────────────────────────────────────────────────────────────
export const badges = mysqlTable("badges", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  namePt: varchar("namePt", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }).notNull(),
  descriptionPt: text("descriptionPt"),
  descriptionEn: text("descriptionEn"),
  icon: varchar("icon", { length: 64 }).notNull(),
  color: varchar("color", { length: 32 }),
  condition: json("condition"), // {type, value}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Badge = typeof badges.$inferSelect;

// ─── User Badges ──────────────────────────────────────────────────────────────
export const userBadges = mysqlTable("user_badges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  badgeId: int("badgeId").notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export type UserBadge = typeof userBadges.$inferSelect;

// ─── XP Events ────────────────────────────────────────────────────────────────
export const xpEvents = mysqlTable("xp_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  reason: varchar("reason", { length: 128 }).notNull(),
  examId: int("examId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type XpEvent = typeof xpEvents.$inferSelect;

// ─── Weekly XP Snapshots (for leaderboard) ────────────────────────────────────
export const weeklyXp = mysqlTable("weekly_xp", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekKey: varchar("weekKey", { length: 10 }).notNull(), // YYYY-WW
  xp: int("xp").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const monthlyXp = mysqlTable("monthly_xp", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  monthKey: varchar("monthKey", { length: 7 }).notNull(), // YYYY-MM
  xp: int("xp").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
