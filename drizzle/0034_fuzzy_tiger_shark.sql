-- The pencil hand — a second art style for a Golden Story, drawn in graphite on
-- the page rather than printed as painted plates. See ArtStyle in
-- src/db/schema.ts and EDITION_PENCIL_STYLE in lib/golden-story/prompts.ts.
--
-- art_style: which medium a person's pictures are RENDERED in. Orthogonal to
--   story_format, which decides the book's shape: a Book Edition can be painted
--   or drawn and holds the same text either way. That is also why this column,
--   unlike story_format, may be changed after creation — it costs a re-render
--   of the art and nothing written.
--
-- No backfill: the column defaults to 'painted', which is the style every
-- existing person's art was generated in, so every row is already correct.

ALTER TABLE "remarkable_person" ADD COLUMN "art_style" text DEFAULT 'painted' NOT NULL;
