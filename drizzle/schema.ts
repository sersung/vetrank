import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  real,
  serial,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "teacher", "coordinator", "superuser", "admin"]);
export const planEnum = pgEnum("plan", ["free", "trial", "premium"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const difficultyMixedEnum = pgEnum("difficulty_mixed", ["easy", "medium", "hard", "mixed"]);
export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "assertion_reason",
  "complex_multiple_choice",
  "matching",
  "true_false",
  "ordering",
  "cloze",
  "clinical_case",
  "image_analysis",
  "interpretation",
  "discursive",
]);
export const questionModelEnum = pgEnum("question_model", ["standard", "enade", "true_false", "assertion_reason"]);
export const examModelEnum = pgEnum("exam_model", ["standard", "enade", "mixed"]);
export const examStatusEnum = pgEnum("exam_status", ["in_progress", "completed", "abandoned"]);
export const announcementTypeEnum = pgEnum("announcement_type", ["info", "exam", "update", "warning"]);
export const reportCategoryEnum = pgEnum("report_category", ["wrong_answer", "typo", "outdated", "unclear", "image_issue", "other"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "reviewed", "resolved", "dismissed"]);
export const validationStatusEnum = pgEnum("validation_status", ["pending", "approved", "rejected"]);
export const trailStatusEnum = pgEnum("trail_status", ["enrolled", "in_progress", "completed", "failed"]);
export const moduleStatusEnum = pgEnum("module_status", ["locked", "available", "in_progress", "passed", "failed"]);
export const referralStatusEnum = pgEnum("referral_status", ["pending", "registered", "paid", "expired"]);
export const referralPlanEnum = pgEnum("referral_plan", ["monthly", "annual"]);
export const bonusTypeEnum = pgEnum("bonus_type", ["free_annual"]);
export const assignmentQuestionTypeEnum = pgEnum("assignment_question_type", ["multiple_choice", "discursive"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["pending", "approved", "rejected"]);

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  streak: integer("streak").default(0).notNull(),
  lastLoginDate: varchar("lastLoginDate", { length: 10 }),
  plan: planEnum("plan").default("free").notNull(),
  trialStartedAt: timestamp("trialStartedAt"),
  trialEndsAt: timestamp("trialEndsAt"),
  premiumStartedAt: timestamp("premiumStartedAt"),
  premiumEndsAt: timestamp("premiumEndsAt"),
  totalExams: integer("totalExams").default(0).notNull(),
  totalQuestions: integer("totalQuestions").default(0).notNull(),
  totalCorrect: integer("totalCorrect").default(0).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  phone: varchar("phone", { length: 20 }),
  referralCode: varchar("referralCode", { length: 16 }).unique(),
  referredBy: integer("referredBy"),
  lgpdConsentAt: timestamp("lgpdConsentAt"),
  lgpdConsentVersion: varchar("lgpdConsentVersion", { length: 16 }),
  tosAcceptedAt: timestamp("tosAcceptedAt"),
  tosVersion: varchar("tosVersion", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Teacher Permissions ──────────────────────────────────────────────────────
export const teacherPermissions = pgTable("teacher_permissions", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacherId").notNull(),
  disciplineId: integer("disciplineId").notNull(),
  canCreateQuestions: boolean("canCreateQuestions").default(true).notNull(),
  canValidateQuestions: boolean("canValidateQuestions").default(false).notNull(),
  canCreateExams: boolean("canCreateExams").default(true).notNull(),
  grantedBy: integer("grantedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeacherPermission = typeof teacherPermissions.$inferSelect;

// ─── Activity Log ─────────────────────────────────────────────────────────────
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: integer("entityId"),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;

// ─── Announcements ────────────────────────────────────────────────────────────
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  authorId: integer("authorId").notNull(),
  titlePt: varchar("titlePt", { length: 256 }).notNull(),
  titleEn: varchar("titleEn", { length: 256 }),
  bodyPt: text("bodyPt").notNull(),
  bodyEn: text("bodyEn"),
  type: announcementTypeEnum("type").default("info").notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  scheduledFor: timestamp("scheduledFor"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;

// ─── Question Reports ─────────────────────────────────────────────────────────
export const questionReports = pgTable("question_reports", {
  id: serial("id").primaryKey(),
  questionId: integer("questionId").notNull(),
  reporterId: integer("reporterId").notNull(),
  category: reportCategoryEnum("category").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").default("pending").notNull(),
  reviewedBy: integer("reviewedBy"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type QuestionReport = typeof questionReports.$inferSelect;

// ─── Disciplines ──────────────────────────────────────────────────────────────
export const disciplines = pgTable("disciplines", {
  id: serial("id").primaryKey(),
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
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  disciplineId: integer("disciplineId").notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  namePt: varchar("namePt", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Subject = typeof subjects.$inferSelect;

// ─── Questions ────────────────────────────────────────────────────────────────
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  disciplineId: integer("disciplineId").notNull(),
  subjectId: integer("subjectId"),
  createdBy: integer("createdBy"),
  difficulty: difficultyEnum("difficulty").notNull(),
  year: integer("year"),
  questionType: questionTypeEnum("questionType").default("multiple_choice").notNull(),
  formatData: json("formatData"),
  questionModel: questionModelEnum("questionModel").default("standard").notNull(),
  subjectTag: varchar("subjectTag", { length: 128 }),
  author: varchar("author", { length: 256 }),
  textPt: text("textPt").notNull(),
  textEn: text("textEn"),
  imageUrl: varchar("imageUrl", { length: 512 }),
  options: json("options").notNull(),
  correctOption: varchar("correctOption", { length: 4 }).notNull(),
  explanationPt: text("explanationPt"),
  explanationEn: text("explanationEn"),
  assertion1: text("assertion1"),
  assertion2: text("assertion2"),
  status: validationStatusEnum("status").default("approved").notNull(),
  isValidated: boolean("isValidated").default(false).notNull(),
  validatedBy: integer("validatedBy"),
  validatedAt: timestamp("validatedAt"),
  active: boolean("active").default(true).notNull(),
  isPremium: boolean("isPremium").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

// ─── Exams (sessions) ─────────────────────────────────────────────────────────
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 256 }),
  disciplineId: integer("disciplineId"),
  difficulty: difficultyMixedEnum("difficulty"),
  questionCount: integer("questionCount").notNull(),
  timeLimitSeconds: integer("timeLimitSeconds"),
  questionModel: examModelEnum("questionModel").default("standard"),
  subjectDistribution: json("subjectDistribution"),
  score: integer("score").default(0),
  totalQuestions: integer("totalQuestions").notNull(),
  correctAnswers: integer("correctAnswers").default(0),
  accuracy: real("accuracy").default(0),
  xpEarned: integer("xpEarned").default(0),
  timeSpentSeconds: integer("timeSpentSeconds"),
  disciplineStats: json("disciplineStats"),
  status: examStatusEnum("status").default("in_progress").notNull(),
  questionIds: json("questionIds").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;

// ─── Exam Answers ─────────────────────────────────────────────────────────────
export const examAnswers = pgTable("exam_answers", {
  id: serial("id").primaryKey(),
  examId: integer("examId").notNull(),
  questionId: integer("questionId").notNull(),
  selectedOption: varchar("selectedOption", { length: 4 }),
  isCorrect: boolean("isCorrect").default(false),
  timeSpentSeconds: integer("timeSpentSeconds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExamAnswer = typeof examAnswers.$inferSelect;

// ─── Practice Sessions ────────────────────────────────────────────────────────
export const practiceSessions = pgTable("practice_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  questionId: integer("questionId").notNull(),
  disciplineId: integer("disciplineId").notNull(),
  subjectId: integer("subjectId"),
  difficulty: difficultyEnum("difficulty"),
  selectedOption: varchar("selectedOption", { length: 4 }),
  isCorrect: boolean("isCorrect").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PracticeSession = typeof practiceSessions.$inferSelect;

// ─── Badges ───────────────────────────────────────────────────────────────────
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  namePt: varchar("namePt", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }).notNull(),
  descriptionPt: text("descriptionPt"),
  descriptionEn: text("descriptionEn"),
  icon: varchar("icon", { length: 64 }).notNull(),
  color: varchar("color", { length: 32 }),
  condition: json("condition"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Badge = typeof badges.$inferSelect;

// ─── User Badges ──────────────────────────────────────────────────────────────
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  badgeId: integer("badgeId").notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export type UserBadge = typeof userBadges.$inferSelect;

// ─── XP Events ────────────────────────────────────────────────────────────────
export const xpEvents = pgTable("xp_events", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  amount: integer("amount").notNull(),
  reason: varchar("reason", { length: 128 }).notNull(),
  examId: integer("examId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type XpEvent = typeof xpEvents.$inferSelect;

// ─── Weekly XP Snapshots ──────────────────────────────────────────────────────
export const weeklyXp = pgTable("weekly_xp", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  weekKey: varchar("weekKey", { length: 10 }).notNull(),
  xp: integer("xp").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const monthlyXp = pgTable("monthly_xp", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  monthKey: varchar("monthKey", { length: 7 }).notNull(),
  xp: integer("xp").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Discursive Questions ─────────────────────────────────────────────────────
export const discursiveQuestions = pgTable("discursive_questions", {
  id: serial("id").primaryKey(),
  disciplineId: integer("disciplineId").notNull(),
  subjectId: integer("subjectId"),
  subjectTag: varchar("subjectTag", { length: 128 }),
  author: varchar("author", { length: 256 }),
  difficulty: difficultyEnum("difficulty").notNull(),
  year: integer("year"),
  textPt: text("textPt").notNull(),
  textEn: text("textEn"),
  expectedAnswerPt: text("expectedAnswerPt").notNull(),
  expectedAnswerEn: text("expectedAnswerEn"),
  isValidated: boolean("isValidated").default(false).notNull(),
  validatedBy: integer("validatedBy"),
  validatedAt: timestamp("validatedAt"),
  active: boolean("active").default(true).notNull(),
  isPremium: boolean("isPremium").default(true).notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DiscursiveQuestion = typeof discursiveQuestions.$inferSelect;
export type InsertDiscursiveQuestion = typeof discursiveQuestions.$inferInsert;

// ─── Trails ───────────────────────────────────────────────────────────────────
export const trails = pgTable("trails", {
  id: serial("id").primaryKey(),
  disciplineId: integer("disciplineId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  totalHours: integer("totalHours").default(20).notNull(),
  passingScore: integer("passingScore").default(70).notNull(),
  finalExamQuestions: integer("finalExamQuestions").default(30).notNull(),
  finalExamTimeSeconds: integer("finalExamTimeSeconds").default(3600).notNull(),
  active: boolean("active").default(true).notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Trail = typeof trails.$inferSelect;
export type InsertTrail = typeof trails.$inferInsert;

// ─── Trail Modules ────────────────────────────────────────────────────────────
export const trailModules = pgTable("trail_modules", {
  id: serial("id").primaryKey(),
  trailId: integer("trailId").notNull(),
  order: integer("order").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  summary: text("summary"),
  difficulty: difficultyMixedEnum("difficulty").default("mixed").notNull(),
  questionCount: integer("questionCount").default(20).notNull(),
  minPassRate: integer("minPassRate").default(70).notNull(),
  questionFilter: json("questionFilter"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TrailModule = typeof trailModules.$inferSelect;
export type InsertTrailModule = typeof trailModules.$inferInsert;

// ─── Trail Module Questions ───────────────────────────────────────────────────
export const trailModuleQuestions = pgTable("trail_module_questions", {
  id: serial("id").primaryKey(),
  moduleId: integer("moduleId").notNull(),
  questionId: integer("questionId").notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrailModuleQuestion = typeof trailModuleQuestions.$inferSelect;

// ─── Trail Enrollments ────────────────────────────────────────────────────────
export const trailEnrollments = pgTable("trail_enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  trailId: integer("trailId").notNull(),
  status: trailStatusEnum("status").default("enrolled").notNull(),
  currentModuleId: integer("currentModuleId"),
  finalExamScore: integer("finalExamScore"),
  finalExamPassed: boolean("finalExamPassed").default(false),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  certificateUrl: varchar("certificateUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TrailEnrollment = typeof trailEnrollments.$inferSelect;

// ─── Trail Module Progress ────────────────────────────────────────────────────
export const trailModuleProgress = pgTable("trail_module_progress", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollmentId").notNull(),
  moduleId: integer("moduleId").notNull(),
  userId: integer("userId").notNull(),
  status: moduleStatusEnum("status").default("locked").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  bestScore: integer("bestScore").default(0).notNull(),
  lastScore: integer("lastScore").default(0).notNull(),
  questionsAnswered: integer("questionsAnswered").default(0).notNull(),
  questionsCorrect: integer("questionsCorrect").default(0).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TrailModuleProgress = typeof trailModuleProgress.$inferSelect;

// ─── Trail Module Answers ─────────────────────────────────────────────────────
export const trailModuleAnswers = pgTable("trail_module_answers", {
  id: serial("id").primaryKey(),
  progressId: integer("progressId").notNull(),
  userId: integer("userId").notNull(),
  moduleId: integer("moduleId").notNull(),
  questionId: integer("questionId").notNull(),
  selectedOption: varchar("selectedOption", { length: 4 }),
  isCorrect: boolean("isCorrect").default(false),
  attemptNumber: integer("attemptNumber").default(1).notNull(),
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
});

export type TrailModuleAnswer = typeof trailModuleAnswers.$inferSelect;

// ─── Referrals ────────────────────────────────────────────────────────────────
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrerId").notNull(),
  referredEmail: varchar("referredEmail", { length: 320 }).notNull(),
  referredUserId: integer("referredUserId"),
  status: referralStatusEnum("status").default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  planPurchased: referralPlanEnum("planPurchased"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// ─── Referral Bonuses ─────────────────────────────────────────────────────────
export const referralBonuses = pgTable("referral_bonuses", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  bonusType: bonusTypeEnum("bonusType").default("free_annual").notNull(),
  paidReferralsCount: integer("paidReferralsCount").notNull(),
  activatedAt: timestamp("activatedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferralBonus = typeof referralBonuses.$inferSelect;

// ─── Question Assignments ─────────────────────────────────────────────────────
export const questionAssignments = pgTable("question_assignments", {
  id: serial("id").primaryKey(),
  assignedBy: integer("assignedBy").notNull(),
  assignedTo: integer("assignedTo").notNull(),
  questionId: integer("questionId").notNull(),
  questionType: assignmentQuestionTypeEnum("questionType").default("multiple_choice").notNull(),
  status: assignmentStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type QuestionAssignment = typeof questionAssignments.$inferSelect;
export type InsertQuestionAssignment = typeof questionAssignments.$inferInsert;
