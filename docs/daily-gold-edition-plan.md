# Daily Gold Edition — architecture decision & implementation plan

**Status:** decided, not yet implemented
**Owner:** Arash
**Context files:**
- Reader page: `components/dailygold/DailyGoldEditionPage.jsx`
- Reader server actions: `app/daily-gold-edition/actions.ts`
- Route: `app/daily-gold-edition/page.tsx`
- Section admin (existing, model to copy): `components/admin/PersonEditor.tsx`, `app/admin/people/`
- Schema: `src/db/schema.ts`

---

## The question

The admin can currently author **remarkable people** (Born Today). We want the
other sections to become authorable too, so a day's page fills in. Two framings
were on the table:

- **Option A — monolithic edition:** author every section at once into a single
  "finished edition" object, then display it.
- **Option B — per-section presence:** the page shows whatever each section has
  for the current date, falling back when something is missing.

The worry with B was that **different parts of the page would show different
dates**, which is undesirable (incoherent, confusing for children).

## The decision

**Take a refined Option B: single masthead date, per-section presence, _no
cross-date fallback_.** Do **not** build a monolithic edition object.

Rule the whole page obeys:

> The page always declares **one** date (today). Every section shows either
> today's content or nothing. It never borrows another day's content to fill a
> gap.

### Why this is correct (the schema already decided it)

The five sections are two different natures, keyed differently in `actions.ts`:

| Section | Table | Keyed by | Nature |
|---|---|---|---|
| Destination / tiny phrase / taste | `dailyGoldEdition` | exact `edition_date` | **date-pinned** |
| Good News | `goodNewsItem` | exact `date` | **date-pinned** |
| Born Today | `remarkablePerson` | `MM-DD` of birth + `published` | **evergreen (day-of-year)** |
| On This Day | `onThisDayEvent` | `month_day` | **evergreen (day-of-year)** |
| Greatest Moments | `greatestMoment` | `month_day` | **evergreen (day-of-year)** |

- The three **evergreen** sections represent "what happened on **this day of the
  year** across history." They are always correct for today and can *never*
  cause a date mismatch — they aren't tied to a calendar edition.
- Only the two **date-pinned** sections can cause a mismatch, and only if we
  deliberately fall back to another date's content. That fallback is the single
  thing to remove.

### Why not Option A

Option A fights the existing schema (five tables, two keying strategies) and
forces every section's editor to be built before anything can publish
coherently. The existing pattern — one focused editor per entity, like
`PersonEditor` — is the right one to continue. The reader page assembles the
sections; the admin never needs a god-object.

---

## No redesign required

The vertical layout (Hero → Born Today → three-column → Destination → …) is kept
as-is. The only genuinely new *visual* work is **empty-state design for the two
date-pinned sections** (Hero + Destination) on a day with no edition. The
evergreen sections likely already handle empty arrays gracefully — verify before
designing anything for them.

### Step 0 (do this first, before writing empty states)

Audit each `DG*` component's behavior when its data is empty, by pointing the
page at a date that has no `dailyGoldEdition` row and no good-news rows:

- `DGHero` — currently shows a hero image or nothing; confirm what an absent
  edition looks like.
- `DGDestination` — currently fed `SAMPLE_EDITION` (Kyoto) on empty; will look
  broken/misleading once the sample is removed.
- `DGGoodNews`, `DGBornToday`, `DGOnThisDay`, `DGGreatestMoments` — check the
  empty-array branch of each. Note which already hide/degrade vs. which render an
  ugly empty shell.

Output of Step 0: a short list of exactly which sections need an empty state
designed. Likely just Hero + Destination.

### Step 0 results (audited 2026-07-25) — **DONE**

Method: today (2026-07-25) is genuinely empty in the DB, so no fixture was
needed. All content clusters on 2026-06-06…06-12 (7 distinct edition dates,
good news on the same dates, `on_this_day_event` for 7 month-days,
`greatest_moment` for 4, and none of the 33 published people born 07-25). Each
section was rendered through a throwaway probe route holding a blank edition row
plus four empty arrays, then deleted.

**Live confirmation the problem is real, not theoretical:** `/daily-gold-edition`
right now shows the masthead "Saturday, 25 July 2026", the navigator "Friday,
12 June 2026", and Born on This Day listing people born 12 June under the copy
"7 remarkable people share today with you". Two dates on one page.

**Needs an empty state designed — one section only:**

- **`DGDestination`** — the guard `if (!dest) return null` (line 310) never fires,
  because `mapRecord` always builds a `destination` object. With nothing authored
  it renders the full shell: a 20%-opacity 🌍 on a gradient, an *empty* `<h3>`,
  the "Where in the World" label, and all four detail cards reading `—` — each
  with a live `SaveHeartSeal` that would save an item literally titled `—`.

