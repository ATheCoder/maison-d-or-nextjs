# Daily Gold Admin — Implementation Plan

Companion to `docs/daily-gold-admin-spec.md` (requirements, R-numbers) and the design project
*Daily Gold Admin* (Desk, Day Editor, Almanac Editor, Image Modal). Written in the same shape as
`docs/remarkable-person-editor-plan.md`, and it reuses that phase's machinery wherever it can.

Requirement ids below refer to the spec. Where a phase says **ships**, it means the app is
coherent and useful if you stop there.

---

## Standing decisions

- **Auth**: every server action starts with `requireAdmin()` (`lib/dal.ts`). Server actions are
  open HTTP endpoints — validate every input in the action, as `app/admin/people/actions.ts`
  already does. This is also the fix for today's unauthenticated `saveEnrichedEvent`.
- **The reader never calls AI** (D5). No admin work is allowed to reintroduce a model call on a
  page a child can load, and Phase 1 removes the two that exist.
- **AI is propose → review → accept.** Generation writes into job results or draft rows;
  applying is an explicit act. Only a whole-unit ask onto an empty draft auto-applies, matching
  `generateBook`.
- **Retrieval, not recall** (D7/D10). Factual content is generated with the OpenRouter web
  plugin and stores its `url_citation` annotations. An item without a citation is publishable
  only by hand, never by accepting a proposal.
- **No cost estimates** (R6.5). Units on the ask; the credit balance is the only money on screen.
- **One image modal** (§8.4). No screen grows its own generate/upload/prompt controls.
- **Jobs**: DB rows + Inngest + client polling, exactly as the person editor does. No new queue.
- **Storage**: sharp → webp q82 → R2 under the keys in §8.4, staging→promote so a rejected
  render never destroys a live image (`lib/golden-story/storage.ts` already implements this).
- **Migrations**: `npm run db:generate` then `db:migrate`; `build` runs `drizzle-kit migrate`
  first, so a deploy applies them. Latest is `0019`.

---

## Phase 0 — Decisions taken

All four are settled; nothing below waits on anything.

| # | Decision | What it means for the build |
|---|---|---|
| R7.11 | **Add `draft` to `dg_status`** | `generating` keeps its literal meaning. Prepare writes `draft`, publish writes `ready`, readers filter on `ready` |
| R7.13 | **The legacy On This Day corpus goes entirely** | `on_this_day_event` ends up empty with `raw_text`, `raw_extract`, `researched_from_internet` dropped. All 323 rows, including the 13 "authored" ones — same import, and one is provably mis-filed. `pg_dump` first |
| R7.9 | **No staging table — a candidate is an unpublished row** (D11) | Retrieval writes unpublished `good_news_item` / `greatest_moment` rows. Accepting publishes and repositions; rejecting deletes and renumbers. The ten-item ceiling counts published rows only |
| R4.3 | **The band is rolling and governs generation only** | A published 2007 event stays published as the window moves past it; it just stops being asked about. Coverage is reported against the current twenty years |

---

## Phase 1 — Reader first: gates, the year list, and cutting the AI calls

Deliberately first. It is the smallest phase, it closes a live security hole, and every later
phase would otherwise be built against reader behaviour that is about to change.

**Migration (`0020`)**

- `dg_status` += `draft` (R7.11).
- `good_news_item`: `published` boolean not null default false, plus the provenance columns from
  R7.9 — `source_url`, `source_title`, `source_published_at`, `retrieved_at`, `reviewed_at`.
- `greatest_moment`: the same six columns.
- Backfill `published = true` on both for existing rows — they are live today. Provenance stays
  null: those rows were imported, not retrieved, and pretending otherwise would defeat D10.
- `on_this_day_event`: **empty it and drop the three dead columns** (R7.13). Cleanest as
  `DROP TABLE` + `CREATE TABLE` without `raw_text` / `raw_extract` /
  `researched_from_internet`, since no row is being kept. Add the R7.9 provenance columns here
  too, so all three content types record a citation the same way. **`pg_dump` before this
  migration runs** — 323 rows including 13 usable stories go with it.
