CREATE TABLE "on_this_day_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"month_day" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"year" integer NOT NULL,
	"headline" text,
	"story" text,
	"location" text,
	"image_url" text,
	"maison_rewrite_done" boolean DEFAULT false NOT NULL,
	"researched_from_internet" boolean DEFAULT false NOT NULL,
	"raw_text" text,
	"raw_extract" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "on_this_day_event_month_day_idx" ON "on_this_day_event" USING btree ("month_day");--> statement-breakpoint
CREATE INDEX "on_this_day_event_month_day_year_idx" ON "on_this_day_event" USING btree ("month_day","year");--> statement-breakpoint
CREATE UNIQUE INDEX "on_this_day_event_month_day_position_idx" ON "on_this_day_event" USING btree ("month_day","position");