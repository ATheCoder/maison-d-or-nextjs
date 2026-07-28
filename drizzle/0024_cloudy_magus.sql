CREATE TYPE "public"."saved_item_type" AS ENUM('person', 'destination', 'news', 'on_this_day', 'greatest_moment', 'taste', 'sound', 'nature', 'phrase');--> statement-breakpoint
CREATE TABLE "saved_item" (
	"id" text PRIMARY KEY NOT NULL,
	"child_id" text NOT NULL,
	"item_type" "saved_item_type" NOT NULL,
	"item_id" text NOT NULL,
	"item_title" text NOT NULL,
	"item_subtitle" text,
	"item_image_url" text,
	"country_code" char(2),
	"country_name" text,
	"edition_date" date,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_item" ADD CONSTRAINT "saved_item_child_id_child_profile_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_item_child_type_item_idx" ON "saved_item" USING btree ("child_id","item_type","item_id");--> statement-breakpoint
CREATE INDEX "saved_item_child_saved_at_idx" ON "saved_item" USING btree ("child_id","saved_at" DESC NULLS LAST);