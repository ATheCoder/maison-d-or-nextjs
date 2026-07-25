--> Daily Gold Phase 1 — publish gates, provenance, and emptying the legacy
--> On This Day corpus. See docs/daily-gold-admin-plan.md Phase 1 (R7.2, R7.9,
--> R7.11, R7.13). A pg_dump of on_this_day_event was taken before this ran.

--> 'draft' is what `prepare` writes; 'generating' keeps its literal meaning of
--> a job in flight. Only 'ready' reaches a reader.
ALTER TYPE "public"."dg_status" ADD VALUE 'draft' BEFORE 'generating';--> statement-breakpoint

ALTER TABLE "good_news_item" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "good_news_item" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "good_news_item" ADD COLUMN "source_title" text;--> statement-breakpoint
ALTER TABLE "good_news_item" ADD COLUMN "source_published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "good_news_item" ADD COLUMN "retrieved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "good_news_item" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "greatest_moment" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "greatest_moment" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "greatest_moment" ADD COLUMN "source_title" text;--> statement-breakpoint
ALTER TABLE "greatest_moment" ADD COLUMN "source_published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "greatest_moment" ADD COLUMN "retrieved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "greatest_moment" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "on_this_day_event" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "on_this_day_event" ADD COLUMN "source_title" text;--> statement-breakpoint
ALTER TABLE "on_this_day_event" ADD COLUMN "source_published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "on_this_day_event" ADD COLUMN "retrieved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "on_this_day_event" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint

--> Existing good news and moments are live on the reader today, so the gate
--> opens for them. Provenance stays null: these rows were imported, not
--> retrieved, and backfilling a citation they never had would defeat D10.
UPDATE "good_news_item" SET "published" = true;--> statement-breakpoint
UPDATE "greatest_moment" SET "published" = true;--> statement-breakpoint

--> R7.13 — the whole legacy corpus goes, not only the un-authored rows. It was
--> written by the reader itself without review, and five of its thirteen
--> "authored" rows are filed under the wrong month-day. The content type stays;
--> only its contents leave.
TRUNCATE TABLE "on_this_day_event" RESTART IDENTITY;--> statement-breakpoint

--> Nothing consumes these once the read-time enrichment call is deleted.
ALTER TABLE "on_this_day_event" DROP COLUMN "researched_from_internet";--> statement-breakpoint
ALTER TABLE "on_this_day_event" DROP COLUMN "raw_text";--> statement-breakpoint
ALTER TABLE "on_this_day_event" DROP COLUMN "raw_extract";
