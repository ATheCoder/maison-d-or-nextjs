# Parent Observatory — Specification (Analytics Phase B)

The parent dashboard reserved in `daily-gold-analytics-plan.md` §6 Phase B:
the target of the "Open Parent View" button in `DGForParents.jsx`, currently
a 404 at `/parent-observatory`. Built entirely on the `analytics_event`
pipeline shipped 2026-07-30 (v1, drizzle 0025) plus `flag_seal`.

Status: **specification only — not scheduled.** Resolve the open questions
in §8 before writing an implementation plan.

---

## 1. Purpose and stance

The DGForParents card already promises four things by name: *Exploration
Summary*, *Curiosity Themes*, *Growth Insights*, and *Family Conversation
Starters*. This surface is where those promises are kept — and nothing more.

Governing stance (inherited, not negotiable):

- **Curiosity, not surveillance** (v1 plan §5.5). The dashboard presents
  patterns and celebrations, never a click-by-click log. Aggregates only;
  no raw event stream, no per-event timestamps, no "online now".
- **Honest numbers.** Dwell is attention-gated at capture; a minute shown
  here is a minute the child was actually looking. Undercounting is the
  defensible direction — never inflate, never extrapolate.
- **Each child on their own terms.** No sibling comparison, ranking, or
  shared leaderboard anywhere on the surface (§6).
- **A conversation starter, not a report card.** Framing and copy present
  what the child *found*, not how the child *performed*.

## 2. Access and trust model

- **Guardians only, own family only.** The page's data loader runs
  `requireFamily()` (`lib/dal.ts`) — same pattern as `/family`. A session
  in child mode is bounced through the grown-up gate:
  `/gate?next=%2Fparent-observatory` (the button lives on the child's page,
  so this is the *normal* path, not an edge case).
