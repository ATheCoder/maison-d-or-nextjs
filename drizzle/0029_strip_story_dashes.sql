-- Strip dashes from already-generated Golden Stories. The writer prompt
-- (lib/golden-story/brief.ts WRITER_SYSTEM) now forbids dashes as punctuation
-- in story text; this brings the existing corpus in line with it.
--
-- Rules, mirroring the prompt:
--   "1867–1934"            -> "1867 to 1934"   (year/number ranges read aloud)
--   "word — word"          -> "word, word"     (em/en dash as punctuation)
--   "word - word"          -> "word, word"     (spaced hyphen as punctuation)
--   "well-known"           -> untouched        (real compound words keep hyphens)
-- followed by cleanup so ".,", ",.", a comma opening a line, and trailing
-- spaces left behind by a removed dash don't survive.
--
-- famous_quote is a real person's words and is left verbatim in both tables.
-- story_brief.prompt_overrides is untouched: those are image prompts whose
-- fixed style blocks contain deliberate em dashes.
CREATE FUNCTION pg_temp.dg_strip_dashes(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $fn$
SELECT regexp_replace(
         regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(
                   regexp_replace(t,
                     '(\d)[ ]*[—–―][ ]*(\d)', '\1 to \2', 'g'),
                   '[ ]*[—–―][ ]*', ', ', 'g'),
                 '[ ]+-+[ ]+', ', ', 'g'),
               '([.,;:!?])[ ]*,[ ]*', '\1 ', 'g'),
             ',[ ]*([.!?])', '\1', 'g'),
           '(^|\n),[ ]*', '\1', 'g'),
         '[ ]+(\n|$)', '\1', 'g')
$fn$;--> statement-breakpoint

-- jsonb variant: dashes never occur in JSON syntax itself (and the spaced-
-- hyphen / comma-cleanup patterns cannot match the serialized structure, only
-- text inside string values), so a pass over the serialized form is safe; the
-- cast back to jsonb would abort the transaction if it ever were not.
CREATE FUNCTION pg_temp.dg_strip_dashes_j(j jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $fn$
SELECT pg_temp.dg_strip_dashes(j::text)::jsonb
$fn$;--> statement-breakpoint

UPDATE "remarkable_person" SET
  "story_title"           = pg_temp.dg_strip_dashes("story_title"),
  "story_childhood_title" = pg_temp.dg_strip_dashes("story_childhood_title"),
  "story_childhood"       = pg_temp.dg_strip_dashes("story_childhood"),
  "story_takeaway"        = pg_temp.dg_strip_dashes("story_takeaway"),
  "modern"                = pg_temp.dg_strip_dashes_j("modern"),
  "chapters"              = pg_temp.dg_strip_dashes_j("chapters"),
  "timeline"              = pg_temp.dg_strip_dashes_j("timeline"),
  "after_treasures"       = pg_temp.dg_strip_dashes_j("after_treasures"),
  "treasures"             = pg_temp.dg_strip_dashes_j("treasures"),
  "lessons"               = pg_temp.dg_strip_dashes_j("lessons"),
  "updated_at"            = now()
WHERE concat_ws(' ',
  "story_title", "story_childhood_title", "story_childhood", "story_takeaway",
  "modern"::text, "chapters"::text, "timeline"::text, "after_treasures"::text,
  "treasures"::text, "lessons"::text) ~ '[—–―]|[ ]-+[ ]';--> statement-breakpoint

-- The stored brief feeds field rewrites (its text is shown as CURRENT), so it
-- is cleaned the same way; famous_quote is put back verbatim afterwards.
UPDATE "story_brief" SET
  "brief" = CASE WHEN "brief" ? 'famous_quote'
    THEN jsonb_set(pg_temp.dg_strip_dashes_j("brief"), '{famous_quote}', "brief"->'famous_quote')
    ELSE pg_temp.dg_strip_dashes_j("brief") END,
  "updated_at" = now()
WHERE "brief" IS NOT NULL
  AND ("brief" - 'famous_quote')::text ~ '[—–―]|[ ]-+[ ]';--> statement-breakpoint

DROP FUNCTION pg_temp.dg_strip_dashes_j(jsonb);--> statement-breakpoint
DROP FUNCTION pg_temp.dg_strip_dashes(text);
