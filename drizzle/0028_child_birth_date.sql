-- birth_year → birth_date: a child profile now carries the full birthday.
-- Hand-edited from the generated add/drop so existing rows survive: they only
-- ever knew the year, so they are backfilled to 1 January of it — the date that
-- reproduces the age those profiles were already shown (old age was simply
-- currentYear - birth_year). Guardians can correct it from /family.
ALTER TABLE "child_profile" ADD COLUMN "birth_date" date;--> statement-breakpoint
UPDATE "child_profile" SET "birth_date" = make_date("birth_year", 1, 1);--> statement-breakpoint
ALTER TABLE "child_profile" ALTER COLUMN "birth_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profile" DROP COLUMN "birth_year";
