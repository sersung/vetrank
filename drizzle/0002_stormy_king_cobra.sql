CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`details` json,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`titlePt` varchar(256) NOT NULL,
	`titleEn` varchar(256),
	`bodyPt` text NOT NULL,
	`bodyEn` text,
	`type` enum('info','exam','update','warning') NOT NULL DEFAULT 'info',
	`pinned` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`scheduledFor` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`disciplineId` int NOT NULL,
	`subjectId` int,
	`difficulty` enum('easy','medium','hard'),
	`selectedOption` varchar(4),
	`isCorrect` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practice_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`reporterId` int NOT NULL,
	`category` enum('wrong_answer','typo','outdated','unclear','image_issue','other') NOT NULL,
	`description` text,
	`status` enum('pending','reviewed','resolved','dismissed') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teacher_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`disciplineId` int NOT NULL,
	`canCreateQuestions` boolean NOT NULL DEFAULT true,
	`canValidateQuestions` boolean NOT NULL DEFAULT false,
	`canCreateExams` boolean NOT NULL DEFAULT true,
	`grantedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teacher_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','teacher','coordinator','superuser','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `exams` ADD `title` varchar(256);--> statement-breakpoint
ALTER TABLE `exams` ADD `questionModel` enum('standard','enade','mixed') DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE `exams` ADD `subjectDistribution` json;--> statement-breakpoint
ALTER TABLE `exams` ADD `disciplineStats` json;--> statement-breakpoint
ALTER TABLE `questions` ADD `createdBy` int;--> statement-breakpoint
ALTER TABLE `questions` ADD `questionModel` enum('standard','enade','true_false','assertion_reason') DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `imageUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `questions` ADD `status` enum('pending','approved','rejected') DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `validatedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `lgpdConsentAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `lgpdConsentVersion` varchar(16);