# Daily Gold — Child Activity Analytics — Implementation Plan (v1)

Builds the instrumentation model deferred from the July 2026 navigation
overhaul. Requirements source: `daily-gold-navigation-redesign-spec.md` §5
(event vocabulary, capture defects, roll-up needs, privacy framing) and
`auth-plan.md` §3/§6/§7 (reserved `analytics_event` table, "client reports
what, never who", retention). This plan resolves the spec's open questions
#5 and #6 and extends the vocabulary for per-content and per-page tracking.

**Decisions already taken (2026-07-30, with the user):**

- Dedicated `analytics_event` Postgres table — spec §9 Q5. (There is no
  `AnalyticsEvent` to extend; that was a Base44 entity without `child_id`.)
- Postgres/Neon is the system of record. Redis is **not** part of v1 —
  see §8 for the future Redis plan and its trigger conditions.
- Batched ingestion via one server action; no per-event requests.
- localStorage carryover for unflushed batches (mobile tail-loss guard).
- `sendBeacon` ingest route deliberately deferred (see §8).
- Per-content dwell (news/moment/destination modals) and per-page story
  tracking are in scope — the parent must be able to see time per section,
  per opened content item, and per book page.

---

## 1. Trust model (invariant, not a feature)

Per `auth-plan.md` §6: **the client reports what, never who.** Event
payloads carry no child/family identifiers. The server action resolves the
child via `getActiveChild()` (`lib/dal.ts`) — same pattern as
`toggleSavedItem` / `earnFlagSeal`. No session or no active child → cheap
reject before parsing, no rows written.

Consequences:

- New `app/analytics/actions.contract.test.ts` mirroring the treasury and
  passport contract tests: no exported function accepts a child / family /
  email identifier; uses `getActiveChild()`, not `requireChildContext`;
  source contains no `throw` (analytics must never break the child's page —
  discriminated-union returns only).
- Worst-case abuse blast radius is self-vandalism of one's own family's
  stats plus row growth — bounded further by §5.

## 2. Storage

New table in `src/db/schema.ts`, migration `drizzle/0025_*` modelled on
`0023` (flag_seal) / `0024` (saved_item):

```
analytics_event
  id            text PK
  child_id      text NOT NULL → child_profile(id) ON DELETE CASCADE
  event_type    analytics_event_type enum NOT NULL
  section       text            -- whitelisted section id
  content_type  text            -- whitelisted: person|news|moment|destination|story|…
  content_id    text
  label         text            -- display label, length-capped
  source        text            -- rail|bar|shelf|seal|…
  edition_date  date
  duration_ms   integer         -- clamped; null for instantaneous events
  occurred_at   timestamptz NOT NULL   -- client-stamped, server-validated
  batch_id      text NOT NULL   -- client-generated per flush
  seq           smallint NOT NULL      -- position within batch
```

Indexes:

- `(child_id, occurred_at DESC)` — trajectory / retention queries
- `(child_id, edition_date)` — "today" roll-up for `DGForParents`
- UNIQUE `(batch_id, seq)` — idempotency; inserts use
  `ON CONFLICT DO NOTHING` so a replayed batch (localStorage carryover,
  double-fire, captured request) writes zero duplicate rows.

### Event vocabulary

Spec §5.1 plus the extensions agreed in review:

| Event | Fired by | Carries |
|---|---|---|
| `section_view` | TrackedSection exit / flush | section, duration_ms, edition_date |
| `content_open` | modal/story open | content_type, content_id, label, section |
| `content_close` | modal close | content_type, content_id, duration_ms (visibility-paused) |
| `nav_select` | rail / tab bar / shelf handlers | destination path, source |
| `shelf_open` | My World shelf items | shelf item |
| `collection_view` | FlagCollectionView open | earned count |
| `edition_turn` | wax-seal day navigator | from/to edition_date |
| `story_page_view` | GoldenStory page turn | story slug (content_id), page number (label), duration_ms since previous turn |
| `story_finished` | StorybookView onFinished | story slug |
| `session_pause` / `session_resume` | visibilitychange / blur / focus | active section |
| `session_heartbeat` | 30s timer while visible | active section, elapsed |
| `reader_switch` | **server-side** in `enterChildProfile` | from/to child id (server knows both) |

**Not duplicated:** `flag_earned` — already durable in `flag_seal` with
sources and edition dates; parent roll-ups join it.

## 3. Ingestion — `app/analytics/actions.ts`

One exported action: `recordEvents(batch)`.

Order of operations (cheapest rejection first):

1. `getActiveChild()` — null → `{status:'no_child'}`.
2. Raw shape/size gate: array, length ≤ 50, serialized size sanity check.
3. `normaliseEventBatch()` from **pure module `lib/analytics-event-input.ts`**
   (pattern: `lib/saved-item-input.ts`; full vitest suite, no imports from
   app code). Per event: whitelist `event_type`, `section`, `content_type`,
   `source`; cap `label` at 120 chars; clamp `duration_ms` to [0, 10 min];
   `occurred_at` must be ≤ now + 2 min (no future) and ≥ now − 48 h
   (**not** a tight window — localStorage carryover legitimately replays
   hours-old events; the retention job and daily budget bound the abuse).
   Invalid events are dropped individually with a `console.warn`; the batch
   is not rejected wholesale.
4. Daily budget (v1 rate limiting, no Redis): on every Nth flush (N≈5),
   indexed `COUNT` of the child's rows where `occurred_at > now − 24h`;
   past 5,000 → `{status:'over_budget'}`, write nothing. A real child
   cannot reach this; a script hits it in minutes.
5. Single multi-row `INSERT … ON CONFLICT (batch_id, seq) DO NOTHING`,
   `child_id` stamped from step 1.

Returns `{status:'ok', accepted: n}` — never throws. The client treats any
non-ok status as "keep buffer, retry next interval" except `over_budget`
and `no_child`, which drop the buffer.

## 4. Capture — one instrumentation context

`components/dailygold/instrumentation/` (all `'use client'`):

- **`DGInstrumentationProvider`** — mounted at the root of
  `DailyGoldEditionPage` *and* the story route (see below). Provides
  `track(event, payload)` via context (spec §7: sections must not depend on
  an `onTrack` prop being threaded — that is how Greatest Moments got
  missed). Skips buffering entirely when no `child` prop (nobody to
  attribute to; server would reject anyway).
- **Buffer + flush triggers** (all three, in one place):
  1. every ~20 s (whatever has accumulated — never waits to be full);
  2. at 25 buffered events;
  3. on `visibilitychange → hidden` and on window `blur` — leaving *is* a
     flush trigger. Also flush in the provider's unmount cleanup (the shell
     is keyed on `child?.id`, so a reader switch remounts and would
     otherwise wipe the buffer).
