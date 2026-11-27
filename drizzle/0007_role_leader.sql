ALTER TABLE "team_role" ADD COLUMN "is_leader" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Repeated roles (same team, same name, made when a team was opened twice at once): keep the oldest, move its holders over.
WITH ranked AS (
  SELECT id, first_value(id) OVER (PARTITION BY team_id, name ORDER BY created_at, id) AS keep FROM "team_role"
)
UPDATE "team_member" m SET role_id = r.keep FROM ranked r WHERE m.role_id = r.id AND r.id <> r.keep;--> statement-breakpoint
DELETE FROM "team_role" t USING (
  SELECT id, first_value(id) OVER (PARTITION BY team_id, name ORDER BY created_at, id) AS keep FROM "team_role"
) r WHERE t.id = r.id AND r.id <> r.keep;--> statement-breakpoint
UPDATE "team_role" SET is_leader = true WHERE name = 'Leader';--> statement-breakpoint
CREATE UNIQUE INDEX "team_role_name_uq" ON "team_role" USING btree ("team_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "team_role_leader_uq" ON "team_role" USING btree ("team_id") WHERE "team_role"."is_leader";
