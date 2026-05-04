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
  role: mysqlEnum("role", ["user", "teacher", "coordinator", "superuser", "admin"]).default("user").notNull(),
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
  // Profile
  cpf: varchar("cpf", { length: 14 }), // 000.000.000-00
  phone: varchar("phone", { length: 20 }),
  // Referral
  referralCode: varchar("referralCode", { length: 16 }).unique(),
  referredBy: int("referredBy"), // userId of referrer
  // LGPD
  lgpdConsentAt: timestamp("lgpdConsentAt"),
  lgpdConsentVersion: varchar("lgpdConsentVersion", { length: 16 }),
  tosAcceptedAt: timestamp("tosAcceptedAt"),
  tosVersion: varchar("tosVersion", { length: 16 }),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Teacher Permissions ──────────────────────────────────────────────────────
export const teacherPermissions = mysqlTable("teacher_permissions", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  disciplineId: int("disciplineId").notNull(),
  canCreateQuestions: boolean("canCreateQuestions").default(true).notNull(),
  canValidateQuestions: boolean("canValidateQuestions").default(false).notNull(),
  canCreateExams: boolean("canCreateExams").default(true).notNull(),
  grantedBy: int("grantedBy").notNull(), // coordinator or superuser id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeacherPermission = typeof teacherPermissions.$inferSelect;

// ─── Activity Log ─────────────────────────────────────────────────────────────
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entityType", { length: 64 }), // question, exam, user, etc.
  entityId: int("entityId"),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;

// ─── Announcements ────────────────────────────────────────────────────────────
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  titlePt: varchar("titlePt", { length: 256 }).notNull(),
  titleEn: varchar("titleEn", { length: 256 }),
  bodyPt: text("bodyPt").notNull(),
  bodyEn: text("bodyEn"),
  type: mysqlEnum("type", ["info", "exam", "update", "warning"]).default("info").notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  scheduledFor: timestamp("scheduledFor"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;

// ─── Question Reports ─────────────────────────────────────────────────────────
export const questionReports = mysqlTable("question_reports", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  reporterId: int("reporterId").notNull(),
  category: mysqlEnum("category", ["wrong_answer", "typo", "outdated", "unclear", "image_issue", "other"]).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "dismissed"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuestionReport = typeof questionReports.$inferSelect;

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
  createdBy: int("createdBy"), // teacher or admin user id
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  year: int("year"),
  // Question type (format)
  questionType: mysqlEnum("questionType", [
    "multiple_choice",      // Múltipla Escolha Simples: 5 alternativas A-E
    "assertion_reason",     // Asserção-Razão ENADE: proposições I e II com PORQUE, 5 opções fixas
    "complex_multiple_choice", // Múltipla Escolha Complexa: itens I/II/III com combinações
    "matching",             // Associação: Coluna A ↔ Coluna B
    "true_false",           // Verdadeiro ou Falso Sequencial: lista de afirmações V/F
    "ordering",             // Ordenação/Sequenciamento: organizar etapas
    "cloze",                // Preenchimento de Lacunas (Cloze): texto com [BLANK]
    "clinical_case",        // Caso Clínico: anamnese/exames + alternativas
    "image_analysis",       // Análise de Imagem/Gráfico: imagem + alternativas
    "interpretation",       // Interpretação de Dados: tabela/resultado + alternativas
    "discursive",           // Discursiva: resposta aberta
  ]).default("multiple_choice").notNull(),
  // Format-specific structured data (JSON)
  // Used for: complex_multiple_choice items, matching columns, true_false statements, ordering steps, cloze blanks
  formatData: json("formatData"),
  // Question model/template (legacy, kept for compatibility)
  questionModel: mysqlEnum("questionModel", ["standard", "enade", "true_false", "assertion_reason"]).default("standard").notNull(),
  // Subject tag and author
  subjectTag: varchar("subjectTag", { length: 128 }),
  author: varchar("author", { length: 256 }),
  // Content (bilingual)
  textPt: text("textPt").notNull(),
  textEn: text("textEn"),
  // Image URL for question body
  imageUrl: varchar("imageUrl", { length: 512 }),
  // Options stored as JSON array [{id, textPt, textEn, imageUrl?}]
  options: json("options").notNull(),
  correctOption: varchar("correctOption", { length: 4 }).notNull(),
  explanationPt: text("explanationPt"),
  explanationEn: text("explanationEn"),
  // Assertion-reason specific fields
  assertion1: text("assertion1"),
  assertion2: text("assertion2"),
  // Validation
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("approved").notNull(),
  isValidated: boolean("isValidated").default(false).notNull(),
  validatedBy: int("validatedBy"),
  validatedAt: timestamp("validatedAt"),
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
  title: varchar("title", { length: 256 }),
  // Config
  disciplineId: int("disciplineId"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard", "mixed"]),
  questionCount: int("questionCount").notNull(),
  timeLimitSeconds: int("timeLimitSeconds"),
  questionModel: mysqlEnum("questionModel", ["standard", "enade", "mixed"]).default("standard"),
  // Subject distribution: JSON [{subjectId, percentage}]
  subjectDistribution: json("subjectDistribution"),
  // Results
  score: int("score").default(0),
  totalQuestions: int("totalQuestions").notNull(),
  correctAnswers: int("correctAnswers").default(0),
  accuracy: float("accuracy").default(0),
  xpEarned: int("xpEarned").default(0),
  timeSpentSeconds: int("timeSpentSeconds"),
  // Per-discipline stats: JSON [{disciplineId, total, correct, accuracy}]
  disciplineStats: json("disciplineStats"),
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

// ─── Practice Sessions (non-exam question answering) ──────────────────────────
export const practiceSessions = mysqlTable("practice_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(),
  disciplineId: int("disciplineId").notNull(),
  subjectId: int("subjectId"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]),
  selectedOption: varchar("selectedOption", { length: 4 }),
  isCorrect: boolean("isCorrect").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PracticeSession = typeof practiceSessions.$inferSelect;

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

// ─── Discursive Questions ───────────────────────────────────────────────────────────────
export const discursiveQuestions = mysqlTable("discursive_questions", {
  id: int("id").autoincrement().primaryKey(),
  disciplineId: int("disciplineId").notNull(),
  subjectId: int("subjectId"),
  subjectTag: varchar("subjectTag", { length: 128 }),
  author: varchar("author", { length: 256 }),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  year: int("year"),
  textPt: text("textPt").notNull(),
  textEn: text("textEn"),
  expectedAnswerPt: text("expectedAnswerPt").notNull(),
  expectedAnswerEn: text("expectedAnswerEn"),
  isValidated: boolean("isValidated").default(false).notNull(),
  validatedBy: int("validatedBy"),
  validatedAt: timestamp("validatedAt"),
  active: boolean("active").default(true).notNull(),
  isPremium: boolean("isPremium").default(true).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiscursiveQuestion = typeof discursiveQuestions.$inferSelect;
export type InsertDiscursiveQuestion = typeof discursiveQuestions.$inferInsert;

// ─── Trails (Trilhas do Conhecimento) ────────────────────────────────────────
export const trails = mysqlTable("trails", {
  id: int("id").autoincrement().primaryKey(),
  disciplineId: int("disciplineId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  totalHours: int("totalHours").default(20).notNull(), // estimated hours
  passingScore: int("passingScore").default(70).notNull(), // % to pass each module
  finalExamQuestions: int("finalExamQuestions").default(30).notNull(),
  finalExamTimeSeconds: int("finalExamTimeSeconds").default(3600).notNull(),
  active: boolean("active").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trail = typeof trails.$inferSelect;
export type InsertTrail = typeof trails.$inferInsert;

// ─── Trail Modules ────────────────────────────────────────────────────────────
export const trailModules = mysqlTable("trail_modules", {
  id: int("id").autoincrement().primaryKey(),
  trailId: int("trailId").notNull(),
  order: int("order").notNull(), // 1-based sequential order
  title: varchar("title", { length: 256 }).notNull(),
  summary: text("summary"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard", "mixed"]).default("mixed").notNull(),
  questionCount: int("questionCount").default(20).notNull(),
  minPassRate: int("minPassRate").default(70).notNull(), // % correct to pass
  // Filter config for question selection (JSON: {disciplineId, subjectIds, difficulty, author, year})
  questionFilter: json("questionFilter"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrailModule = typeof trailModules.$inferSelect;
export type InsertTrailModule = typeof trailModules.$inferInsert;

// ─── Trail Module Questions (manually assigned questions) ─────────────────────
export const trailModuleQuestions = mysqlTable("trail_module_questions", {
  id: int("id").autoincrement().primaryKey(),
  moduleId: int("moduleId").notNull(),
  questionId: int("questionId").notNull(),
  order: int("order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrailModuleQuestion = typeof trailModuleQuestions.$inferSelect;

// ─── Trail Enrollments ────────────────────────────────────────────────────────
export const trailEnrollments = mysqlTable("trail_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  trailId: int("trailId").notNull(),
  status: mysqlEnum("status", ["enrolled", "in_progress", "completed", "failed"]).default("enrolled").notNull(),
  currentModuleId: int("currentModuleId"),
  finalExamScore: int("finalExamScore"),
  finalExamPassed: boolean("finalExamPassed").default(false),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  certificateUrl: varchar("certificateUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrailEnrollment = typeof trailEnrollments.$inferSelect;

// ─── Trail Module Progress ────────────────────────────────────────────────────
export const trailModuleProgress = mysqlTable("trail_module_progress", {
  id: int("id").autoincrement().primaryKey(),
  enrollmentId: int("enrollmentId").notNull(),
  moduleId: int("moduleId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["locked", "available", "in_progress", "passed", "failed"]).default("locked").notNull(),
  attempts: int("attempts").default(0).notNull(),
  bestScore: int("bestScore").default(0).notNull(), // best % correct across attempts
  lastScore: int("lastScore").default(0).notNull(),
  questionsAnswered: int("questionsAnswered").default(0).notNull(),
  questionsCorrect: int("questionsCorrect").default(0).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrailModuleProgress = typeof trailModuleProgress.$inferSelect;

// ─── Trail Module Answers ─────────────────────────────────────────────────────
export const trailModuleAnswers = mysqlTable("trail_module_answers", {
  id: int("id").autoincrement().primaryKey(),
  progressId: int("progressId").notNull(),
  userId: int("userId").notNull(),
  moduleId: int("moduleId").notNull(),
  questionId: int("questionId").notNull(),
  selectedOption: varchar("selectedOption", { length: 4 }),
  isCorrect: boolean("isCorrect").default(false),
  attemptNumber: int("attemptNumber").default(1).notNull(),
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
});

export type TrailModuleAnswer = typeof trailModuleAnswers.$inferSelect;

// ─── Referrals ────────────────────────────────────────────────────────────────
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(), // user who referred
  referredEmail: varchar("referredEmail", { length: 320 }).notNull(),
  referredUserId: int("referredUserId"), // set when referred user registers
  status: mysqlEnum("status", ["pending", "registered", "paid", "expired"]).default("pending").notNull(),
  // Only counts after referred user pays (not trial)
  paidAt: timestamp("paidAt"),
  planPurchased: mysqlEnum("planPurchased", ["monthly", "annual"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// ─── Referral Bonuses ─────────────────────────────────────────────────────────
export const referralBonuses = mysqlTable("referral_bonuses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bonusType: mysqlEnum("bonusType", ["free_annual"]).default("free_annual").notNull(),
  paidReferralsCount: int("paidReferralsCount").notNull(), // snapshot at time of bonus
  activatedAt: timestamp("activatedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(), // +1 year from activation
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferralBonus = typeof referralBonuses.$inferSelect;

// ─── Question Assignments (coordinator assigns questions to professors for validation) ─
export const questionAssignments = mysqlTable("question_assignments", {
  id: int("id").autoincrement().primaryKey(),
  assignedBy: int("assignedBy").notNull(),   // coordinator/superuser id
  assignedTo: int("assignedTo").notNull(),   // teacher/professor id
  questionId: int("questionId").notNull(),
  questionType: mysqlEnum("questionType", ["multiple_choice", "discursive"]).default("multiple_choice").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  notes: text("notes"),                      // professor feedback notes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuestionAssignment = typeof questionAssignments.$inferSelect;
export type InsertQuestionAssignment = typeof questionAssignments.$inferInsert;
