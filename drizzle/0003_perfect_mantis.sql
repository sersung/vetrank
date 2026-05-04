CREATE TABLE `discursive_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`disciplineId` int NOT NULL,
	`subjectId` int,
	`subjectTag` varchar(128),
	`author` varchar(256),
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`year` int,
	`textPt` text NOT NULL,
	`textEn` text,
	`expectedAnswerPt` text NOT NULL,
	`expectedAnswerEn` text,
	`active` boolean NOT NULL DEFAULT true,
	`isPremium` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discursive_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `questions` ADD `questionType` enum('multiple_choice','assertion_reason','discursive') DEFAULT 'multiple_choice' NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `subjectTag` varchar(128);--> statement-breakpoint
ALTER TABLE `questions` ADD `author` varchar(256);--> statement-breakpoint
ALTER TABLE `questions` ADD `assertion1` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `assertion2` text;