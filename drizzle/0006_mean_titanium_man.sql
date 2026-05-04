CREATE TABLE `question_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignedBy` int NOT NULL,
	`assignedTo` int NOT NULL,
	`questionId` int NOT NULL,
	`questionType` enum('multiple_choice','discursive') NOT NULL DEFAULT 'multiple_choice',
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `discursive_questions` ADD `isValidated` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `discursive_questions` ADD `validatedBy` int;--> statement-breakpoint
ALTER TABLE `discursive_questions` ADD `validatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `questions` ADD `isValidated` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `validatedAt` timestamp;