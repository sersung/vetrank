CREATE TABLE `saved_filters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`filters` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_filters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `difficulty` enum('very_easy','easy','medium','hard','very_hard') NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `banca` varchar(128);--> statement-breakpoint
ALTER TABLE `questions` ADD `instituicao` varchar(256);--> statement-breakpoint
ALTER TABLE `questions` ADD `cargo` varchar(256);--> statement-breakpoint
ALTER TABLE `questions` ADD `carreira` varchar(128);--> statement-breakpoint
ALTER TABLE `questions` ADD `areaFormacao` varchar(128);--> statement-breakpoint
ALTER TABLE `questions` ADD `escolaridade` enum('fundamental','medio','superior');--> statement-breakpoint
ALTER TABLE `questions` ADD `isAnulada` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `isDesatualizada` boolean DEFAULT false NOT NULL;