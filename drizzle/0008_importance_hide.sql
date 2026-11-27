ALTER TABLE "comb_post" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "importance" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "importance_colors" jsonb;