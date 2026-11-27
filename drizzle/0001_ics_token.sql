-- The .ics link must be shown again in Settings, so the feed token is stored as-is (like Google's secret iCal address)
ALTER TABLE "user" RENAME COLUMN "ics_token_hash" TO "ics_token";--> statement-breakpoint
ALTER TABLE "user" RENAME CONSTRAINT "user_ics_token_hash_unique" TO "user_ics_token_unique";