- **Visibility-aware dwell** (answers spec §9 Q6): dwell clocks run only
  while `document.visibilityState === 'visible'` AND window focused.
  `session_pause` / `session_resume` emitted at each transition — parents
  see *when* attention left, not just gaps. Blur counts as pause: numbers
  err toward undercounting, which keeps them defensible.
- **`<TrackedSection id>`** — IntersectionObserver wrapper: in view at
  ≥ 50% intersection; dwell segments < 1 s discarded (scroll-past noise);
  emits `section_view` with accumulated `duration_ms` on exit and at flush.
- **Content dwell**: `DGModal` open/close lifecycle emits `content_open` /
  `content_close(duration_ms)`, visibility-paused. Default for everything
  modal-shaped: news items, Greatest Moments, Destination detail.
- **localStorage carryover**: on hide, unflushed events are persisted,
  tagged with the child-profile id already present in client props (a local
  routing hint only — it is **never sent**; the server still stamps identity
  from the session). Next page load replays iff the active child matches,
  else discards — a sibling switching profiles cannot inherit the previous
  child's tail. Batch idempotency (§2) makes replay double-sends harmless.
- **Heartbeat**: `session_heartbeat` every 30 s while visible, carrying the
  active section — bounds worst-case tail loss and acts as a liveness
  check against left-open tablets.

### Mounting scope

The story route (`/stories/[slug]` → `StorybookView`) must also be inside a
provider — per-page book tracking is a v1 requirement. Recommended: mount
the provider per-route (Daily Gold page root + story page root) rather than
in a shared shell, so each route passes its own `child`/`editionDate`
context explicitly. Buffer flushes on route change (unmount cleanup), so
the last page's dwell survives navigating back to the paper.

## 5. Abuse guards (v1, no Redis)