- No `news_candidate` table (D11).

**Code**

- `components/dailygold/DGOnThisDay.jsx` — delete the `base44.functions.invoke('enrichHistoricalEvent')`
  call, the `researchEvent` callback and the `saveEnrichedEvent` write-through (D5). Rebuild
  `byYear` as **year → array** in `position` order (R7.12); render a year's events as a list.
- Same file — floor the navigator at `currentYear - 20` (R7.5) and give an unauthored year a real
  empty state that offers the nearest authored year (R7.4).
- `components/dailygold/DGMoreToExplore.jsx` — delete the `generateExploreImage` invoke. Same
  rule, second call site; the cards keep their placeholder treatment until §10 is picked up.
- `app/daily-gold-edition/actions.ts` — delete `saveEnrichedEvent` and its
  `rescueEnrichmentImage` helper. Filter `getGoodNewsForDate` and `getGreatestMomentsForDate` on
  `published`; filter `getEditionByDate` on `status = 'ready'`; filter `getAvailableDates` on all
  three (R7.2) so a draft never becomes a wax seal.
- Optional (R7.10): log `(month_day, year)` on an unauthored-year visit — a counter, no content,
  no model.

**Ships**: the reader renders published content only, shows every event a year holds, has no path
to a model, and the open write endpoint is gone.

---

## Phase 2 — Shared modules (no UI)

- `lib/countries.ts` (R7.6) — one ISO-3166-1 resolver: `resolveCountry(text)`, `resolveNationality(text)`,
  `flagFor(iso2)`, `COUNTRIES` (193 UN states per `docs/flag-seal-spec.md` §4.1). Harvest the three
  hardcoded tables in `DGDestination.jsx`, `DGBornToday.jsx` and the ejected copies, then delete
  them in favour of imports. **Install vitest here** — this module is pure, synchronous, and the
  highest-value testable surface in the feature.
