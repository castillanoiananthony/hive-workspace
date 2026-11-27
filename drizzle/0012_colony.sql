ALTER TYPE "public"."email_kind" ADD VALUE 'announce';--> statement-breakpoint
CREATE TABLE "colony" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"queen_id" text NOT NULL,
	"join_code" text NOT NULL,
	"self_swarm" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colony_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "colony_member" (
	"colony_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colony_member_colony_id_user_id_pk" PRIMARY KEY("colony_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "colony_post" (
	"id" text PRIMARY KEY NOT NULL,
	"colony_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone" (
	"id" text PRIMARY KEY NOT NULL,
	"colony_id" text NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peer_eval" (
	"id" text PRIMARY KEY NOT NULL,
	"colony_id" text NOT NULL,
	"title" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"show_to_students" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peer_response" (
	"id" text PRIMARY KEY NOT NULL,
	"eval_id" text NOT NULL,
	"team_id" text NOT NULL,
	"rater_id" text NOT NULL,
	"ratee_id" text NOT NULL,
	"scores" jsonb NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "colony_id" text;--> statement-breakpoint
ALTER TABLE "colony" ADD CONSTRAINT "colony_queen_id_user_id_fk" FOREIGN KEY ("queen_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colony_member" ADD CONSTRAINT "colony_member_colony_id_colony_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colony"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colony_member" ADD CONSTRAINT "colony_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colony_post" ADD CONSTRAINT "colony_post_colony_id_colony_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colony"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_colony_id_colony_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colony"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_eval" ADD CONSTRAINT "peer_eval_colony_id_colony_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colony"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_response" ADD CONSTRAINT "peer_response_eval_id_peer_eval_id_fk" FOREIGN KEY ("eval_id") REFERENCES "public"."peer_eval"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_response" ADD CONSTRAINT "peer_response_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_response" ADD CONSTRAINT "peer_response_rater_id_user_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_response" ADD CONSTRAINT "peer_response_ratee_id_team_member_id_fk" FOREIGN KEY ("ratee_id") REFERENCES "public"."team_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "colony_member_user_idx" ON "colony_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "colony_post_idx" ON "colony_post" USING btree ("colony_id","created_at");--> statement-breakpoint
CREATE INDEX "milestone_colony_idx" ON "milestone" USING btree ("colony_id","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "peer_response_uq" ON "peer_response" USING btree ("eval_id","rater_id","ratee_id");--> statement-breakpoint
CREATE INDEX "peer_response_eval_idx" ON "peer_response" USING btree ("eval_id");--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_colony_id_colony_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colony"("id") ON DELETE set null ON UPDATE no action;