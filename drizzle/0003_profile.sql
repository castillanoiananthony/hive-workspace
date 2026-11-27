CREATE TYPE "public"."image_kind" AS ENUM('avatar', 'banner');--> statement-breakpoint
CREATE TABLE "user_image" (
	"user_id" text NOT NULL,
	"kind" "image_kind" NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_image_user_id_kind_pk" PRIMARY KEY("user_id","kind")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "user_image" ADD CONSTRAINT "user_image_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;