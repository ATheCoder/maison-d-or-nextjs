CREATE TYPE "public"."dg_status" AS ENUM('generating', 'ready', 'fallback');--> statement-breakpoint
CREATE TABLE "daily_gold_edition" (
	"id" text PRIMARY KEY NOT NULL,
	"edition_date" date NOT NULL,
	"destination_country" text,
	"destination_description" text,
	"destination_image_url" text,
	"taste_of_day" text,
	"sound_of_day" text,
	"nature_detail" text,
	"tiny_phrase" text,
	"tiny_phrase_language" text,
	"tiny_phrase_translation" text,
	"born_today" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"good_news" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"on_this_day" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"greatest_moments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone,
	"status" "dg_status" DEFAULT 'generating' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "daily_gold_edition_edition_date_unique" UNIQUE("edition_date")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
