# Daily Gold Admin — Specification (v1)

Companion to `docs/remarkable-person-editor-spec.md`, whose §7 already decided this:
*"Editing the other Daily Gold content types (good news, on-this-day, greatest moments) —
same admin shell, separate editors, later phases."* This is those phases, plus the edition
row itself and the `country_code` field.

---

## 1. What this is

The admin surface for everything `/daily-gold-edition` renders except Golden Stories, which
already have an editor. Four tables and one field:

| Content | Table | Today's entry path |
|---|---|---|
| The edition (masthead, destination, sensory trio, tiny phrase, daily quote) | `daily_gold_edition` | `scripts/import-daily-gold.mjs` only |
| Good News of the Day | `good_news_item` | `scripts/migrate-good-news.mjs` only |
| On This Day | `on_this_day_event` | backfill script + **a child browsing the page** (§2.6) |
| Greatest Moments | `greatest_moment` | `scripts/migrate-greatest-moments.mjs` only |
| A person's flag code | `remarkable_person.country_code` | nothing — column added, never populated |

All six columns behind the previously-dead fields (`hero_image_url`, `continent`,
`child_life_story`, `daily_quote`, `daily_quote_author`, `country_code`) exist as of
migration `0019`. Nothing writes them yet.

**Users**: one admin (the site owner), desktop, self-hosted. No multi-admin concerns.

---

## 2. What the reader does with the data

Every requirement below descends from an observable behaviour of the reader. These are the
rules the admin UI has to make obvious, because none of them are guessable from a form.

### 2.1 Two keying schemes, one page

The page looks like one day, but it is assembled from two different kinds of content:

| Keyed by exact date (`YYYY-MM-DD`) — perishable | Keyed by month-day (`MM-DD`) — recurring forever |
|---|---|
| `daily_gold_edition`, `good_news_item` | `on_this_day_event`, `greatest_moment`, `remarkable_person.birth_date` |

Editing 25 July's Greatest Moments changes what a family sees on 25 July **every year**.
Editing 25 July's Good News changes one day in 2026. Conflating these two in a single form
is the primary way this admin surface could mislead its user, and the page split in §4–§6
exists to prevent it.

### 2.2 Absence is a designed state, never a gap to fill