- **`childProfileId` is the one sanctioned client-supplied child id**
  (auth-plan §1: "Where a guardian passes one explicitly (dashboard), the
  DAL verifies it belongs to the guardian's family"). Every read action
  takes an explicit `childProfileId`, verifies
  `child_profile.family_id === session.user.familyId`, and returns null
  (never throws) on mismatch. This is the mirror image of the child-mode
  invariant — the ingest side still never accepts an id.
- Read actions live in `app/parent-observatory/actions.ts` with a contract
  test in the house style: requires `requireFamily`; bans `getActiveChild`
  (this is a parent surface — active-child state must not leak into which
  child is shown) and bans `throw`.
- No new API routes; server components + server actions only, per app
  convention.

## 3. Route and information architecture

```
/parent-observatory                 → redirect to first child (or empty state)
/parent-observatory/[childId]       → one child's observatory
```

- Child switcher: tabs/pills listing the family's profiles — navigation
  between children, never juxtaposition of their numbers.
- Zero-children family: invite/empty state pointing at `/family`.
- Child with no events yet: every module renders its honest empty state
  ("No reading yet this week"), mirroring DGForParents' no-placeholder rule
  — absence of data is shown as absence, never faked.
- Parent-surface chrome (not the child paper's ThemeProvider identity):
  visually related to Maison d'Oré but unmistakably the grown-up room.
  Exact design out of scope here.

## 4. Modules (v2 scope)

Each module is independently shippable and independently empty-stateable.
Times shown to parents are whole minutes; sub-minute totals render as
"under a minute", never "0 min" (which reads as a lie next to a visited
section).

### F1 — This Week (Exploration Summary)

Per-day engaged minutes for the trailing 7 days as a small bar chart, with
today live. Under it: sections visited this week with per-section minutes
(from `section_view`, labelled via `SECTION_LABELS`), and editions opened
(distinct `edition_date`). "Engaged minutes" = section + story dwell, the
same definition as `TodayExploration.totalMinutes` — content dwell overlaps
section dwell and is excluded; the two surfaces must never disagree on the
same day's number.

### F2 — Reading rhythm

Typical reading windows (morning / after school / bedtime — bucketed hours,
from `occurred_at` of attention-bounded activity) and typical session
length (from `session_resume`→`session_pause` spans, heartbeat-capped).
Presented as a gentle pattern ("usually reads 10–15 minutes after
dinner"), explicitly **not** as a screen-time meter, target, or limit.

### F3 — Curiosity Themes (interest profile)

The trailing 30 days grouped two ways:

- **By part of the paper**: share of dwell per section — "most of her time
  goes to On This Day and Destinations".
- **By opened content**: top items from `content_close` (GROUP BY
  content_type + content_id, `MAX(label)` as title — stored-label decision
  from v1, no content-table joins), with opens and dwell. Split stories out
  (they have F4); cap the list; a "more" expansion may show up to ~25.

### F4 — Bookshelf (per-story progress)

One row per story the child has opened (`story_page_view` /
`story_finished`, GROUP BY content_id): title (stored label), pages
reached (COUNT DISTINCT page label), finished-or-abandoned state with
date, number of sittings (distinct batch/day clusters), total reading
time. States: *reading* (activity within 14 days), *finished*,
*set aside* (no activity in 14 days, unfinished — neutral wording, not
"abandoned"). Likely the single most valued module; the data is fully
present in v1 events.

### F5 — Milestones and flags

Celebration feed, newest first: flags earned (`flag_seal` — the durable
source, per v1 plan §2 "Not duplicated"), first story finished, each new
section explored for the first time ever, editions-opened streaks. Framed
as achievements to mention at dinner, not metrics. No badges for raw
minutes — time is context here, never an achievement.

### F6 — Edition recap

"What was in the paper on {date}, and what did she open?" — a date picker
over `edition_date`, showing that edition's opened content (labels + dwell)
and sections visited vs. skipped. Answers the concrete parental question
F1's aggregates can't. Depends only on the existing
`(child_id, edition_date)` index.

### F7 — Family Conversation Starters

v2 keeps this **template-based, zero-LLM**: rendered from the same rows as
F3/F4 — "Ask {name} about {label}" for the week's top opened items, "Ask
how {story} ends — {pages} pages in" for in-progress books. If it can't be
generated honestly from real activity, the module hides. An LLM-written
variant is a future enhancement with its own privacy review; do not build
it speculatively.

### F8 — Weekly digest (email) — optional, ship last

Monday-morning email per family: the F1 summary + F5 highlights for each
child, opt-in from the observatory, one-click unsubscribe. Inngest cron
(pattern: `purgeAnalyticsEvents`), rendering from the same read actions as
the page — the email must never compute its own numbers. Requires an email
provider decision (§8); everything else in this spec works without it.

## 5. Read side and storage

- **New rollup table — decide with data, not upfront.** Auth-plan §3
  deferred `analytics_daily_rollup` "until this dashboard lands". Ship v2
  reading live from `analytics_event` on the existing
  `(child_id, occurred_at)` and `(child_id, edition_date)` indexes — one
  family's rows over 30 days is small. Trigger for building the rollup
  (child_id, day, section/content grain, pre-summed dwell): observed slow
  observatory loads, or the F8 digest fanning out over many families.
- **The 12-month retention purge is a hard data horizon** (v1 plan §7).
  Every module above needs ≤ 30 days, so v2 is unaffected — but any future
  "year in review" or long-horizon Growth Insights must aggregate into a
  rollup *before* the purge reaches the rows. Extending raw-event
  retention is not an option; the purge is a privacy commitment, not a
  cost optimisation.
- All queries are per-child and bounded by the verified `childProfileId` —
  no cross-family aggregation exists anywhere, including internal totals.
- `reader_switch`, `nav_select`, `shelf_open` are diagnostic events: they
  inform no v2 module and must not surface to parents ("she switched
  profiles at 19:42" is surveillance).

## 6. Anti-features (deliberate, load-bearing)

Recorded so they are not "added" later as easy wins:

1. **No real-time presence** ("online now", live activity). Surveillance,
   and dishonest anyway — capture batches on a 20 s flush.
2. **No sibling comparison** in any form: no shared charts, no rankings,
   no "X read more than Y". The switcher navigates; it never juxtaposes.
3. **No screen-time targets, goals, or nudges to increase usage.** The
   attention-gated numbers exist to be honest, not to be optimised.
4. **No raw event log or per-event timestamps** exposed to parents.
   Coarsest honest grain only (day buckets, hour-range rhythms).
5. **No data export / CSV** in v2 — an export is a raw log with extra
   steps. Revisit only with a real deletion/portability story.
6. **No push notifications about the child's activity.** The weekly digest
   (F8, opt-in) is the only outbound channel.

## 7. Success criteria

- A guardian reaches the observatory from the child's page through the
  grown-up gate; a child session can never see another profile's data —
  or this surface at all — without the gate.
- Every number shown traces to attention-gated events or `flag_seal`; the
  same day's minutes match DGForParents exactly.
- A family with two children sees two independent observatories and no
  cross-child numbers anywhere.
- Empty states are honest everywhere; nothing renders placeholder data.
- Contract test enforces `requireFamily` + explicit family-verified
  `childProfileId` on every read action; no `throw`, no `getActiveChild`.
- Zero new API routes; no rollup table unless §5's trigger fires.

## 8. Open questions (resolve before implementation)

1. **Timezone.** v1 accepted server-local "today" (UTC skew noted). Day
   bucketing and F2's rhythm windows make this visible to parents — does a
   `family.timezone` column land first? (Recommended: yes, one column +
   one `AT TIME ZONE` in the read queries.)
2. **Guardian PIN vs. full gate for the observatory** — auth-plan §4 says
   the parent area requires the guardian PIN; confirm `/gate` UX covers
   the from-child-page hop cleanly on tablets (the primary device).
3. **F8 email provider** — none exists in the app today; F8 is the first
   outbound email besides auth. Defer F8 entirely if this stalls.
4. **Design direction** for the parent chrome (relation to the child
   paper's themes) — needs a mock before build, same as the Treasury
   redesign flow.
