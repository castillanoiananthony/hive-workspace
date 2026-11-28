CREATE TABLE "hive_milestone" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp with time zone,
	"has_time" boolean DEFAULT false NOT NULL,
	"done_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_checklist" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_checklist_item" (
	"id" text PRIMARY KEY NOT NULL,
	"checklist_id" text NOT NULL,
	"text" text NOT NULL,
	"owner_id" text,
	"done_at" timestamp with time zone,
	"done_by_id" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "kind" text DEFAULT 'blank' NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hive_milestone" ADD CONSTRAINT "hive_milestone_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_checklist" ADD CONSTRAINT "team_checklist_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_checklist_item" ADD CONSTRAINT "team_checklist_item_checklist_id_team_checklist_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."team_checklist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_checklist_item" ADD CONSTRAINT "team_checklist_item_owner_id_team_member_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."team_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_checklist_item" ADD CONSTRAINT "team_checklist_item_done_by_id_team_member_id_fk" FOREIGN KEY ("done_by_id") REFERENCES "public"."team_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hive_milestone_team_idx" ON "hive_milestone" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_checklist_team_idx" ON "team_checklist" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_checklist_item_idx" ON "team_checklist_item" USING btree ("checklist_id");