`app/daily-gold-edition/page.tsx:13-18` is explicit: the page declares one date and shows
that date's content or nothing — it never borrows another day's. Each section returns null
when empty (`DGGoodNews.jsx:184`, `DGBornToday.jsx:261`, `DGDestination.jsx:310`,
`mapRecord`'s `hasDestination` at `DailyGoldEditionPage.jsx:71`).

So the admin UI must report *what a family will actually see*, and treat "absent" as a
legitimate outcome — not badge every unfilled field as an error. The one exception is a
**partly** filled destination: `DETAIL_CARDS.map` always renders all four sensory cards and
`DetailCard` falls back to `'—'` (`DGDestination.jsx:149`), so three em-dash cards is a real
failure mode the editor must warn about.

### 2.3 Position and rank are editorial

- **Good news**: item at position 0 is the lead — large card with image; positions 1–9 are
  compact rows; anything past 10 never renders (`DGGoodNews.jsx:187,251`).
- **Greatest moments**: `rank` is the display order, 1–10 (`DGGreatestMoments.jsx:158`).
- **On this day**: a month-day holds **many events per year**, ordered by `position` — that is
  the intent, and the table supports it. **The reader does not.** `DGOnThisDay.jsx:104-108`
  builds a map keyed by year and keeps the *first* qualifying row (`m[ev.year] == null`), so
  every event after the first in a year is invisible. See R7.12 — this is a reader defect
  against the content model, not a constraint to design around.

Each of these has a unique index (`good_news_item_date_position_idx`,
`greatest_moment_month_day_rank_idx`, `on_this_day_event_month_day_position_idx`), so
reordering is a transactional operation, not a series of independent updates.

### 2.4 Three text fields quietly earn flag seals

`destination_country`, `on_this_day_event.location` and `good_news_item.location` are run
through hardcoded name→ISO2 tables (`DGDestination.jsx:8`, `DGBornToday.jsx:41`) and, on a
hit, award a child a flag seal. A miss costs the child a collectible and shows nothing.

Live data: **0 of 52** good news rows have a location. `docs/flag-seal-spec.md` R6.8 already
flags this. Every location-ish field in this admin therefore needs a live resolution
indicator, not a plain text input.

### 2.5 Nothing has a draft gate

`daily_gold_edition.status` exists (`generating` / `ready` / `fallback`) and **no reader
filters on it**. `good_news_item`, `greatest_moment` have no gate at all. Worse,
`getAvailableDates()` (`actions.ts:349`) lists any date with an edition row *or* a good-news
row, so a half-written day becomes a wax seal in the reader's navigator the moment the first
row is inserted. Every save is instantly public.

`on_this_day_event` is the accidental exception: `maison_rewrite_done` already behaves as a
publish flag, because the reader requires it.

### 2.6 The reader currently authors content, and the old corpus is not a queue

`DGOnThisDay.jsx:145` calls Base44's `enrichHistoricalEvent` when a child navigates to a year
with no authored row, then writes the result into our table via `saveEnrichedEvent`
(`actions.ts:280`), which stamps `maison_rewrite_done = true` — the reader's only publish gate.
**Unreviewed AI text becomes permanent content because a child scrolled**, and
`saveEnrichedEvent` carries no auth check, so the write is open to anyone who can load the
page. D5 deletes both halves: the reader is a renderer, not an author.

**`raw_text` / `raw_extract` are not part of the workflow.** They arrived with the Base44
backfill, no reader ever displays them (`onThisDayToRecord` omits them by design), and with D5
deleting the enrichment call nothing consumes them at all. The 310 un-authored rows they sit on
are **a legacy import, not a work queue** — the editor must not present them as one, and an
earlier draft of this spec was wrong to build a triage screen around them (R7.13).

What that corpus does still prove is *why the prompt and the review matter*. Left to the raw
record, 12 June offers a plane crash, a fire that killed fifty people, and the start of a war.
Nothing filters that except the instruction given to the model and the person reading its
output — which is why suitability lives in both (R4.7), and why "no event this year" has to be
an ordinary outcome rather than an unfinished task.

### 2.7 Coverage today

| | Rows | Covered |
|---|---|---|
| Editions | 8 | 7 dates, 2026-06-06 → 06-12 — **2026-06-06 has two rows** (§3 D3) |
| Good news | 52 | same 7 dates (4/day then 10/day), all with images, **0 with location** |
| On this day | 323 | 7 month-days, 13 authored — **all 323 are being deleted** (R7.13); the table starts empty under the twenty-year model |
| Greatest moments | 40 | 4 month-days, exactly 10 each |
| People | 37 | **0 with `country_code`** |

Today is 2026-07-25. The newest edition is six weeks old, so the live page currently renders
a masthead, Born Today, and nothing else. "Get today ready" is the admin's actual job, and
the desk (§4) is designed around it.

---

## 3. Decisions taken

| # | Decision | Rationale |
|---|---|---|
| D1 | **Three routes**, not one editor and not five: a desk (`/admin/daily-gold`), a day editor (`/admin/daily-gold/[date]`), an almanac editor (`/admin/daily-gold/almanac/[monthDay]`) | The date/month-day split in §2.1 is a difference in blast radius, so it gets a page boundary. The desk exists because the admin's question is "is tomorrow ready?", which no single-record editor answers |
| D2 | The edition row and its good-news list share **one** editor | Both are keyed to the same date and render side by side; "make 26 July complete" is one unit of work |
| D3 | One edition row per date, enforced by the admin as an upsert | The table permits duplicates and readers silently take the newest by `createdAt`; 2026-06-06 already has two rows. The desk surfaces existing duplicates for merging |
| D4 | A publish gate per content type, and `getAvailableDates` honours it | §2.5. `status` is the edition's gate: `draft` (a new value — R7.11) versus `ready` = live. Add `published` to `good_news_item` and `greatest_moment`; `on_this_day_event` keeps `maison_rewrite_done` |
| D11 | **A proposal is an unpublished row**, in all three tables — not a staging area of its own | It falls out of D4: the gate already distinguishes what a family sees from what only you see, so a retrieved candidate needs no second mechanism. One row shape, one editor, one delete; accepting a proposal is flipping a flag and taking a display slot, not copying a record between tables |
| D5 | **The reader never calls AI. Generation is an admin action only.** `DGOnThisDay`'s `enrichHistoricalEvent` call and the `saveEnrichedEvent` write-through are both deleted; the reader renders authored content or an empty state | §2.6. This is a rule about the whole product, not a fix to one component: reading is rendering, authoring happens behind `requireAdmin()`. It removes the unreviewed-publish path, the unauthenticated write endpoint, the child-driven spend, and one of the last live Base44 call sites in a single change. Needs the empty-year state designed — R7.4 |
| D6 | A **Daily Gold** prompt style block, separate from the Golden Story one | `lib/golden-story/prompts.ts` `STYLE` is watercolour-and-ink storybook; the Daily Gold surfaces are oil painting (`DGMoreToExplore.jsx` `MASTER_STYLE`). Mixing them makes a day look assembled from two products |
| D7 | The AI **retrieves its own sources**; the admin never supplies one. Grounding is web search with stored citations, not the admin's clipboard | No training corpus contains a dated event from this week, so ungrounded generation of "today's good news" is confabulation by construction. OpenRouter already supports retrieval on the existing key — `plugins: [{ id: 'web' }]`, or an `:online` model suffix — and returns `url_citation` annotations (url, title, content). Search bills per request and the rate depends on the engine — the Exa plugin is $0.005, while `anthropic/claude-opus-4.8` carries `pricing.web_search: 0.01` for its native engine (both read live, not assumed — R6.5). That satisfies "the AI gets all the data" without giving up checkability |
| D10 | Every retrieved item **stores its citations**, and the review panel shows each claim beside its source | This is what makes "the admin reviews for accuracy" a real check rather than a rubber stamp. Without a source there is nothing to verify against, and a fluent wrong answer reads exactly like a right one |
| D8 | Reuse the person editor's machinery: `generation_job` + Inngest + `requireAdmin` + staging→promote images + the CURRENT/AI-PROPOSES review idiom | Established, and the admin already knows the interaction. `generation_job` needs generalising first — R7.1 |
| D9 | **No live reader preview.** Field-level affordances instead (§5.3), plus in-place image previews under their real treatment | The person editor's preview earned its place because a storybook leaf is a fixed-size page with layout hints, stanza breaks and multiply blends — there, layout *is* the content and overflow is invisible in a form. Daily Gold is short fields in cards: every failure mode a preview would catch is enumerable, and each has a cheaper and more legible inline equivalent. Mounting the reader's client tree with draft props would also drag in its Base44 fetches, theme provider, navigator and animations for no editorial gain |

---

## 4. Page A — the desk (`/admin/daily-gold`)

Replaces the four dead cards on `app/admin/page.tsx`. Its job is to answer "what is missing,
and what is missing *soonest*".

| # | Requirement |
|---|---|
| R2.1 | **Readiness strip** for today → +7 days, in the reader's own terms: for each date, is there a live edition, how many good-news items, how many published people born that month-day, how many On This Day years, how many of the 10 moment ranks. Today being empty is the loudest thing on the screen |
| R2.2 | **Date table** (perishable content) — one row per date with destination name, draft/live pill, good-news count with a flag if the lead has no image, and a link straight to the day editor. Filters: incomplete only, month jump, next-7-days |
| R2.3 | **Almanac grid** (recurring content) — 366 cells, each showing On This Day authored-year count, moments filled (n/10) and people born. This is the "what should I work on next?" tool, mirroring the people library's calendar coverage |
| R2.4 | Per-cell and per-row pills are **links**, each landing on the right editor and section — never a generic dashboard-to-form hop |
| R2.5 | **Prepare creates a row; it never generates.** One date: insert a draft edition row and open its day editor. **Prepare the next 7 days**: insert a draft for each of the seven dates that has no edition row, **skip the ones that do** (D3 — a second row for a date silently shadows the first, which is the 6 June defect this same screen reports), stay on the desk, and say what happened: *"6 drafts created — 27 July already had one."* Generation is a separate act, per day, inside the day editor (§8.2) where its cost is visible |
| R2.6 | **Duplicate-edition warning** with a merge/delete path (2026-06-06 today), since the reader silently picks one row and the admin cannot otherwise tell |
| R2.7 | OpenRouter credit balance in the top bar, as `getOpenRouterCredits` already provides for the person editor — cost visibility before any batch generation |
| R2.8 | Never present absence as failure for historical dates. Distinguish *"tomorrow has no edition"* (urgent) from *"1 March 2026 has no edition"* (a fact about the past) |

---

## 5. Page B — the day editor (`/admin/daily-gold/[date]`)

Two panes: section rail → editing panel. **No preview of the reader page** (D9); the reader's
rules are surfaced field by field instead, per §5.3.

### 5.1 The edition fields

| Field | What the reader does with it — the constraint | Entry |
|---|---|---|
| `hero_image_url` | Full-bleed masthead behind the title: 0.75 opacity, radial mask, cream wash, 40s Ken Burns (`DGHero.jsx`). Needs a wide, calm, centre-weighted painting that survives being written over. **Empty silently falls back to the destination image** (`DailyGoldEditionPage.jsx:349`) | AI (landscape, D6 style) or upload; the editor must state which image the reader will actually use |
| `destination_country` | Free text like "Lisbon, Portugal". The reader splits on the comma for display and resolves ISO2 for the flag seal | Text + live parse preview ("Lisbon" · resolves to 🇵🇹 PT) |
| `continent` | Renders ahead of the name in the modal header — "Europe · Lisbon" | Select of seven |
| `destination_description` | **Truncated to two sentences** on the card (`DGDestination.jsx:385`), shown whole in the modal | Textarea showing both renderings; write the first two sentences to stand alone |
| `destination_image_url` | Card at 180px and modal at 340px, both under a bottom gradient | AI or upload, landscape, subject centre-low |
| `child_life_story` | The "A Child in X" modal. Paragraphs split on blank lines | Textarea. Note the two renderers disagree — the page modal splits paragraphs, `DGDestination`'s renders one block (R7.3) |
| `taste_of_day`, `sound_of_day`, `nature_detail` | 2×2 emoji cards, no description, ~4–8 words each. **Any one left empty renders `'—'`** (§2.2) | Three short inputs, filled or cleared together, with the em-dash warning |
| `tiny_phrase` + `_language` + `_translation` | Fourth card: word, language in the label, translation in italics beneath | Three fields; the language is the destination's, not English |
| `daily_quote` + `daily_quote_author` | `DGInspirationBar`; **absent is fine** — the bar rotates ten curated quotes | Optional pair, stating that blank = rotation. Warn on repeats of the rotation or of recent days |
| `status` | Nothing reads it today; becomes the draft gate (D4) | Draft/Live toggle with a preflight checklist |
| `generated_at` | Provenance, not a publish time | Stamped by AI generation; read-only |

### 5.2 Good news

| # | Requirement |
|---|---|
| R3.1 | Ordered list of up to 10, with **position 0 visually marked as the lead** — it gets the large card and its missing image is a real defect, unlike row 9's |
| R3.2 | Per item: `headline` (required — `notNull`), `description` (teaser is its first sentence in the list, full text in the modal), `location`, `image_url` |
| R3.3 | `location` is a **flag-earning** field (§2.4): resolution indicator, and a nudge because 0 of 52 existing rows have one |
| R3.4 | Drag to reorder, writing contiguous 0-based positions in one transaction — the unique `(date, position)` index collides on naive sequential updates |
| R3.5 | Add / remove / duplicate an item; removal renumbers |
| R3.6 | **Retrieved candidates, not a blank form.** "Find good news for this date" runs a web-search pass and writes 6–8 candidates as **unpublished `good_news_item` rows** (D11), each carrying its citations, source title and the source's publication date. Accepting one publishes it and gives it the next free display position 0–9; rejecting deletes it. The rewrite for ages 5–10 is a second step against the chosen article (§8.3) |
| R3.7 | Items beyond 10 are unreachable — block or warn, don't let an admin write into a void |
| R3.19 | Every item shows **claim beside source**: the rewritten copy, the citation list, and a one-click link out. An item whose citations were dropped is marked unverifiable, not merely unreviewed (D10) |
| R3.20 | Search is scoped to a **curated outlet allowlist** (`include_domains`) and to the edition's **date window**. Flag any candidate whose source publication date is far from the edition date — a 2019 feel-good story presented as today's news is the most likely failure |
| R3.21 | **"Nothing today" is an acceptable result.** If retrieval finds nothing real and suitable, the admin publishes the day without a good-news column rather than letting the model fill the gap — §2.2 already makes absence legitimate |

### 5.3 Instead of a page preview

Each reader rule that a preview would have revealed gets an affordance attached to the field
that causes it. These are labelled echoes inside the form — a truncated string, one card
block, a flag chip — not the reader page rendered with draft data.

| # | Reader rule | Affordance |
|---|---|---|
| R3.12 | Card text is cut to two sentences | The cut string rendered live beneath the textarea, so the admin sees exactly the sentence pair a family gets |
| R3.13 | All four sensory cards always render; empty ones show `'—'` | The 2×2 block drawn at size — four short fields is cheap to draw, and the em-dashes are the warning |
| R3.14 | Good news position 0 is the lead | The list itself renders row 0 at lead proportions and 1–9 as compact rows; hierarchy is the list, not a separate panel |
| R3.15 | Images sit under destructive treatments | **The carve-out.** The hero applies a radial mask and a 0.75-opacity cream wash; the destination card sits under a bottom gradient. An image that reads well as a thumbnail can die under either, so the slot shows the **treated** version — what a family sees — and the raw file is one toggle away inside the modal (§8.4). Per surface, never per page |
| R3.16 | Empty hero falls back to the destination image | A line naming which URL the reader will use |
| R3.17 | Blank quote means the curated rotation | Stated at the field, so blank reads as a choice |
| R3.18 | `child_life_story` splits on blank lines | Paragraph count beside the textarea |

### 5.4 Saving

| # | Requirement |
|---|---|
| R3.8 | Autosave with a visible saved/dirty indicator; long prose survives navigation and generation jobs (person editor §5) |
| R3.9 | Publishing states its consequence plainly: this date joins the reader's wax-seal navigator |
| R3.10 | Preflight before publish: no hero image, unresolved destination country, partial sensory trio, lead without an image, quote without an author |
| R3.11 | Previous/next date navigation from inside the editor — the work is repetitive by nature |

---

## 6. Page C — the almanac editor (`/admin/daily-gold/almanac/[monthDay]`)

| # | Requirement |
|---|---|
| R4.1 | The header states the blast radius before anything else: **"25 July, every year. Changes affect every future 25 July."** |
| R4.2 | Reached from the desk's almanac grid and from a clearly-marked "recurring content" link in the day editor — never presented as part of one date's work |

### 6.1 On This Day — recent history, several events per year

| # | Requirement |
|---|---|
| R4.3 | The scope is **the last twenty years**: the important, child-friendly things that happened on this month-day recently. Not all of history — that is Greatest Moments' job (§6.2). Years outside the band are not gaps and are not shown as any. **The band is rolling, and governs only what you generate**: an event published in 2026 for the year 2007 stays published as the window moves past it, it simply stops being asked about |
| R4.4 | **A year holds a list, not a slot.** Several events in the same year is the normal case, each its own row with its own `position`, headline, story, location and painting, each publishable on its own. The editor's unit is an event; the year is only a grouping |
| R4.5 | Generation is **one ask per month-day** — "the important child-friendly events of the last twenty years on 15 July" — returning several candidates spread across several years, each with its citation (D7, D10). The admin keeps what is worth telling, at whatever density each year deserves. There is no source-note step: nothing already in the table seeds the prompt |
| R4.6 | Fields per event: `year`, `headline`, `story`, `location` (flag-earning), `image_url`. `maison_rewrite_done` is the publish flag, and setting it is an explicit act |
| R4.7 | **Suitability sits in two places** (§2.6): the prompt asks for child-friendly events, and the review is where that is actually checked. AI may flag a candidate it is unsure of, but a year with nothing worth telling simply has nothing, and the screen must read that as finished work |
| R4.8 | Coverage is reported **against the twenty-year band** — "14 of the last 20 years have something" is a useful number. "1 of 46 rows" was not: it counted a legacy import as a backlog |
| R4.9 | Provenance per event: retrieved with a citation, retrieved without one, or written by hand |
| R4.19 | The ask offers the **text only / text and paintings** choice (§8.5). A text-only run leaves every event's painting slot empty with its prompt already written |

### 6.2 Greatest Moments — the unit is a rank

| # | Requirement |
|---|---|
| R4.10 | The scope is **all of history**: the ten most important things that have ever happened on this month-day, any year, BC included. A fixed ladder of ten slots, 1–10, filled and empty at a glance (4 month-days have all ten; the other 362 have none) |
| R4.11 | Per slot: `year`, `headline`, `story`, `image_url` |
| R4.12 | Re-ranking is a transactional reorder — `(month_day, rank)` is unique |
| R4.13 | A partial ladder renders fine in rank order, so "6 of 10" is a legitimate publish state |
| R4.14 | AI can propose moments for review, then rewrite per slot |
| R4.17 | The ask takes **a number** — "propose five more" — and its results are **appended**, never a replacement. New moments take the next free ranks; the admin re-ranks by dragging afterwards. Ten is the ceiling the reader renders, so an ask larger than the free slots is capped, and the panel says so before it runs |
| R4.18 | The moments already on the day are sent as **exclusions**, so a second ask proposes different events instead of the same five again. `suggestPeople(monthDay, exclude)` already establishes this pattern for people |
| R4.20 | **Every moment is editable in place.** A rung opens into its own fields — year, headline, story, painting, provenance — without leaving the ladder, because rank is relative and you judge a moment against its neighbours. Nothing about a moment is read-only: an AI proposal you accepted is the same editable row as one you typed |

### 6.3 Born Today

| # | Requirement |
|---|---|
| R4.15 | People are month-day content too, so the almanac **acknowledges them without owning them**: a day-level strip above the tabs naming who is born this month-day, how many are published, how many are drafts that will not surface, and a link into the people library filtered to that day. Read-only — no roster editing, no reordering, no Born Today tab. The display order (`bornTodayPriority` via `reorderBornToday`) is set in the people library beside the person's own record; giving that one decision two homes is how the two drift apart |
| R4.16 | The almanac links **back to a date**: "12 June 2026 →" opens that month-day's occurrence in the day editor, the mirror of the day editor's "Open the almanac". The two keying schemes need doors in both directions or the admin has to navigate by URL |

---

## 7. The person editor — `country_code`

| # | Requirement |
|---|---|
| R5.1 | A field beside `country`: searchable ISO-3166-1 alpha-2 picker showing the flag it will produce, per `docs/flag-seal-spec.md` R4.11 |
| R5.2 | Pre-fill with the resolver's guess from `country`, visibly distinguishing **guessed** from **confirmed** — 0 of 37 people have a code, and `country` holds nationality adjectives ("American", "Italian-French", "Dutch Republic (Netherlands)") that the name tables resolve unevenly |
| R5.3 | Add "no country code" to the library's completeness badges — its absence silently costs a flag chip, which is exactly the class of bug that went unnoticed since the port |
| R5.4 | Backfill script for unambiguous hits, leaving the rest null for an editor (flag-seal spec R4.12) |

---

## 8. AI assistance

Four modes, in the house pattern: **propose → review → accept**, never a silent overwrite.

### 8.1 Per-field rewrite
The person editor's `startRewrite` idiom, unchanged: CURRENT beside AI-PROPOSES, accept or
reject, one field at a time. Applies to every prose field in §5 and §6.

### 8.2 Whole-unit drafts
"Draft this day", "draft this month-day's top ten", "draft this year's event" — a job with
staged progress the admin can leave and return to. Auto-applies only onto an empty draft;
anything else requires explicit confirmation, as `generateBook` already does.

Whole-day drafting is triggered **from inside the day editor**, one day at a time, and never
from the desk. A dashboard row is the wrong place to start a job that costs real money across
several models — and it keeps the desk's verbs honest: the desk creates and navigates, the
editor writes.

### 8.3 Grounding — retrieval, then review

The AI gathers its own facts (D7). The admin's job is verification, not sourcing — and the
citation is what makes that job possible (D10).

| Content | How the AI gets its facts | What the admin is actually checking |
|---|---|---|
| Good news | Web search across an outlet allowlist, scoped to the date window; candidates staged with citations | That the story is real, recent, and genuinely good news — source one click away |
| On This Day | Retrieval, one ask per month-day scoped to the last twenty years, returning several candidate events with citations | That each event is real, correctly dated, and something you would tell a seven-year-old |
| Greatest moments | Retrieval, since year drift is the standard failure | The year, against the citation |
| Daily quote | Retrieval for the attribution | That the words are really that person's — the most common generation failure of all |
| Destination, sensory trio, child life | Free generation, no retrieval needed | Tone and age-fit |
| Tiny phrase | Free generation, but the translation is a factual claim | The translation and the language name |

Each item records provenance — retrieved with citations, retrieved without usable citations,
or freely generated — plus a review stamp, so a later visit can tell what was verified from
what was merely accepted. `on_this_day_event.researched_from_internet` already carries this
idea; the other tables need the same.

### 8.4 Images — one modal, everywhere

**Every image in the product is opened, not operated on in place.** A slot shows the picture
(or an empty frame) and exactly **one** control that opens it. No `Regenerate` / `Edit prompt` /
`Upload` cluster sitting in a form beside a thumbnail: three buttons per slot × seventeen slots
in a Golden Story is a wall of verbs, and it forces every screen that happens to contain a
picture to re-implement the same behaviour slightly differently.

| # | Requirement |
|---|---|
| R6.8 | **One shared modal**, used by every image surface: the day editor's masthead and destination, each good-news item, each On This Day event, each Greatest Moments rank, and every slot in the existing `PersonEditor` |
| R6.9 | The slot outside the modal is a **picture and an opener** — nothing else. Empty reads *Add a painting*; filled reads *Open painting*. Status stays on the slot (empty · prompt ready · generating · painted · uploaded · failed) because it is glanceable across a screen; verbs live inside |
| R6.10 | The modal holds everything about one image: the picture at size, the **treatment toggle** (raw file versus what a family sees), the prompt with a read-only style preamble and editable scene, its pixel size, and the actions — generate, regenerate, upload, accept, revert, delete |
| R6.11 | It is **parameterised by a slot descriptor**, not by a screen: size, style preamble, scene source, and the treatment to preview through. Daily Gold surfaces pass the hero's mask-and-wash or the destination card's gradient; Golden Story slots pass the parchment with their real blend mode, and multiply slots keep the flat-white-background rule and the corner-pixel warning on upload |
| R6.12 | Replacing `SlotCard`'s inline controls with the modal is part of this work, not a follow-up — the reuse is the point, and two divergent image UIs is the outcome to avoid (R7.16) |

Inside, Path A is generate → preview under the real treatment → accept / regenerate / revert;
Path B is copy the whole prompt with its size, paint it anywhere, upload the result. Reuse
staging→promote so a failed or rejected render never destroys the live image, sharp→webp at
quality 82, and the established R2 key conventions:
`hero-media/<date>.webp`, `destination-media/<date>-<id>.webp`, `news-media/<date>/<position>.webp`,
`history-media/<MM-DD>/year-<year>.webp`, `moment-media/<MM-DD>/rank-<n>.webp`.
Batch ("generate all missing images for this day") with per-slot progress and per-slot
failure — one failure never discards completed slots.

### 8.5 Text only, or text and paintings

Every whole-unit ask offers two modes, chosen on the ask itself and never remembered as a
preference — the right answer differs between "draft me five moments" and "fill this one gap".

- **Text only** — writes the words and leaves each painting slot empty **with its prompt
  already composed**. Cheap and quick; the words are the part that needs your judgement.
- **Text and paintings** — writes the words and renders every slot in the same job.

An empty slot whose prompt is written is a normal, finished-looking state, not a failure. That
is what makes text-only a real choice rather than a half-measure.

| # | Requirement |
|---|---|
| R6.1 | Both On This Day and Greatest Moments carry the choice on the ask, stated in units rather than money (R6.5) |
| R6.2 | A text-only run **composes and stores every slot's prompt**. The slot then reads as *awaiting a painting*, never as an error |
| R6.3 | Per slot, whatever the mode: view the prompt with the Daily Gold style preamble read-only and the scene editable, **generate this one slot**, copy the prompt out with its pixel size, or upload a finished file (§8.4's dual path, unchanged) |
| R6.4 | Generating one slot never touches another, and a slot that already holds an accepted painting is skipped by any later batch unless explicitly re-run |
| R6.5 | **No cost estimates anywhere.** No per-ask figure, no per-image figure, no "this will cost about". OpenRouter has no pre-flight quote to give, output length is unknowable in advance, and a number that is nearly right teaches the admin to stop reading it. The only money on screen is the **credit balance** the desk already shows (R2.7) — a fact, not a forecast. What an ask states instead is *units*: five moments, with paintings or without |

---

## 9. Prerequisites — what has to change first

| # | Blocker | Requirement |
|---|---|---|
| R7.1 | `generation_job.slug` is `notNull` with an FK to `remarkable_person`, and `story_brief` is keyed by slug | Generalise the job row to a polymorphic subject (`subject_kind` + `subject_key`, slug nullable) or add a sibling table. Nothing in §8 works until jobs can belong to a date or a month-day |
| R7.2 | No publish gate (§2.5) | D4: `status` as the edition gate, `published` on `good_news_item` and `greatest_moment`, and `getAvailableDates` filtered on all of them — otherwise the first keystroke of a draft is live |
| ~~R7.3~~ | `child_life_story` has two disagreeing renderers (`DailyGoldEditionPage.jsx:462` splits paragraphs, `DGDestination.jsx:283` does not) | **No longer a blocker** — it only mattered because a page preview would have had to pick one. Still a reader-side inconsistency (two modals, two treatments, both shown to families) worth fixing on its own merits |
| R7.4 | Removing read-time generation (D5) leaves the reader's unauthored years undefined, and they become the common case | Design the empty-year state in `DGOnThisDay`: which years the navigator offers at all, and where an unauthored year sends the child. Jumping to the nearest authored year beats an empty column, and beats an invented event |
| R7.10 | D5 removes the only signal about which years children actually reach | If that demand is worth keeping, log the *visit* (month-day + year, no content) so the almanac editor can prioritise by it. A counter is not a generation trigger — the rule in D5 holds |
| R7.5 | `DGOnThisDay`'s navigator floors at year 1 and steps one year at a time, which fits neither content type: On This Day is a twenty-year band (R4.3), and the deep past belongs to Greatest Moments, which has no navigator at all | Floor the navigator at `currentYear − 20`. BC years (−411 in live data) then stop being an On This Day concern entirely — they are Greatest Moments rows, reached by rank, not by stepping |
| R7.12 | The reader renders **one event per year** — `DGOnThisDay.jsx:104-108` keys a map by year and keeps the first qualifying row, silently dropping the rest — while the content model has several per year (§2.3, R4.4) | **In scope for this implementation, not a separate concern.** The year view becomes a list of that year's published events in `position` order. The admin surface is designed as though this is already true and carries no warning about it — a warning would be the wrong artefact to build, since the fix ships alongside |
| R7.13 | **Settled: the legacy On This Day corpus goes entirely.** `raw_text`, `raw_extract` and `researched_from_internet` have no consumer once D5 removes the enrichment call, and the rows themselves predate the twenty-year model | `on_this_day_event` ends up **empty**, with those three columns gone — drop and recreate it, or delete every row and drop the columns; the end state is the same. All **323** rows go, not only the 310 un-authored ones: the 13 "authored" rows come from the same import and at least one is provably mis-filed (its story reads "June 6, 2026" under `06-12`). The content type stays; only its contents leave. Take a `pg_dump` first |
| R7.16 | `components/admin/SlotCard.tsx` and `ImageStatusBoard.tsx` carry the person editor's inline image controls, and `imageActions.ts` / `imageStore.ts` already implement generate-to-staging, accept, revert and upload per slot | The shared modal (§8.4) replaces `SlotCard`'s controls rather than sitting beside them. The server actions underneath need no change — they are already per-slot and staging-based; this is a UI consolidation, and doing it now is what makes the modal shared rather than merely similar |
| R7.15 | `IMAGE_MODEL = 'openai/gpt-image-2'` (`lib/golden-story/openrouter.ts`) **is not in OpenRouter's catalogue** — a live query of `/api/v1/models` returns no such id. What is there: `openai/gpt-5.4-image-2`, `openai/gpt-5-image`, `openai/gpt-5-image-mini`, and the `google/gemini-*-image` family | `renderImage` throws on a non-OK response, so this does not fail silently — every render would surface as a failed slot. Confirm what the renderer is really calling before any cost display is built on top of it; the id looks to have been renamed underneath the repo |
| R7.14 | `on_this_day_event` and `greatest_moment` are near-identical shapes — month-day, year, headline, story, image — which reads as one table too many | They are not the same contract: a rolling twenty-year band ordered by `position`, many rows per year, with a flag-earning `location`; versus a fixed 1–10 ladder over all of history. Merging means one table with a discriminator, two unique indexes and two reader queries. **Recommend keeping both and deleting the genuinely redundant columns instead** (R7.13) |
| R7.6 | ISO2 resolution is three hardcoded tables in components | `lib/countries.ts` (flag-seal spec §4.1) so the admin's resolution indicator and the reader agree by construction. Without it the indicator is a second guess at the same problem |
| R7.7 | No Daily Gold prompt module | `lib/daily-gold/prompts.ts`: the oil-painting style block plus per-surface composition and size (D6) |
| R7.8 | Nothing in `lib/golden-story/openrouter.ts` uses retrieval — `WRITER_MODEL` is called without plugins, so no request can currently return a citation | Add the web plugin (or an `:online` variant) and parse `url_citation` annotations. Web search bills per request on top of tokens, so the desk's credit display (R2.7) should not imply token cost is the whole cost |
| R7.11 | **Settled.** `dg_status` had no value meaning *draft*, and prepare (R2.5) writes a row no AI has touched — `generating` would have made the status lie | Add `draft` to the enum; keep `generating` for its literal meaning, a job in flight. Prepare writes `draft`, publish writes `ready`, `getAvailableDates` filters on `ready` |
| R7.9 | No provenance columns outside `on_this_day_event` | `good_news_item` and `greatest_moment` need `source_url` / `source_title` / `source_published_at` / `retrieved_at` and a review stamp, or D10 has nowhere to store what the admin verified. **Settled: no staging table** — a candidate is an unpublished row of the real table (D11). Two consequences to build for: `(date, position)` is unique, so candidates hold positions too — accepting one **repositions** it into the next free display slot rather than keeping its arrival order, and rejecting deletes the row and renumbers. The ten-item ceiling counts **published** rows only, so retrieval may propose more than ten without anything becoming unreachable |

---

## 10. Out of scope for v1

- Scheduling and automation (a nightly job that drafts tomorrow). The manual path has to be
  good first; automation without review is what produced the current corpus.
- The hardcoded editorial copy in `DGHero`, `DGValuesStrip`, `DGMoreToExplore`,
  `DGForParents`, and the `/escapes`, `/academy`, `/recipes`, `/parent-observatory` routes
  those cards link to, which do not exist. (Sections 3 and 4 of the audit — deferred by
  decision.)
- The Base44-backed reader features: `SavedItem` hearts, `FlagSeal`, `AnalyticsEvent`. Those
  belong to `docs/flag-seal-spec.md`, not here.
- Version history beyond accept/reject of AI proposals.
- Mobile editing layouts; multi-admin presence and conflict resolution.
