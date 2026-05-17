CREATE INDEX `idx_ps_user_question` ON `practice_sessions` (`userId`,`questionId`);--> statement-breakpoint
CREATE INDEX `idx_ps_user_correct` ON `practice_sessions` (`userId`,`isCorrect`);--> statement-breakpoint
CREATE INDEX `idx_ps_user_discipline` ON `practice_sessions` (`userId`,`disciplineId`);