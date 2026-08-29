-- The Book Edition — a second Golden Story design, read as a scrolling
-- editorial longread (<EditionStory>) beside the leather flip-book
-- (<GoldenStory>). See StoryFormat in src/db/schema.ts.
--
-- story_format: which design a person is READ as. It also decides which writer
--   prompt writes them and which slot table paints them, so it is a property of
--   the book rather than a display toggle. The column DEFAULTS to 'edition' —
--   new people get the new design — and every row that exists today is
--   backfilled 'classic' below, because every one of them was written as a
--   flip-book and the two formats hold different fields.
--
-- famous_quote_attribution: the pull-quote's footer ("Elizabeth, aged twenty
--   one, on the radio from Cape Town, 1947"). The flip-book prints its quote
--   unattributed and leaves this null.
--
-- fun_facts: the Book Edition's "Golden details" cards. Empty for flip-books.
--
-- legacy: the Book Edition's closing dark panel. In this design the legacy page
--   and the page that introduces the treasures are two different rooms, so
--   after_treasures keeps the second and this holds the first.
--
-- No flip-book is converted. There is no honest automatic conversion between
-- the two: the Book Edition asks for six chapters, a headline and figure shape
-- per chapter, figure captions, quote attribution, three fun facts and a
-- separate legacy panel that the flip-book never wrote. A person changes format
-- by being re-generated, which the editor says out loud rather than doing
-- quietly.
--
-- The new jsonb keys the Book Edition adds to existing shapes
-- (Chapter.headline / .figure / .caption, StorySection.headline / .traits,
-- Treasure.action) need no migration: they live inside columns that are already
-- jsonb, and every reader treats them as optional.

ALTER TABLE "remarkable_person" ADD COLUMN "famous_quote_attribution" text;--> statement-breakpoint
ALTER TABLE "remarkable_person" ADD COLUMN "fun_facts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "remarkable_person" ADD COLUMN "legacy" jsonb;--> statement-breakpoint
ALTER TABLE "remarkable_person" ADD COLUMN "story_format" text DEFAULT 'edition' NOT NULL;--> statement-breakpoint
-- Every person that exists today was written as a flip-book.
UPDATE "remarkable_person" SET "story_format" = 'classic';
