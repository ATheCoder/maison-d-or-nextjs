ALTER TYPE "public"."generation_job_kind" ADD VALUE 'ask';--> statement-breakpoint
ALTER TABLE "daily_gold_edition" ADD COLUMN "hero_scene" text;--> statement-breakpoint
ALTER TABLE "daily_gold_edition" ADD COLUMN "destination_scene" text;--> statement-breakpoint
ALTER TABLE "good_news_item" ADD COLUMN "image_scene" text;--> statement-breakpoint
ALTER TABLE "greatest_moment" ADD COLUMN "image_scene" text;--> statement-breakpoint
ALTER TABLE "on_this_day_event" ADD COLUMN "image_scene" text;