- `lib/daily-gold/prompts.ts` (R7.7, D6) — the oil-painting `STYLE` block (harvest
  `DGMoreToExplore`'s `MASTER_STYLE`, which is the real house style), plus a composition block per
  surface.
- `lib/daily-gold/slots.ts` — the slot descriptor the modal is parameterised by (R6.11):
  `{ key, label, size, placement, treatment, sceneSource }` for `hero`, `destination`,
  `news:<position>`, `history:<year>:<position>`, `moment:<rank>`. Mirrors
  `lib/golden-story/slots.ts`; the Golden Story descriptors move to the same interface so one
  component can serve both.
- `lib/golden-story/openrouter.ts` (R7.8, R7.15) — add `webPlugin()` and a `url_citation`
  annotation parser; **verify `IMAGE_MODEL`** against `GET /api/v1/models` first, since
  `openai/gpt-image-2` is not in the current catalogue and every render would be failing.
- Generalise jobs (R7.1) — migration `0021`: `generation_job.slug` nullable, add
  `subject_kind` (`person` | `edition` | `month_day`) and `subject_key`; keep the FK for
  person rows. Update `lib/golden-story/jobs.ts` signatures and the four Inngest functions to
  take a subject rather than a slug.

**Ships**: nothing visible, but the reader and the person editor now share one country table, and
jobs can belong to a date.

---

## Phase 3 — `country_code` (small, and it proves Phase 2)

- Migration `0022`: nothing — the column landed in `0019`.
- `app/admin/people/actions.ts` — accept `country_code` in `savePerson`, expose it in
  `EditorPerson`/`PersonListItem`, add "no country code" to the completeness badges (R5.3).
- `components/admin/PersonEditor.tsx` — ISO2 picker beside `country`, pre-filled from
  `resolveNationality(country)` and visibly marked **guessed** until confirmed (R5.2).
- `app/daily-gold-edition/actions.ts` — `personToRecord` already emits `country_code`; point
  `DGBornToday`'s `getIso2` at `lib/countries.ts`.
- `scripts/backfill-country-codes.mjs` (R5.4) — unambiguous hits only, leave the rest null.

**Ships**: 37 people get flags that resolve deterministically instead of by string luck.

---

## Phase 4 — The desk (`/admin/daily-gold`)

- `app/admin/daily-gold/page.tsx` + `actions.ts`:
  - `getDeskCoverage()` — one query per content type, grouped: dates with editions (+ status),
    good-news counts and whether position 0 has an image, per-month-day counts of authored
    history / filled ranks / published people. Small tables; no pagination needed.
  - `getWeekAhead(today)` — the seven-day readiness strip (R2.1).
  - `findDuplicateEditions()` — dates with more than one row (R2.6), with the differing fields.
  - `prepareDate(date)` — insert a `draft` edition row if absent, then redirect to the editor.
  - `prepareWeek(from)` — insert drafts for the dates with no row, **skip the rest**, return
    `{ created, skipped }` for the result line (R2.5). One transaction.
- `components/admin/DailyGoldDesk.tsx` — the designed screen: masthead, today's alarm, three stat
  tiles, the week strip, the dates table with the duplicate banner, the 366-cell almanac grid,
  the flag-codes nudge. Credit balance reuses `getOpenRouterCredits`.
- Replace the four dead cards on `app/admin/page.tsx` with a link to the desk.

**Ships**: you can see what a family will see for the next seven days, and create the rows to fix it.

---

## Phase 5 — Day editor, by hand (`/admin/daily-gold/[date]`)

No AI in this phase. Prove the content model works before adding generation.

- `actions.ts`: `getDayForEditor(date)` (edition + good news + the month-day counts for the rail),
  `saveEdition(date, patch)` (validate and clamp every field), `setEditionStatus(date, status)`,
  `getPreflight(date)` (R3.10).
- Good news: `createNewsItem`, `saveNewsItem`, `deleteNewsItem`, `reorderNews(date, ids)` — the
  reorder writes contiguous 0-based positions **in one transaction**, offsetting negative first
  so the unique `(date, position)` index cannot collide mid-update (R3.4). Block adding past ten
  (R3.7).
- `components/admin/DayEditor.tsx` — rail, pane, and the §5.3 affordances: the two-sentence cut
  rendered live, the 2×2 sensory block with its em-dash, lead-versus-row proportions in the news
  list, "reader will use the destination image", "blank = rotation", paragraph count. Image slots
  render as picture-plus-opener with the modal stubbed until Phase 7.
- Autosave with a dirty indicator; prev/next date; publish with the preflight dialog, stating
  that the date joins the navigator.

**Ships**: a day can be authored end to end by hand and published.

---

## Phase 6 — Almanac editor, by hand (`/admin/daily-gold/almanac/[monthDay]`)

- `actions.ts`: `getAlmanacDay(monthDay)` — history events grouped by year across the
  twenty-year band, the ten moment ranks, and the Born Today roster (count, names, published
  state) for the read-only strip (R4.15).
- On This Day: `createEvent(monthDay, year)`, `saveEvent`, `deleteEvent`,
  `reorderYear(monthDay, year, ids)`, `setEventPublished` — the unit is an event, several per
  year (R4.4). Coverage is computed against the band (R4.8).
- Greatest Moments: `saveMoment`, `deleteMoment`, `reorderMoments(monthDay, ranks)` — a swap,
  transactional, because `(month_day, rank)` is unique (R4.12). Rungs open in place and every
  field is editable (R4.20).
- `components/admin/AlmanacEditor.tsx` — blast-radius banner, the Born Today strip, the
  `12 June 2026 →` reverse link (R4.16), the year rail with events nested, the ladder with an
  open rung.

**Ships**: recurring content is authorable, and the two keying schemes have doors both ways.

---

## Phase 7 — The shared image modal

- `components/admin/ImageModal.tsx` — takes a slot descriptor and a subject; holds the picture,
  the treatment toggle (raw ↔ as-a-family-sees-it), the read-only preamble, the editable scene,
  the size, and the verbs (R6.10). Treatments come from `lib/daily-gold/slots.ts` for Daily Gold
  surfaces and from the Golden Story descriptors for book slots, including the multiply
  flat-white rule and the corner-pixel warning on upload.
- Generalise `app/admin/people/imageActions.ts` into `app/admin/imageActions.ts` keyed by
  `(subject_kind, subject_key, slot)` instead of `(slug, file)`. `imageStore.ts`'s
  staging→promote logic is unchanged underneath.
- **Delete `SlotCard`'s inline controls** and point `ImageStatusBoard` rows at the modal (R7.16,
  R6.12). Same for the day editor's and almanac's slots.