**Already graceful — leave alone:**

- **`DGHero`** — *the plan's assumption here was wrong.* Every element is static
  (date, wordmark, fixed subtitle and quote) and the `!imgUrl` branch (lines
  199–201) is already a designed gradient. It looks finished and intentional with
  no edition. **No work needed.**
- **`DGGoodNews`** — `if (!items.length) return null` (line 184).
- **`DGBornToday`** — `if (!people.length) return null` (line 261).
- **`DGOnThisDay`** — no length guard, but it is a year navigator that is
  meaningful on any date; the per-year miss reads "No record found for 2026 — try
  another year." (lines 300–306).
- **`DGGreatestMoments`** — already has a designed empty branch (lines 120–142).
  Two optional nits: "Preparing the greatest moments…" promises an arrival that
  may never come, and the heading drops the date ("Greatest Moments" vs
  "Greatest Moments on 25 July").
- **`DGInspirationBar`** (day-of-year quote fallback) and **`DGForParents`**
  (`'World Journey'` fallback) — both fine.

### Two defects the plan did not anticipate

**A. Step 1 is incomplete as written — it would blank the evergreen sections.**
`app/daily-gold-edition/page.tsx:19-26` gates *all four* evergreen fetches on
`initialEdition` being truthy, returning `[[], [], [], []]` otherwise. So the
moment `getInitialEdition` stops falling back, every evergreen section goes empty
on any day without an edition row — the exact opposite of this document's core
rule. **Step 1 must also change `page.tsx` to fetch the four evergreen sets from
`todayStr` unconditionally.** This blocks the Step 4 coherence check.

**B. `DGWaxSealNavigator` misreports the date and strands the newest edition.**
When `currentDate` is not in the edition list, `currentIndex` falls back to
`dates.length - 1` (line 122). On an empty today that labels the page
"Edition 7 of 7" beside "25 July 2026" — claiming today *is* the 12 June
edition. Worse, since `currentIndex` is already the last index, `canGoForward` is
false while `canGoBack` steps to index 5 (11 June), making the newest edition
(12 June) **unreachable**. Needs a genuine not-in-list state: index past the end,
hide the count, and let "back" reach the latest edition.

---

## Implementation steps

### 1. Kill cross-date fallback in the data layer — **DONE**
- `getInitialEdition()` was a one-caller wrapper that became a pure alias of
  `getEditionByDate()` once the fallback died, so it was removed; `page.tsx` now
  calls `getEditionByDate(todayStr)` directly. `getLatestEdition()` is kept (no
  current callers) with a comment saying why it must not be the reader's
  fallback.
- Also, per Step 0 finding A, `page.tsx` now fetches the four evergreen sets
  from `todayStr` **unconditionally**, in one `Promise.all` with the edition —
  previously they were gated on the edition existing, which would have blanked
  them on exactly the days this change creates.

### 2. Remove the sample masking in the reader — **DONE**
`components/dailygold/DailyGoldEditionPage.jsx`:
- `SAMPLE_EDITION` (Kyoto) replaced by `EMPTY_EDITION`, an explicit absent state
  with `destination: null`.
- `mapRecord` now only builds a `destination` when at least one destination field
  is authored, so a half-authored edition row also yields absence rather than the
  em-dash shell from Step 0 finding 1. (`DGDestination`'s existing
  `if (!dest) return null` then does the right thing, which is why Step 3 has no
  Destination work left unless a *visible* placeholder is wanted.)
- Stray `console.log(initialEdition)` removed.

### 2b. Navigator not-in-list state (Step 0 finding B) — **DONE**
`DGWaxSealNavigator.jsx`: added `indexForDate()`, which puts a date with no
edition one *past* the end of the list instead of on the last edition. Today now
shows no "Edition n of n" line, and stepping back reaches the newest edition
(12 June) instead of skipping it. Verified in the browser.

### 3. Add graceful empty states (only where Step 0 says they're needed)
- `DGHero` (rendered line 373): design a "no destination yet today" hero — the
  masthead date stays, the imagery falls back to a calm branded placeholder
  rather than a stale/empty image.
