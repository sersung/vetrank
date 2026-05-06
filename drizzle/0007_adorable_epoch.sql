CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` float NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BRL',
	`status` enum('pending','approved','rejected','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`paymentMethod` varchar(64),
	`planType` enum('monthly','annual'),
	`externalId` varchar(128),
	`failureReason` text,
	`metadata` json,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `discursive_questions` ADD `imageUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionPlan` enum('monthly','annual');