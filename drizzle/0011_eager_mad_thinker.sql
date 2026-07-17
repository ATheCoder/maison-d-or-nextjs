CREATE TABLE "greatest_moment" (
	"id" serial PRIMARY KEY NOT NULL,
	"month_day" text NOT NULL,
	"rank" integer NOT NULL,
	"year" integer NOT NULL,
	"headline" text,
	"story" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "greatest_moment_month_day_idx" ON "greatest_moment" USING btree ("month_day");--> statement-breakpoint
CREATE UNIQUE INDEX "greatest_moment_month_day_rank_idx" ON "greatest_moment" USING btree ("month_day","rank");