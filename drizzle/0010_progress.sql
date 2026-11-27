CREATE TABLE "progress_log" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"team_id" text NOT NULL,
	"progress" smallint NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment" ADD COLUMN "progress" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "progress_log" ADD CONSTRAINT "progress_log_assignment_id_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_log" ADD CONSTRAINT "progress_log_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "progress_log_assignment_idx" ON "progress_log" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "progress_log_team_idx" ON "progress_log" USING btree ("team_id","created_at");