Layered, cheapest first — see decisions log for why this is proportionate
(no read path, no cross-family write; blast radius = own family's stats):

1. Session + active-child check before any parsing (anonymous flood = a
   no-op invocation; volumetric abuse is Vercel firewall's layer).
2. Plausibility limits *are* abuse limits: whitelists, label cap, duration
   clamp, timestamp window, batch cap (§3.3).
3. Per-child daily row budget via indexed COUNT on every Nth flush (§3.4).
4. Idempotent batches — replaying a captured request writes nothing (§2).
5. Framing guard (spec §5.4): the parent UI presents curiosity/growth, not
   surveillance-grade truth — a determined child with DevTools can always
   fabricate plausible events for their own profile; the product must not
   pretend otherwise.

Note: this makes analytics the most-guarded write path in the app.
`earnFlagSeal` has none of these volume guards (flag-seal spec R5.10,
consciously deferred) — when the Redis limiter lands (§8), retrofit it there.

## 6. Read side

**Phase A (this plan):** `getTodayExplorationForActiveChild()` in
`app/analytics/actions.ts` — child-mode read via `getActiveChild()`:
distinct sections + dwell totals, top opened content (joined to content
tables for titles), story pages read, flags earned today (from
`flag_seal`). Added to the existing 8-query `Promise.all` in
`app/daily-gold-edition/page.tsx` (`getActiveChild` is `cache()`d — no
extra session query). Kills the fallbacks in `DGForParents.jsx`
(`topics || ['Geography',…]`, `time || 0`); delete the now-dead
`trackInteraction` / `timeSpent` / `topicsExplored` local state.

**Phase B (separate plan, not this one):** `/parent-observatory` — the
"Open Parent View" button's target, currently a 404. Parent surface rules
(auth-plan §1/§5): `requireFamily()` (bounces child-mode to the gate),
explicit `childProfileId` parameter verified against `session.user.familyId`
— the one sanctioned client-supplied child id. Breadth/depth/trajectory off
the two indexes. The daily-rollup table stays deferred until this dashboard
lands (auth-plan §3) — do not build it speculatively.

## 7. Retention

Inngest scheduled function (infrastructure already runs at
`app/api/inngest/route.ts`): monthly delete of `analytics_event` rows older
than 12 months (auth-plan §7/§9.3 — raw 12 months, rollups longer once
they exist). Uses the `(child_id, occurred_at)` index; batched deletes.

## 8. Future: Redis — how, why, and when (NOT in v1)

Decision 2026-07-30: Postgres remains the event **store** permanently —
the parent dashboard is a relational problem (joins to content tables,
`flag_seal`, family scoping; open-ended future queries), retention is one
indexed DELETE, and disk-priced storage beats RAM-priced for a year of
history. Redis was evaluated and rejected *as the store*. It has two
legitimate future roles here:

1. **Rate limiter** (first Redis job when it lands): token bucket in a
   reusable `lib/rate-limit.ts` (Upstash via the Vercel integration — HTTP,
   no connection pooling issues in serverless). Replaces the COUNT-based
   daily budget in §5.3 with a proper per-child-per-minute bucket, and
   retrofits onto `earnFlagSeal` (flag-seal spec R5.10) as a one-liner.
   **Trigger:** observed abuse, or before any write path is exposed more
   widely than the child UI.
2. **Ingest buffer** (Redis as buffer ≠ Redis as store): flushes land in a
   Redis list; an Inngest function drains every 5–10 min into Postgres as
   one bulk insert. Purpose: decouple Neon compute-wake from session
   activity — without it, the 20 s flush cadence pins Neon's smallest
   compute awake for the duration of every active session (the inserts are
   cheap; the awake-hours are the cost). Parents see stats with ≤ 10 min
   lag — invisible for a daily dashboard. **Trigger:** Neon compute-hours
   visibly driven by analytics after ~2 weeks of real usage — measure
   first; after-school usage clustering may make this moot. The retrofit
   only changes where `recordEvents` writes; schema and dashboard are
   untouched.

Related deferred hardening (not Redis): `sendBeacon` + a dedicated ingest
API route (would be the app's first) for guaranteed hide-time delivery on
mobile. localStorage carryover reduces the loss window to "child never
returns to the app" — build the beacon route only if real data shows gaps.

## 9. Build order (each step shippable)

1. **Schema + migration** — `analytics_event` + enum + indexes
   (`drizzle/0025`). Table is inert until written to.
2. **`lib/analytics-event-input.ts`** + vitest suite (pure module first —
   pattern of `lib/saved-item-input.ts`).
3. **`app/analytics/actions.ts`** (`recordEvents`) + contract test + daily
   budget guard.
4. **Provider + TrackedSection + flush/carryover machinery.** ⚠️ Per
   `AGENTS.md`: read `node_modules/next/dist/docs/` before this and later
   steps — modified Next.js; client/routing conventions may differ.
5. **Wire the Daily Gold page**: TrackedSection around each section; modal
   open/close events; `nav_select`/`shelf_open` in `DGNavigationRail` /
   `DGMobileTabBar` / identity header (handlers driven from `dgNavConfig`);
   `edition_turn` in `DGWaxSealNavigator`; `collection_view` in
   `FlagCollectionView`; **add tracking to `DGGreatestMoments`** (currently
   has none); **fix `DGDestination` hover double-fire** (track opens only —
   hover is not child intent). Delete legacy `trackInteraction` /
   `timeSpent` / `topicsExplored`.
6. **Story route**: provider on `/stories/[slug]`; `story_page_view` on
   GoldenStory page turns (time since previous turn, clamped);
   `story_finished` from the existing `onFinished` hook.
7. **`reader_switch` server-side** in `enterChildProfile` (truth lives
   there; a client can't forget to emit it).
8. **`getTodayExplorationForActiveChild()` + real `DGForParents` data**;
   remove fallbacks.
9. **Retention job** (Inngest, monthly).

## 10. Success criteria

- Per child, per day, queryable: time per section; time per opened content
  item (news story, moment, destination); per-page story reading (pages
  seen, seconds per page, finished or abandoned-at-page-N).
- Attention-leaving moments (`session_pause`/`resume`) are first-class
  timestamped events; dwell never accumulates while hidden or blurred.
- Tail loss bounded to one unreturned mobile session's final ≤ 20 s.
- No event payload ever contains a child/family identifier (contract test
  enforces).
- A scripted client cannot exceed the daily row budget, cannot write
  implausible durations/timestamps, and gains nothing from replay.
- `DGForParents` renders entirely from real data; fallbacks deleted.
- Zero Redis, zero new API routes in v1; §8 documents exactly when either
  gets added.