- `DGDestination` (rendered line 416): when `edition.destination` has no
  content, render a quiet child-friendly placeholder (e.g. "Tomorrow we travel
  somewhere new ✦") instead of the section.
- For any evergreen section that Step 0 flagged, add a matching quiet empty
  state; otherwise leave them.

### 4. Verify coherence
- On a fully-empty day: masthead shows today, evergreen sections show today's
  day-of-year content (or their own quiet empty states), date-pinned sections
  show placeholders. Nothing anywhere shows a *different* date.
- On a partially-authored day: only the authored date-pinned sections appear;
  the rest are quiet placeholders. Still one coherent date.
- Day navigator (`DGWaxSealNavigator`) still works: navigating to a past edition
  date re-fetches per-section content for that date via the existing
  `handleEditionChange` handler (lines 179–200) — no change needed, but confirm
  it doesn't reintroduce a fallback.

**Verified on an empty day (2026-07-25, steps 1/2/2b applied):** masthead, wax-seal
navigator and footer all read 25 July; Born Today, Good News and Destination are
absent; On This Day shows "No record found for 2026"; Greatest Moments shows its
own placeholder. No section shows another date. Console clean, `tsc` clean, lint
unchanged (7 pre-existing errors before and after).

### Decision: masthead and navigator mean different things — **not** redundant

Arash, 2026-07-25: keep both as they are. The masthead pill always states the
real today; the navigator states the day you are currently reading. They are two
different facts, so the "make the masthead follow `viewedDate`" idea below is
**rejected** — recorded here so it isn't re-raised as a bug.

One consequence to keep in mind: while browsing the archive, Born Today's copy
("…share today with you") is speaking about the *viewed* day, not the masthead's
today. Reads fine in practice; noted in case it ever grates.

### Feature: navigate to any day that has content — **DONE**

The navigator's list came from `daily_gold_edition` alone, so a day whose only
content was a Golden Story could not be opened. Three published people were
stranded: **Einstein (03-14), Leonardo (04-15), Rembrandt (07-15)** — reachable
at `/stories/<slug>` but not as days.

`getEditionDates()` is replaced by **`getAvailableDates()`**, a union of three
sources (chosen by Arash):
- `dailyGoldEdition.editionDate` and `goodNewsItem.date` — pinned to real dates;
- published `remarkablePerson` birth month-days, resolved by
  `mostRecentOccurrence()` (this year if the month-day has passed, else last
  year; 29 Feb steps back to the most recent leap year).

`onThisDayEvent` and `greatestMoment` are excluded **on purpose**: they are
backfilled per month-day, so counting them would eventually mark all 366 dates
available and the navigator would stop showing where the work is. They still
render normally once you land on a day.

Two changes this forced:
- `DGWaxSealNavigator` previously called `onEditionChange` *only if* an edition
  row came back, which would have left the previous day's content sitting under
  the new date. It now always notifies, as `onEditionChange(record, date)` with
  the date as the authority; `handleEditionChange` falls back to
  `EMPTY_EDITION` when `record` is null.
- The counter read "Edition n of n", which is false on a day with no edition row.
  It now reads **"Day n of n"**. Rename freely — it counts days in the list.

Verified: the list is exactly the 10 expected days; one step back from today
lands on 15 July and shows Rembrandt with no stale edition imagery; 12 June still
loads its full edition (Faroe Islands, 7 people, "Day 9 of 10").

### ~~Open issue found during verification — the masthead does not follow the navigator~~ (rejected, see decision above)

`DGHero` is passed `dateStr={dateLabel}`, and `dateLabel` (plus the footer date,
~line 518) is computed from `new Date()` rather than from `viewedDate`. So
**browsing the archive reproduces the two-date page**: stepping back to 12 June
leaves the masthead reading "Saturday, 25 July 2026" above the navigator's
"Friday, 12 June 2026" and June-born people captioned "share today with you".

This is pre-existing and on the archive path, so steps 1–2 do not touch it, but it
contradicts the document's central rule. The fix is to derive one
`viewedDateLabel` from `viewedDate` and use it for the hero and the footer — which
also decides a product question: an archived day should present as *that day's*
edition, not as today's page showing old content. Recommended, not yet done.

### Still to do
- **Step 3** — empty states, now a smaller job than written: Hero needs nothing,
  Destination is absent rather than broken. Only outstanding item is whether a
  *visible* "somewhere new tomorrow ✦" placeholder is wanted in Destination's
  place, plus the two optional Greatest Moments copy nits from Step 0.
- The three-column grid (`repeat(3, 1fr)`) does not reflow when Good News is
  absent, leaving an empty third column and a wide gap on an empty day. Now more
  visible, since person-only days (15 July) have two of three columns empty.
- Unrelated: the greeting strip's "My Book" links to `/assessments/goldprint`,
  which is not a route in this app.

---

## Next feature after this
Build the next per-section editor (recommended: **Good News**, since it's
date-pinned and simple) modeled on `PersonEditor.tsx` / `app/admin/people/`.
Each new editor makes its section start appearing on the reader with no further
reader-side work — that's the payoff of this architecture.