**Ships**: every picture in the product — book art included — is edited the same way.

---

## Phase 8 — AI: rewrite, retrieval, asks

- **Per field** (§8.1): reuse `startRewrite` with the generalised job subject. CURRENT beside
  AI-PROPOSES, accept or reject, one field at a time.
- **Retrieval** (§8.3): `lib/daily-gold/retrieve.ts` — one function per content type, each
  returning candidates with citations, source titles and publication dates. Good news is scoped
  to an outlet allowlist and the date window (R3.20); On This Day asks for the band with the
  day's existing events as exclusions (R4.5); moments take a count and exclusions (R4.17, R4.18).
- **Candidates are unpublished rows** (D11, R7.9): retrieval inserts `good_news_item` /
  `greatest_moment` rows with `published = false` and their citations. `acceptCandidate` sets
  `published = true` and **repositions** it into the next free display slot — for news the next
  free `position` ≤ 9, for a moment the next free `rank` ≤ 10 — inside one transaction, because
  both unique indexes are on the ordering column. `rejectCandidate` deletes the row and
  renumbers. Claim-beside-source review, with unverifiable marked rather than hidden (R3.19).
- **The asks** (§8.5): the words-only / words-and-paintings toggle on every whole-unit ask;
  words-only composes and stores each slot's prompt and leaves the slot empty (R6.2). Inngest
  functions per ask kind, staged progress, leave-and-return.
- `Draft this day` in the day editor gets the same toggle and the same job treatment.

**Ships**: everything the spec describes.

---

## Phase 9 — Hardening

- Re-audit every action for `requireAdmin()` and input validation.
- Concurrency on the two transactional reorders; job failure states surfaced per slot.
- Fix the two disagreeing `child_life_story` renderers (former R7.3) and the live row whose story
  says "June 6" under `06-12`.
- Telemetry for flag-resolution misses, so `lib/countries.ts` improves from real data rather than
  from guesses.
- Decide whether the ten-rank ceiling and ten-item news ceiling should be DB constraints rather
  than UI rules.

---

## Order and shippability

1. **Phase 1** alone is worth shipping the day it is written: it closes the open write endpoint
   and stops the reader publishing unreviewed text.
2. **Phases 2–3** are invisible plumbing plus one small visible win (flags that resolve).
3. **Phase 4** makes the problem legible; **5 and 6** make it fixable by hand. At the end of 6
   the product is fully authorable with no AI at all — which is the right place to be before
   spending money on generation.
4. **Phase 7** consolidates images; **8** adds the AI; **9** tidies.

Phases 4–6 depend on 1 and 2 but not on each other, so the desk and the two editors can be built
in whichever order suits. Phase 7 must precede 8, or the asks will grow their own image controls
and the modal stops being shared.

---

## Known risks

| Risk | Where it bites | Mitigation |
|---|---|---|
| `IMAGE_MODEL` is not a live model id (R7.15) | Every render in Phases 7–8 | Verify in Phase 2, before any UI depends on it |
| `POST /images` may return no `usage` block | Nothing, now that estimates are dropped (R6.5) | Ignore; measure from `/credits` only if a future need appears |
| Retrieval returns thin or paywalled results | Good news, some days | "Nothing today" is a first-class outcome (R3.21) |
| Unpublished rows hold ordering values (D11) | Accept and reject in Phases 5 and 8 | Both are transactional repositions, not plain updates; the ten-item ceiling counts published rows only |
| On This Day starts empty after Phase 1 | The reader shows no history at all until Phase 6 or 8 fills a month-day | Expected, and honest — the 13 rows it replaces were unreviewed and one was mis-dated |
| No test runner today | `lib/countries.ts`, the reorder transactions | vitest in Phase 2, table-driven resolver tests |
