CREATE TABLE "class_slot" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"subject_id" text,
	"title" text NOT NULL,
	"weekday" smallint NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"room" text
);
--> statement-breakpoint
CREATE TABLE "focus" (
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"task_ids" jsonb NOT NULL,
	CONSTRAINT "focus_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "semester" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"periods" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"code" text NOT NULL,
	"color" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "is_exam" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "done_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_slot" ADD CONSTRAINT "class_slot_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_slot" ADD CONSTRAINT "class_slot_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus" ADD CONSTRAINT "focus_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semester" ADD CONSTRAINT "semester_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject" ADD CONSTRAINT "subject_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_slot_owner_idx" ON "class_slot" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "semester_owner_idx" ON "semester" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "subject_owner_idx" ON "subject" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "task" SET "done_at" = "updated_at" WHERE "status" = 'done' AND "done_at" IS NULL;
