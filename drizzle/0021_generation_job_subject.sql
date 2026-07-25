--> Generalise generation_job to a polymorphic subject (R7.1). Nothing in the
--> Daily Gold AI phases works until a job row can belong to a date or a
--> month-day rather than only to a person's slug.

CREATE TYPE "public"."generation_job_subject" AS ENUM('person', 'edition', 'month_day');--> statement-breakpoint

--> `slug` stays, nullable, purely to keep the cascade-on-delete FK that a
--> polymorphic key cannot express. For a person job it mirrors subject_key.
ALTER TABLE "generation_job" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint

ALTER TABLE "generation_job" ADD COLUMN "subject_kind" "generation_job_subject" DEFAULT 'person' NOT NULL;--> statement-breakpoint

--> Added nullable, backfilled, then constrained: every existing job is a person
--> job whose slug is its subject key. A plain `ADD COLUMN ... NOT NULL` fails
--> against the rows already in the table.
ALTER TABLE "generation_job" ADD COLUMN "subject_key" text;--> statement-breakpoint
UPDATE "generation_job" SET "subject_key" = "slug" WHERE "subject_key" IS NULL;--> statement-breakpoint
ALTER TABLE "generation_job" ALTER COLUMN "subject_key" SET NOT NULL;--> statement-breakpoint

CREATE INDEX "generation_job_subject_idx" ON "generation_job" USING btree ("subject_kind","subject_key");