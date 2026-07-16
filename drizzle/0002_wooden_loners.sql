CREATE TABLE "remarkable_person" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"field" text,
	"country" text,
	"birth_date" text,
	"birth_month_day" text,
	"death_year" text,
	"story_title" text,
	"famous_quote" text,
	"image_url" text,
	"story_childhood_title" text,
	"childhood_image_url" text,
	"story_childhood" text,
	"story_takeaway" text,
	"modern" jsonb,
	"chapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timeline" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"after_treasures" jsonb,
	"treasures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lessons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "remarkable_person_birth_month_day_idx" ON "remarkable_person" USING btree ("birth_month_day");