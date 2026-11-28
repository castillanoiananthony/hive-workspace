CREATE TABLE "test_field" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" text,
	"higher_is_better" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_run" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"member_id" text,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" text,
	"result" text,
	"notes" text,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_best" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "type" text DEFAULT 'task' NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "severity" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "steps" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "test_run_id" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "decision" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "rationale" text;--> statement-breakpoint
ALTER TABLE "test_field" ADD CONSTRAINT "test_field_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_member_id_team_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_field_team_idx" ON "test_field" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "test_run_team_idx" ON "test_run" USING btree ("team_id","ran_at");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_test_run_id_test_run_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_run"("id") ON DELETE set null ON UPDATE no action;