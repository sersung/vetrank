ALTER TABLE `question_assignments` ADD `rejectionReason` enum('erro_conteudo','gabarito_incorreto','alternativas','enunciado_ambiguo','nivel_inadequado','fora_escopo','duplicata','linguagem','outros');--> statement-breakpoint
ALTER TABLE `questions` ADD `revisionNotes` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `revisedAt` timestamp;--> statement-breakpoint
ALTER TABLE `questions` ADD `revisionCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_assign_status` ON `question_assignments` (`status`,`assignedTo`);--> statement-breakpoint
CREATE INDEX `idx_assign_question` ON `question_assignments` (`questionId`);