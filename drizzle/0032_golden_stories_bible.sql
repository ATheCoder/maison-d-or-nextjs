-- docs/golden-stories-bible.md, adopted 2026-08-25.
--
-- story_childhood_fact: the childhood spread's one tellable fact. Every other
--   section carries its fact inside its own jsonb (Chapter.fact /
--   StorySection.fact), which needs no migration; the childhood page is flat
--   columns, so it needs this one.
-- fact_check: the last grounded pass over a person's book. Null means never
--   checked — a normal state, since checking warns and never gates publishing.
-- 'factcheck': the job kind that pass runs as.
--
-- Nothing is backfilled on purpose. The four books written before the bible
-- (leonardo, albert-einstein, marie-curie, rembrandt-van-rijn) keep no facts
-- and no report, and are deliberately not held to the new standard
-- (Standing decision 1).

ALTER TYPE "public"."generation_job_kind" ADD VALUE 'factcheck';--> statement-breakpoint
ALTER TABLE "remarkable_person" ADD COLUMN "story_childhood_fact" text;--> statement-breakpoint
ALTER TABLE "remarkable_person" ADD COLUMN "fact_check" jsonb;