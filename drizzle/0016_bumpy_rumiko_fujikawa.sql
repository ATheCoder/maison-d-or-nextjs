CREATE TABLE "child_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"display_name" text NOT NULL,
	"birth_year" integer NOT NULL,
	"avatar" text DEFAULT 'sun' NOT NULL,
	"pin_hash" text,
	"pin_attempts" integer DEFAULT 0 NOT NULL,
	"pin_locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_child_profile_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "child_profile" ADD CONSTRAINT "child_profile_family_id_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "child_profile_family_id_idx" ON "child_profile" USING btree ("family_id");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_active_child_profile_id_child_profile_id_fk" FOREIGN KEY ("active_child_profile_id") REFERENCES "public"."child_profile"("id") ON DELETE set null ON UPDATE no action;