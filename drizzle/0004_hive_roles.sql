CREATE TABLE "comb_post" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"member_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_role" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"perms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "join_code" text;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "joined_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "role_id" text;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "perms" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comb_post" ADD CONSTRAINT "comb_post_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comb_post" ADD CONSTRAINT "comb_post_member_id_team_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_role" ADD CONSTRAINT "team_role_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comb_team_idx" ON "comb_post" USING btree ("team_id","created_at");--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_role_id_team_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."team_role"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_parent_id_team_member_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."team_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_join_code_unique" UNIQUE("join_code");--> statement-breakpoint
-- Every existing team's owner becomes its admin (the leader at the top of the hierarchy).
INSERT INTO "team_member" ("id", "team_id", "name", "email", "unsubscribe_token_hash", "user_id", "joined_at", "is_admin", "perms", "created_at")
SELECT gen_random_uuid()::text, t."id", coalesce(nullif(u."name", ''), split_part(u."email", '@', 1)), lower(u."email"),
       md5(random()::text || t."id" || clock_timestamp()::text), u."id", now(), true, '[]'::jsonb, now()
FROM "team" t JOIN "user" u ON u."id" = t."owner_id"
ON CONFLICT ("team_id", "email") DO UPDATE SET "user_id" = EXCLUDED."user_id", "is_admin" = true, "joined_at" = coalesce("team_member"."joined_at", now());
