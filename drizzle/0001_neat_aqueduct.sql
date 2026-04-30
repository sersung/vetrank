CREATE TABLE `badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`namePt` varchar(128) NOT NULL,
	`nameEn` varchar(128) NOT NULL,
	`descriptionPt` text,
	`descriptionEn` text,
	`icon` varchar(64) NOT NULL,
	`color` varchar(32),
	`condition` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `badges_id` PRIMARY KEY(`id`),
	CONSTRAINT `badges_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `disciplines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`namePt` varchar(128) NOT NULL,
	`nameEn` varchar(128) NOT NULL,
	`icon` varchar(64),
	`color` varchar(32),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `disciplines_id` PRIMARY KEY(`id`),
	CONSTRAINT `disciplines_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `exam_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedOption` varchar(4),
	`isCorrect` boolean DEFAULT false,
	`timeSpentSeconds` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`disciplineId` int,
	`difficulty` enum('easy','medium','hard','mixed'),
	`questionCount` int NOT NULL,
	`timeLimitSeconds` int,
	`score` int DEFAULT 0,
	`totalQuestions` int NOT NULL,
	`correctAnswers` int DEFAULT 0,
	`accuracy` float DEFAULT 0,
	`xpEarned` int DEFAULT 0,
	`timeSpentSeconds` int,
	`status` enum('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
	`questionIds` json NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_xp` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_xp_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`disciplineId` int NOT NULL,
	`subjectId` int,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`year` int,
	`textPt` text NOT NULL,
	`textEn` text,
	`options` json NOT NULL,
	`correctOption` varchar(4) NOT NULL,
	`explanationPt` text,
	`explanationEn` text,
	`active` boolean NOT NULL DEFAULT true,
	`isPremium` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`disciplineId` int NOT NULL,
	`slug` varchar(64) NOT NULL,
	`namePt` varchar(128) NOT NULL,
	`nameEn` varchar(128) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`badgeId` int NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_xp` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekKey` varchar(10) NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_xp_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `xp_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`reason` varchar(128) NOT NULL,
	`examId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `xp_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `xp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `level` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `streak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastLoginDate` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `plan` enum('free','trial','premium') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `trialStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `trialEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `premiumStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `premiumEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `totalExams` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totalQuestions` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totalCorrect` int DEFAULT 0 NOT NULL;