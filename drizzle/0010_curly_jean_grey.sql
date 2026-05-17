CREATE INDEX `idx_q_discipline_subject` ON `questions` (`disciplineId`,`subjectId`);--> statement-breakpoint
CREATE INDEX `idx_q_active_discipline` ON `questions` (`active`,`disciplineId`);--> statement-breakpoint
CREATE INDEX `idx_q_difficulty` ON `questions` (`difficulty`);--> statement-breakpoint
CREATE INDEX `idx_q_year` ON `questions` (`year`);--> statement-breakpoint
CREATE INDEX `idx_q_question_type` ON `questions` (`questionType`);--> statement-breakpoint
CREATE INDEX `idx_q_model_id` ON `questions` (`modelId`);--> statement-breakpoint
CREATE INDEX `idx_q_banca` ON `questions` (`banca`);--> statement-breakpoint
CREATE INDEX `idx_q_carreira` ON `questions` (`carreira`);--> statement-breakpoint
CREATE INDEX `idx_q_area_formacao` ON `questions` (`areaFormacao`);--> statement-breakpoint
CREATE INDEX `idx_q_escolaridade` ON `questions` (`escolaridade`);--> statement-breakpoint
CREATE INDEX `idx_q_flags` ON `questions` (`isAnulada`,`isDesatualizada`);--> statement-breakpoint
CREATE INDEX `idx_q_validated` ON `questions` (`isValidated`,`status`);--> statement-breakpoint
CREATE INDEX `idx_q_created_at` ON `questions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_q_grupo_id` ON `questions` (`grupoId`,`posicaoBloco`);