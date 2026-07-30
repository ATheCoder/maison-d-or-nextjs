CREATE TYPE "public"."analytics_event_type" AS ENUM('section_view', 'content_open', 'content_close', 'nav_select', 'shelf_open', 'collection_view', 'edition_turn', 'story_page_view', 'story_finished', 'session_pause', 'session_resume', 'session_heartbeat', 'reader_switch');--> statement-breakpoint
CREATE TABLE "analytics_event" (
	"id" text PRIMARY KEY NOT NULL,
	"child_id" text NOT NULL,
	"event_type" "analytics_event_type" NOT NULL,
	"section" text,
	"content_type" text,
	"content_id" text,
	"label" text,
	"source" text,
	"edition_date" date,
	"duration_ms" integer,
	"occurred_at" timestamp with time zone NOT NULL,
	"batch_id" text NOT NULL,
	"seq" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_child_id_child_profile_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_event_child_occurred_idx" ON "analytics_event" USING btree ("child_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "analytics_event_child_edition_idx" ON "analytics_event" USING btree ("child_id","edition_date");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_event_batch_seq_idx" ON "analytics_event" USING btree ("batch_id","seq");