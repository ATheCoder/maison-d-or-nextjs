# Parent Observatory — Implementation Plan ("The Ledger", F1–F7)

Companion to `docs/parent-observatory-spec.md` (the authoritative spec). This resolves the
spec's §8 open questions and turns it into an executable build plan against the design mock
("Parent Observatory.dc.html", Claude Design project `245ea279-673a-4509-be15-90b6d859f0d6`).

## Context

The DGForParents card on the child's Daily Gold edition promises four features by name and its
"Open Parent View" button (`components/dailygold/DGForParents.jsx:81`) currently 404s at
`/parent-observatory`. The spec defines the surface: a guardians-only, per-child analytics
dashboard over the shipped `analytics_event` pipeline (drizzle 0025) + `flag_seal` —
aggregates only, "curiosity not surveillance", honest numbers, no sibling comparison.
The visual design is the **"The Ledger"** direction from the mock: editorial single column +
380px rail, warm-paper light chrome, closest kin to the child's paper.

### Decisions made (2026-07-30)

- **Design: The Ledger** (not Study / Almanac).
- **Timezone: yes** — add `family.timezone`; observatory day bucketing uses it, and
  `getTodayExplorationForActiveChild` adopts it in the same change (the "same day's minutes
  must match DGForParents exactly" criterion requires both to move together).
- **Scope: F1–F7**; F8 weekly email digest deferred entirely (no email provider exists).
- **Fixed trailing windows only** — no This/Last-week toggle.

### Hard constraints (spec + verified codebase invariants)

- Every read: `requireFamily()`; explicit `childProfileId` verified
  `child_profile.family_id === family.id`; **null (never throw)** on mismatch.
  Ban `getActiveChild`, ban `throw`. Contract test in the house source-as-text style.
- No new API routes, no rollup table. Server components + colocated server actions.
- Engaged minutes = section_view dwell + story_page_view dwell, content_close dwell excluded
  (`app/analytics/actions.ts:314-318`). `toMinutes = Math.round(ms/60000)` (`:143`).
  Sub-minute non-zero → "under a minute", never "0 min".
- Diagnostic events (`reader_switch`, `nav_select`, `shelf_open`) never surface.
  No per-event timestamps (day buckets / hour bands only), no presence, no export,
  no screen-time targets, no sibling juxtaposition.
- Next.js 16 (per `node_modules/next/dist/docs`, which AGENTS.md requires consulting):
  async `params`/`searchParams` (`Promise<...>` + `await`),
  `export const dynamic = 'force-dynamic'` (house pattern; cacheComponents not enabled),
  `proxy.ts` not middleware.

### Verified facts the plan builds on

- `lib/dal.ts:50-59 requireFamily()` hardcodes `redirect('/gate?next=%2Ffamily')`; ~12
  callers, all no-arg → adding an optional `next` param is zero-risk. `/gate`
  (`app/gate/page.tsx`) already accepts any same-origin `?next=`.
- No helper verifies a client-supplied childProfileId; the inline idiom is
  `and(eq(childProfile.id, id), eq(childProfile.familyId, fam.id))`
  (`app/profiles/actions.ts:132-136`).
- `proxy.ts:13` protectedPath list + `:28` matcher must both gain the route.
- Reference read impl to mirror: `getTodayExplorationForActiveChild`
  (`app/analytics/actions.ts:168-331`) — six parallel grouped statements,
  `dwellMs = coalesce(sum(duration_ms),0)` (`:151`), story titles via `max(label)` from
  content_open/close (story content_close carries NO label), pagesRead =
  `countDistinct(label)` (label is the page number), stories excluded from top content.
- Contract-test trap: `app/analytics/actions.contract.test.ts:20` bans the token `familyId:`
  in that file — the timezone edit there must access `child.familyId` as a value only.
- Fonts already global (`app/globals.css:1` imports Playfair Display, Lato, **Dancing
  Script**). CSS Modules precedented (`GoldenStory.module.css`). Parent-chrome precedent:
  `/family`+`/gate` (no ThemeProvider, inline-style ivory shell, `const C` palette in
  `FamilyManager.tsx`).
- Edition sections rendered per day (`DailyGoldEditionPage.jsx:206-263`): hero, born_today,
  good_news (only when items exist), on_this_day, greatest_moments, inspiration, destination,
  more_to_explore, values (+ for_parents, excluded from the reader denominator) →
  F6 denominator = 9, minus good_news on days with no published item
  (`goodNewsItem.published` at `src/db/schema.ts:378`; display band is `position < 10`).
- Story page totals are unknowable (page numbering is orientation-dependent,
  `GoldenStory.jsx:607`; no page-count column) → bookshelf bar cannot be fraction-of-book.

---

## 1. Files

New (all new code TypeScript; `.jsx` is legacy dailygold only):

```
drizzle/0026_<generated>.sql                     — family.timezone (drizzle-kit generate)
lib/family-time.ts        + family-time.test.ts  — pure IANA-tz day helpers
lib/observatory/constants.ts                     — EDITION_PAPER_SECTIONS, rhythm bands, windows
lib/observatory/format.ts + format.test.ts       — minutes formatters ("under a minute", "1 h 41")
lib/observatory/derive.ts + derive.test.ts       — pure: session spans, bands, streaks, story states,
                                                   milestone feed, conversation starters
app/parent-observatory/page.tsx                  — index: redirect to first child / zero-children invite
app/parent-observatory/[childId]/page.tsx        — one child's observatory
app/parent-observatory/actions.ts                — reads ('use server' + trust doc comment)
app/parent-observatory/actions.contract.test.ts  — house-style static contract test
components/observatory/palette.ts                — C = { canvas:#F5F0E7, card:#FBF8F1, champagne:#F3E9D8,
                                                   ink:#4A3B2A, clay:#8B7355, gold:#C8A96B,
                                                   sage:#7C8770, terracotta:#C46D46, dim:#B3A48D }
components/observatory/observatory.module.css    — grid, 900/480px breakpoints, bars, bands, hover
components/observatory/ObservatoryLedger.tsx     — layout orchestration (server component)
components/observatory/Masthead.tsx              — kicker, Playfair h1, week line, child pills (Links)
components/observatory/StatTrio.tsx
components/observatory/WeekCard.tsx              — F1
components/observatory/CuriosityCard.tsx         — F3
components/observatory/BookshelfCard.tsx         — F4
components/observatory/RhythmCard.tsx            — F2
components/observatory/MilestonesCard.tsx        — F5
components/observatory/StartersCard.tsx          — F7
components/observatory/EditionRecapCard.tsx      — F6
components/observatory/EmptyNote.tsx             — shared honest empty line
components/observatory/ObservatoryInvite.tsx     — zero-children state (links /family)
```

Modified:

```
src/db/schema.ts        — family.timezone
lib/dal.ts              — requireFamily(next: string = '/family')
proxy.ts                — '/parent-observatory' in protectedPath (:13)
                          + '/parent-observatory/:path*' in matcher (:28)
app/analytics/actions.ts — timezone adoption in getTodayExplorationForActiveChild (:176-182)
app/family/actions.ts + components/auth/FamilyManager.tsx (optional, last)
                        — setFamilyTimezone + timezone select
```

Layout note (F3): the Ledger mock's main column holds only Exploration Summary + Bookshelf;
`CuriosityCard` goes between them in the same card idiom (heading, hairline, 30-day section
meter rows, top-content list with a styled `<details>` for the "more, up to 25" expansion —
no client JS). Deliberate extension of the mock; everything else follows it exactly.

## 2. Routes, redirect, empty states

`app/parent-observatory/page.tsx` (`force-dynamic`): `getObservatoryIndex()` → children exist
→ `redirect('/parent-observatory/' + children[0].id)` (createdAt ASC); zero children → render
`ObservatoryInvite` inline (masthead + one champagne card, "Add a child profile in the Family
room" → `/family`).

`[childId]/page.tsx`:

```ts
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: {
  params: Promise<{ childId: string }>; searchParams: Promise<{ edition?: string }>;
}) {
  const { childId } = await params;
  const { edition } = await searchParams;
  const data = await getObservatory(childId, edition);
  if (!data) redirect('/parent-observatory');   // foreign/garbage id collapses to index — no leak, no loop
  return <ObservatoryLedger data={data} />;
}
```

Child-with-no-events: real DTO with empty payloads; each card renders its own honest empty
line ("No reading yet this week." / "The bookshelf is waiting for a first story." / "Rhythms
appear after a few visits." / "No editions opened yet."). StartersCard renders nothing when
zero starters are generatable (module hides, per F7).

## 3. Read actions (`app/parent-observatory/actions.ts`)

Two exports — one aggregate for the page (single place for the verification the contract test
pins; page renders all modules in one server pass):

```ts
export async function getObservatoryIndex(): Promise<{ children: {id; displayName; avatar}[] }>
export async function getObservatory(childProfileId: string, editionDate?: string): Promise<ObservatoryData | null>
```

`getObservatory` skeleton:

1. `const { family: fam } = await requireFamily('/parent-observatory/' + encodeURIComponent(String(childProfileId)));`
2. Verify: `db.select().from(childProfile).where(and(eq(childProfile.id, String(childProfileId)), eq(childProfile.familyId, fam.id))).limit(1)` — no row → `return null`.
3. Siblings for the switcher (family-scoped listing, `getFamilyOverview` idiom).
4. `tz = fam.timezone`; windows from `lib/family-time.ts`: `todayKey`, `weekStart`
   (tz-midnight −6d), `monthStart` (−29d).
5. All queries inside one `try { … } catch { return null; }` — no path throws.

DTO (serializable; whole object or null): `child`, `children`, `timezone`, `todayKey`,
`week { days[7] {day, minutes, isToday}, totalMs, sections, editionsOpened, streak }`,
`rhythm { bands[4 levels 0–3], typicalSession {lowMin,highMin}|null, sentence }|null`,
`themes { sections {label, minutes, share}, topContent ≤25 }`,
`bookshelf[] { storyId, title, pagesReached, sittings, minutes, state reading|finished|set_aside, stateDay }`,
`milestones ≤8 { kind, text, day, tone gold|sage }`,
`recap { availableDays ≤10, selected { day, opened, visitedSections, totalSections, skippedSections }|null }`,
`starters[] { text, why }`.

### Query sketches (drizzle, mirroring the reference's idioms; `Number(x ?? 0)` coercion)

Shared:

```ts
const dwellMs = sql<string>`coalesce(sum(${analyticsEvent.durationMs}), 0)`;
const tzDay  = sql<string>`((${analyticsEvent.occurredAt} at time zone ${tz})::date)::text`;  // tz binds as a param
const tzHour = sql<number>`extract(hour from ${analyticsEvent.occurredAt} at time zone ${tz})::int`;
const engaged = or(   // MUST mirror the reference total: section + story dwell, content_close excluded
  and(eq(analyticsEvent.eventType, 'section_view'), isNotNull(analyticsEvent.section)),
  and(eq(analyticsEvent.eventType, 'story_page_view'), isNotNull(analyticsEvent.contentId)));
const mine = eq(analyticsEvent.childId, child.id);
```

- **F1 bars (7d):** engaged dwell grouped by `tzDay`, zero-filled in JS against
  `lastNDayKeys(tz, 7)`; today's bar shares boundary + filter + rounding with the
  (timezone-adopted) TodayExploration → exact match by construction.
  **Section meters (7d):** reference section query with `gte(occurredAt, weekStart)`;
  labels via `SECTION_LABELS`. **Editions opened (7d):** `countDistinct(editionDate)`
  where not null and ≥ weekStartKey → "N of 7" (plain "N editions" if > 7).
- **F2 (30d):** engaged dwell grouped by `tzHour` (≤24 rows, coarse per spec) →
  `derive.ts#foldBands`: morning 5–11, midday 11–15, after school 15–18, evening 18–23
  (23–5 folds into evening); level 0 = none, else 1/2/3 by share (<15% / <40% / ≥40%).
  Session spans: `session_resume`/`session_pause` rows ordered by occurredAt (timestamps
  never leave the server) → `derive.ts#sessionSpans`: pair resume→next pause, drop
  unmatched/negative, merge <60s gaps, cap 90 min (30s heartbeat means longer silence =
  lost pause); typicalSession = median bucketed to 5–10/10–15/15–25/25–40. Sentence
  template "{Name} usually reads {low}–{high} minutes, mostly {band phrase}." Requires
  ≥3 spans and ≥15 engaged min, else `rhythm: null`.
- **F3 (30d):** section share (ms/totalMs) + reference top-content query (`content_close`,
  `ne(contentType,'story')`, `max(label)`, opens, dwell DESC) `limit(25)`; card shows 6,
  `<details>` the rest.
- **F4 (full retained history):** `story_page_view` GROUP BY contentId:
  `pagesRead = countDistinct(label)`, dwell, `sittings = count(distinct tz-date)`,
  `lastDay = max(tz-date)`; + reference title query (content_open/close, story,
  `max(label)`) and `story_finished` GROUP BY contentId with `min(tzDay)`, both unbounded.
  `derive.ts#storyState`: finished → `finished`; lastDay within 14d of todayKey → `reading`;
  else `set_aside` (neutral wording). Progress track encodes relative attention within this
  child's own shelf (fill = story ms / max story ms; full solid when finished) — page totals
  are unknowable, so never fraction-of-book; meta line carries true numbers
  ("7 pages in · 2 sittings · 12 min"). Set-aside fill at `opacity: .5` per mock.
- **F5:** assembled newest-first in `derive.ts#milestoneFeed`, cap 8: flags (`flag_seal` by
  `desc(firstEarnedDate)` limit 12, child already family-verified — tone gold); first story
  finished (reuse F4 rows — gold); first-ever section visits (`min(tzDay)` per section over
  full history, surfaced only when within last 30d — sage); edition streak from
  `selectDistinct(editionDate)` → `derive.ts#editionStreak` (consecutive calendar dates
  ending today/yesterday; milestone at ≥3, always feeds the stat-trio streak). Day suffixes
  render as day names ("· Tuesday"), never times.
- **F6:** `availableDays` = distinct editionDate DESC cap 10 (reuse streak query); selected =
  validated `?edition=` if in list, else newest; second query phase (depends on list):
  opened content that day (`content_close` grouped, stories included, story titles from the
  title query + `eq(editionDate, day)`), sections visited (`selectDistinct(section)` where
  section_view, that day, `durationMs > 0`), denominator = `EDITION_PAPER_SECTIONS` (9 ids,
  cross-ref comment to DailyGoldEditionPage.jsx) minus good_news when `goodNewsItem` has no
  row with `eq(date, day), eq(published, true), lt(position, 10)` →
  "She opened X of Y sections, and lingered on:" + chips "label · N min".
- **F7:** pure `derive.ts#conversationStarters(name, themes.topContent, bookshelf, flags)` —
  no queries. Templates (cap 3): "Ask {name} about {label}." / "{X min} with it this
  month."; "Ask how {title} is going — {name} is {N} pages in." (top reading story);
  "Ask about the flag of {countryName}." / "Earned {weekday}." Use the child's name, never
  a pronoun (no pronoun data exists; mock's "she" is not reproducible honestly).

Contract test asserts: `toContain('requireFamily(')`; the verification pattern
(`eq(childProfile.id,` … `eq(childProfile.familyId, fam.id)` … `return null`);
`not.toMatch(/getActiveChild/)`; `not.toMatch(/\bthrow\b/)`.

## 4. Client/server split — zero client components

All interaction is navigation: child pills = `<Link href="/parent-observatory/{id}">`;
edition day chips = `<Link href="…?edition={day}">` (server re-render; unselected days' data
is never shipped — consistent with no-new-API-routes); F3 "more" = native `<details>`.
Breakpoints/hover in `observatory.module.css`: mock has no @media, so write
`@media (max-width: 900px)` (single column, rhythm+milestones 2-up) and `(max-width: 480px)`
(stacked, tighter bars; mobile card reorder summary→bookshelf→rhythm→milestones→starters→recap
via `display: contents` on column wrappers + `order`). No ThemeProvider — palette in
`components/observatory/palette.ts`. Light-only (mock defines no dark mode).

Ledger visual spec highlights: kicker 10px/0.28em uppercase sage "Maison d'Oré · Private ·
Family intelligence"; Playfair 42px h1 "The Parent Observatory"; stat trio (Playfair 34px
numerals, e.g. "1 h 41" / "6 of 7" / streak); grid `1fr 380px`; bar chart 110px track, bars
`rgba(200,169,107,0.42)` w=26 r=4/2, `.hi` solid #C8A96B for peak + today, value labels
above, day labels below (last = "Today"); section meter rows (name 128px / 5px track /
right-aligned minutes); book spines 34×48 gradient (gold/sage/terracotta), state badges
Reading/Finished/Set aside; champagne notes with Dancing Script 21px + 10.5px "why";
borders always `1px solid rgba(200,169,107,α)`.

## 5. Migration + timezone adoption

`src/db/schema.ts` family table: `timezone: text('timezone').notNull().default('UTC')`
(IANA name; UTC = identical to pre-column behavior). `npm run db:generate` →
`drizzle/0026_*.sql`, migrate against :5555.

`lib/family-time.ts` (pure, DST-tested with e.g. America/New_York): `isValidTimeZone`,
`zonedDayKey(tz, at)` (Intl 'en-CA'), `startOfZonedDay(tz, at, dayOffset=0)`,
`lastNDayKeys`, `weekdayForKey`, `addDaysToKey`. SQL `AT TIME ZONE` is authoritative for
grouping; JS supplies only window-start instants + labels from the same zone rules.

`app/analytics/actions.ts:176-182` (honoring the `:172` "one-line change" comment): look up
`family.timezone` via `eq(family.id, child.familyId)` (single indexed row read),
`start = startOfZonedDay(tz, new Date())`, `dayKey = zonedDayKey(tz, new Date())`.
**Never write the token `familyId:` in this file** (contract test `:20`). Ships in the same
change as the observatory so the exact-match criterion holds from day one.

`lib/dal.ts`: `requireFamily(next: string = '/family')`; `:52` →
`redirect('/gate?next=' + encodeURIComponent(next))`. All existing callers unchanged.

Optional last step: `setFamilyTimezone` in `app/family/actions.ts` (requireFamily +
isValidTimeZone + scoped update) and a select in FamilyManager
(`Intl.supportedValuesOf('timeZone')`). Without it the column is inert-but-correct.

## 6. Ordered steps

1. Schema + migration 0026 (`family.timezone`); generate, migrate (:5555).
2. `lib/family-time.ts` + tests (DST/UTC/negative offsets).
3. `lib/dal.ts` `next` param; run suite.
4. `proxy.ts` both lists.
5. `lib/observatory/{constants,format,derive}.ts` + tests — the subtle logic lives here
   (formatter incl. "under a minute", sessionSpans, foldBands, editionStreak, storyState,
   milestoneFeed, conversationStarters).
6. `app/parent-observatory/actions.ts` + contract test (queries per §3).
7. Analytics timezone adoption; confirm `app/analytics/actions.contract.test.ts` passes.
8. Routes + `ObservatoryLedger` + cards + palette + CSS module (desktop pass).
9. Responsive (900/480) + empty states + zero-children invite + starters-hide.
10. Optional /family timezone editor.
11. Verify (below).

## 7. Verification

- `npm test` (vitest: new unit + contract tests, existing suites), `npm run build`
  (migrates + type-checks async params).
- Manual (`npm run dev`, postgres on **:5555** via docker compose; seeded child
  **Rhaenyra**):
  - Browse an edition as Rhaenyra to generate events (attention-gated: the tab must be
    visible AND focused; 20s flush; dev StrictMode double-mounts modal open/close pairs).
  - For Parents card → "Open Parent View" → guardian gate (`/gate?next=…`) → observatory.
    Confirm today's bar minutes == DGForParents "Today's Exploration" minutes.
  - `/parent-observatory/<garbage-or-foreign-id>` → bounces to index. Child-mode session
    hitting the URL → gate. Signed-out → `/login` (proxy).
  - `UPDATE family SET timezone='Europe/Paris'` on :5555 → both surfaces shift day boundary
    together.
  - `?edition=` chips re-render; check 834/390 via same-origin iframe trick (Chrome resize
    doesn't work in this setup); fresh child profile → all-empty honest page.

## 8. Risks / notes

- **Definition drift** between the `engaged` predicate here and the reference is the main
  long-term risk to exact-match — pinned by cross-reference comments both ways (shared
  predicate not cleanly extractable today).
- **DST**: a bar at a transition may include ±1h; SQL and JS derive from the same zone
  rules. Accepted.
- **Bookshelf bar** = relative attention (design deviation forced by unknowable page
  totals); real numbers in the meta line; documented in the component.
- **First-ever milestones vs 12-month purge**: a section first visited >12mo ago can
  resurface as "first"; mitigated by surfacing only last-30d first-evers. Retention
  extension is forbidden (privacy commitment).
- **Streak** is "editions opened in a row" (edition_date chain), never "days in a row".
- Query fan-out ~15 indexed per-child statements + 2-phase recap — within the no-rollup
  budget; §5 rollup trigger stays "observed slowness".
