DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM ('pending','approved','rejected','cancelled','refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "payment_plan_type" AS ENUM ('monthly','annual');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "amount" real NOT NULL,
  "currency" varchar(3) DEFAULT 'BRL' NOT NULL,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "paymentMethod" varchar(64),
  "planType" "payment_plan_type",
  "externalId" varchar(128),
  "failureReason" text,
  "metadata" json,
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discursive_questions" ADD COLUMN IF NOT EXISTS "imageUrl" varchar(512);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionPlan" "payment_plan_type";
