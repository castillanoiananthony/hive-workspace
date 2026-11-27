ALTER TYPE "public"."task_status" ADD VALUE 'review' BEFORE 'done';--> statement-breakpoint
CREATE TABLE "contribution" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"task_id" text,
	"subtask_id" text,
	"member_id" text,
	"kind" text NOT NULL,
	"what" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtask" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"owner_id" text,
	"due_at" timestamp with time zone,
	"has_time" boolean DEFAULT false NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"done_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"member_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "access" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_subtask_id_subtask_id_fk" FOREIGN KEY ("subtask_id") REFERENCES "public"."subtask"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_member_id_team_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtask" ADD CONSTRAINT "subtask_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtask" ADD CONSTRAINT "subtask_owner_id_team_member_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."team_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_member_id_team_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contribution_team_idx" ON "contribution" USING btree ("team_id","created_at");--> statement-breakpoint
CREATE INDEX "contribution_member_idx" ON "contribution" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "subtask_task_idx" ON "subtask" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "subtask_owner_idx" ON "subtask" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "task_comment_task_idx" ON "task_comment" USING btree ("task_id","created_at");