CREATE TABLE `question_assertivas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`ordem` int NOT NULL,
	`label` varchar(4) NOT NULL,
	`textPt` text NOT NULL,
	`textEn` text,
	`correta` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_assertivas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grupoId` varchar(64) NOT NULL,
	`titulo` varchar(256),
	`textBasePt` text NOT NULL,
	`textBaseEn` text,
	`alternativas` json NOT NULL,
	`totalQuestoes` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_groups_grupoId_unique` UNIQUE(`grupoId`)
);
--> statement-breakpoint
CREATE TABLE `question_matching_cols` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`coluna` enum('esquerda','direita') NOT NULL,
	`ordem` int NOT NULL,
	`label` varchar(8) NOT NULL,
	`textPt` text NOT NULL,
	`textEn` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_matching_cols_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_matching_pairs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`esquerdaId` int NOT NULL,
	`direitaId` int NOT NULL,
	CONSTRAINT `question_matching_pairs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `questions` ADD `a1Verdadeira` boolean;--> statement-breakpoint
ALTER TABLE `questions` ADD `a2Verdadeira` boolean;--> statement-breakpoint
ALTER TABLE `questions` ADD `relacaoCausal` boolean;--> statement-breakpoint
CREATE INDEX `idx_assertivas_question` ON `question_assertivas` (`questionId`,`ordem`);--> statement-breakpoint
CREATE INDEX `idx_groups_grupo_id` ON `question_groups` (`grupoId`);--> statement-breakpoint
CREATE INDEX `idx_matching_question_col` ON `question_matching_cols` (`questionId`,`coluna`);--> statement-breakpoint
CREATE INDEX `idx_pairs_question` ON `question_matching_pairs` (`questionId`);