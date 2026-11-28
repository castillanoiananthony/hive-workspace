CREATE TABLE "criterion" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"text" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_note" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"member_id" text,
	"body" text NOT NULL,
	"task_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_criterion" (
	"task_id" text NOT NULL,
	"criterion_id" text NOT NULL,
	CONSTRAINT "task_criterion_task_id_criterion_id_pk" PRIMARY KEY("task_id","criterion_id")
);
--> statement-breakpoint
CREATE TABLE "team_stream" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "stream_id" text;--> statement-breakpoint
ALTER TABLE "team_link" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team_link" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "streams" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "working_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "working_note" text;--> statement-breakpoint
ALTER TABLE "criterion" ADD CONSTRAINT "criterion_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_note" ADD CONSTRAINT "meeting_note_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_note" ADD CONSTRAINT "meeting_note_member_id_team_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_criterion" ADD CONSTRAINT "task_criterion_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_criterion" ADD CONSTRAINT "task_criterion_criterion_id_criterion_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."criterion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_stream" ADD CONSTRAINT "team_stream_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "criterion_team_idx" ON "criterion" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "meeting_note_team_idx" ON "meeting_note" USING btree ("team_id","created_at");--> statement-breakpoint
CREATE INDEX "team_stream_team_idx" ON "team_stream" USING btree ("team_id");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_stream_id_team_stream_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."team_stream"("id") ON DELETE set null ON UPDATE no action;