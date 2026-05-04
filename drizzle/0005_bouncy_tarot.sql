CREATE TABLE `referral_bonuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bonusType` enum('free_annual') NOT NULL DEFAULT 'free_annual',
	`paidReferralsCount` int NOT NULL,
	`activatedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_bonuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referredEmail` varchar(320) NOT NULL,
	`referredUserId` int,
	`status` enum('pending','registered','paid','expired') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`planPurchased` enum('monthly','annual'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trail_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trailId` int NOT NULL,
	`status` enum('enrolled','in_progress','completed','failed') NOT NULL DEFAULT 'enrolled',
	`currentModuleId` int,
	`finalExamScore` int,
	`finalExamPassed` boolean DEFAULT false,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`certificateUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trail_enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trail_module_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`progressId` int NOT NULL,
	`userId` int NOT NULL,
	`moduleId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedOption` varchar(4),
	`isCorrect` boolean DEFAULT false,
	`attemptNumber` int NOT NULL DEFAULT 1,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trail_module_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trail_module_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollmentId` int NOT NULL,
	`moduleId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('locked','available','in_progress','passed','failed') NOT NULL DEFAULT 'locked',
	`attempts` int NOT NULL DEFAULT 0,
	`bestScore` int NOT NULL DEFAULT 0,
	`lastScore` int NOT NULL DEFAULT 0,
	`questionsAnswered` int NOT NULL DEFAULT 0,
	`questionsCorrect` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trail_module_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trail_module_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` int NOT NULL,
	`questionId` int NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trail_module_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trail_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trailId` int NOT NULL,
	`order` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`summary` text,
	`difficulty` enum('easy','medium','hard','mixed') NOT NULL DEFAULT 'mixed',
	`questionCount` int NOT NULL DEFAULT 20,
	`minPassRate` int NOT NULL DEFAULT 70,
	`questionFilter` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trail_modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`disciplineId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`totalHours` int NOT NULL DEFAULT 20,
	`passingScore` int NOT NULL DEFAULT 70,
	`finalExamQuestions` int NOT NULL DEFAULT 30,
	`finalExamTimeSeconds` int NOT NULL DEFAULT 3600,
	`active` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `cpf` varchar(14);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `referredBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `tosAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `tosVersion` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_referralCode_unique` UNIQUE(`referralCode`);