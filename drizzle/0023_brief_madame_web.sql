CREATE TYPE "public"."flag_seal_source" AS ENUM('born_today', 'on_this_day', 'destination', 'good_news');--> statement-breakpoint
CREATE TABLE "flag_seal" (
	"id" text PRIMARY KEY NOT NULL,
	"child_id" text NOT NULL,
	"country_code" char(2) NOT NULL,
	"country_name" text NOT NULL,
	"first_earned_date" date NOT NULL,
	"last_earned_date" date NOT NULL,
	"times_earned" integer DEFAULT 1 NOT NULL,
	"sources" "flag_seal_source"[] DEFAULT '{}' NOT NULL,
	"edition_dates" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flag_seal" ADD CONSTRAINT "flag_seal_child_id_child_profile_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flag_seal_child_country_idx" ON "flag_seal" USING btree ("child_id","country_code");--> statement-breakpoint
CREATE INDEX "flag_seal_child_first_earned_idx" ON "flag_seal" USING btree ("child_id","first_earned_date" DESC NULLS LAST);