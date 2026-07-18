CREATE TYPE "public"."generation_job_kind" AS ENUM('brief', 'images', 'slot', 'rewrite');--> statement-breakpoint
CREATE TYPE "public"."generation_job_state" AS ENUM('running', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "generation_job" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"kind" "generation_job_kind" NOT NULL,
	"state" "generation_job_state" DEFAULT 'running' NOT NULL,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_brief" (
	"slug" text PRIMARY KEY NOT NULL,
	"brief" jsonb,
	"prompt_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "remarkable_person" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: every existing person is live today, so publish them. New rows
-- keep the column default (false) and are published from the editor.
UPDATE "remarkable_person" SET "published" = true;--> statement-breakpoint
ALTER TABLE "generation_job" ADD CONSTRAINT "generation_job_slug_remarkable_person_slug_fk" FOREIGN KEY ("slug") REFERENCES "public"."remarkable_person"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_brief" ADD CONSTRAINT "story_brief_slug_remarkable_person_slug_fk" FOREIGN KEY ("slug") REFERENCES "public"."remarkable_person"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_job_slug_idx" ON "generation_job" USING btree ("slug");