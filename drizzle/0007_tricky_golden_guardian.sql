CREATE TABLE "good_news_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"headline" text NOT NULL,
	"description" text,
	"location" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "good_news_item_date_idx" ON "good_news_item" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "good_news_item_date_position_idx" ON "good_news_item" USING btree ("date","position");