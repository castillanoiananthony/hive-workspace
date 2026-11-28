ALTER TYPE "public"."email_kind" ADD VALUE 'remind0';--> statement-breakpoint
ALTER TYPE "public"."email_kind" ADD VALUE 'help';--> statement-breakpoint
ALTER TYPE "public"."email_kind" ADD VALUE 'daily';--> statement-breakpoint
ALTER TYPE "public"."email_kind" ADD VALUE 'subtask';--> statement-breakpoint
ALTER TABLE "assignment" ADD COLUMN "snoozed_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "buzz_mode" text DEFAULT 'instant' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_digest_at" timestamp with time zone;