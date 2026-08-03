# Cache Components Migration Plan

Plan for enabling Next.js Cache Components (`cacheComponents: true`) across the
app, agreed 2026-08-02. Nothing here is built yet. Written to be picked up cold:
every file path, line reference and decision needed to execute it is below.

Target version is the one already installed — **Next 16.2.10**, self-hosted via
`next start`.

## 0. Ground rules

- **Read the bundled docs, not training data.** Per `AGENTS.md`, this version's
  reference lives in `node_modules/next/dist/docs/`. The ones that matter here:
  - `01-app/02-guides/migrating-to-cache-components.md` — the config-by-config
    migration table. Read it end to end before starting.
  - `01-app/03-api-reference/01-directives/use-cache.md`
  - `01-app/03-api-reference/04-functions/cacheLife.md`
  - `01-app/03-api-reference/04-functions/cacheTag.md`
  - `01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`
  - `01-app/02-guides/preserving-ui-state.md` — for Phase 5.
- **The build is the worklist.** Once the flag is on, accessing uncached data or
  a runtime API outside `<Suspense>` is an error in dev *and* build
  (`01-getting-started/08-caching.md:292`, the `blocking-route` message). Don't
  try to predict every site — flip the flag, read the errors, fix what it names.
  The inventory in this document is the expected shape of that list, not a
  substitute for it.
- **Do not take the escape hatch.** Wrapping the root layout's body in a
  `<Suspense>` with an empty fallback silences every blocking-route error by
  deferring the whole app to request time. That is the same as not migrating,
  with extra config. If a route genuinely must be fully dynamic, say so at that
  route.
- **Never reintroduce `export const dynamic`.** Under Cache Components it is
  dead config; pages are dynamic by default and caching is opt-in per function.

## 1. Why

Two things, in order of value:

1. **Explicit, tagged caching for the Daily Gold day reads.** Every request to
   `/daily-gold-edition` runs six DB queries whose answers are identical for
   every reader and, for archive days, effectively immutable. Today they run
   per request, per reader. This is the actual payoff and it is Phase 4.
2. **Static shells.** Partial Prerendering becomes the default, so the auth and
   marketing pages prerender outright and the signed-in routes can serve a shell
   immediately while reader-specific content streams.

What it does **not** buy: a materially faster `/daily-gold-edition` shell. Below
the masthead, everything on that page depends on the day or the reader, so the
prerendered shell is close to what `loading.tsx` already paints. The reader page
wins from Phase 4 (cached day reads), not from PPR.

## 2. Inventory

Measured against the tree on 2026-08-02. Re-check with the same greps if the app
has moved on.

- 22 `page.tsx`, 4 `layout.tsx`, 2 `route.ts`, 9 `loading.tsx`.
- 18 files export `dynamic = 'force-dynamic'`.
- 29 client components; ~15 hold dialog/dropdown/form state (Phase 5).
- No `runtime = 'edge'`, no `experimental_ppr`, no `generateStaticParams`, no
  `fetchCache`, no `revalidate` segment config, no `unstable_cache` yet. Those
  sections of the migration guide are all no-ops for us.

### Pages already covered by a `loading.tsx` (no error expected)

`profiles`, `(dg)/treasury`, `(dg)/passport`, `(dg)/parent-observatory`,
`(dg)/family`, `invite/[token]`, `daily-gold-edition`, `welcome`, `gate`.

### Pages that become genuinely static for free

`login`, `signup`, `forgot-password`, `reset-password`, `(site)/page.tsx`. They
read no runtime data. Confirm after Phase 1 that the build reports them as
prerendered — that is the cheapest signal the flag is doing its job.

### Pages that need a boundary (8)

`admin/page.tsx`, `admin/daily-gold/page.tsx`, `admin/daily-gold/[date]`,
`admin/daily-gold/almanac/[monthDay]`, `admin/people/page.tsx`,
`admin/people/[slug]`, `(dg)/parent-observatory/[childId]`, `stories/[name]`.

### The one real refactor

`app/(dg)/layout.tsx:35-39` awaits `getActiveChild()` and `getSession()` at the
top of the layout, which blocks all four rail routes beneath it regardless of
their own `loading.tsx`.

## 3. Phase 0 — extract the Daily Gold reads

Do this first. It is independent of the flag, it is the precondition for Phase 4,
and it is worth doing on its own merits.

`app/daily-gold-edition/actions.ts` opens with `'use server'`, and the compiler
refuses both directives in one file — the SWC error is literally *"Conflicting
directives "use server" and "use cache" found in the same file"*. So `'use cache'`
can never be added there.

It also does not need to be a `'use server'` file. All nine exports are reads
(`getEditionById`, `getEditionByDate`, `getLatestEdition`, `getPeopleForDate`,
`getGoodNewsForDate`, `getOnThisDayForDate`, `getGreatestMomentsForDate`,
`getPersonBySlug`, `getAvailableDates`); there is not a single mutation. The
directive is currently publishing nine unauthenticated POST endpoints for no
reason.

Steps:

1. Rename the file to `app/daily-gold-edition/queries.ts` and delete the
   `'use server'` line. Keep the exported types where they are — they are
   imported by name elsewhere.
2. Update the two import sites: `app/daily-gold-edition/page.tsx:8` and
   `app/stories/[name]/page.tsx:1`. Both are server components; no client
   component imports this module (verified), so nothing depended on these being
   callable actions.
3. `getEditionById` (line 133) has no callers anywhere. Delete it, or keep it and
   note why — don't carry it forward silently.
4. Add `import 'server-only'` at the top, since the `'use server'` directive was
   the only thing keeping this module off the client.

Commit this on its own. It should be behaviour-neutral.

## 4. Phase 1 — flip the flag

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },  // keep
  },
};
```

Then delete `export const dynamic = 'force-dynamic'` from all 18 files (with
their explanatory comments, which are now wrong):

`app/(dg)/parent-observatory/page.tsx`, `app/(dg)/parent-observatory/[childId]/page.tsx`,
`app/(dg)/treasury/page.tsx`, `app/(dg)/passport/page.tsx`, `app/(dg)/family/page.tsx`,
`app/daily-gold-edition/layout.tsx`, `app/daily-gold-edition/page.tsx`,
`app/invite/[token]/page.tsx`, `app/profiles/page.tsx`, `app/stories/[name]/page.tsx`,
`app/welcome/page.tsx`, `app/gate/page.tsx`, `app/admin/page.tsx`,
`app/admin/daily-gold/page.tsx`, `app/admin/daily-gold/[date]/page.tsx`,
`app/admin/daily-gold/almanac/[monthDay]/page.tsx`, `app/admin/people/page.tsx`,
`app/admin/people/[slug]/page.tsx`.

Run `npm run dev`, walk the app, and collect the errors. Then `npm run build`.
That output is the real Phase 2 worklist.

## 5. Phase 2 — unblock the routes

### 5a. `app/(dg)/layout.tsx` — the one that matters

Port the pattern the sibling layout already uses. `app/daily-gold-edition/layout.tsx:44`
has `ChromeWithIdentity`: the session reads live in a child component inside the
layout's own `<Suspense>`, with `DGChromeSkeleton` as the fallback, and its
docblock explains exactly why (a layout that awaits runtime data blocks entry
navigation, and `loading.tsx` cannot cover a layout above it). That reasoning
now applies to `(dg)` too.

Two things to be careful about:

- **The theme must still paint from the server.** `ThemeProvider` currently
  receives `childId` and `initialTheme` from the layout's own await. If the whole
  provider moves inside Suspense, the fallback renders unthemed and the palette
  flashes — the exact failure the current code was written to avoid. Decide
  deliberately: either the skeleton is theme-neutral by design, or the provider
  stays outside and only `DGPageShell`'s identity-bearing props stream.
- **`DGPageShell` needs a skeleton.** `DGChromeSkeleton` is the model; it may be
  reusable directly or may need a sibling for this shell's geometry.

### 5b. The six admin pages

Admin is behind `requireAdmin` and gets nothing from a static shell, so the
cheapest correct fix is a `loading.tsx` per admin segment. Don't over-engineer
these. Note `app/admin/daily-gold/page.tsx:14` also calls `new Date()` at the
top — under Cache Components that is a runtime API too, and the boundary covers
it.

### 5c. `stories/[name]` — worth doing properly

This is the one page outside Daily Gold that genuinely benefits. The story
content is keyed by slug alone (`getPersonBySlug`), so it can be a cached
component with `cacheTag('person:' + slug)`, while the `getActiveChild()` read
(used only for the earn path) moves into a Suspense-wrapped child. Result: a
public story page that prerenders.

### 5d. `(dg)/parent-observatory/[childId]`

Per-family data behind `requireFamily`. Add a `loading.tsx`; the sibling
`(dg)/parent-observatory` already has one to copy.

## 6. Phase 3 — metadata

Four `generateMetadata` functions. Under Cache Components they follow component
rules, but only error when they read runtime data *while the rest of the page is
otherwise prerenderable* — so expect most of these to be quiet once Phase 2 has
made their pages dynamic. Handle what the build actually flags:

- `admin/daily-gold/[date]`, `admin/daily-gold/almanac/[monthDay]`,
  `admin/people/[slug]` — read `params` plus a DB row. If flagged, `'use cache'`
  on the `generateMetadata` body is the fix.
- `app/daily-gold-edition/page.tsx:64` — reads `searchParams`, and
  `generateMetadata` cannot be wrapped in `<Suspense>`. Options are the
  `connection()` dynamic-marker pattern from the migration guide (§`generateMetadata`
  and `generateViewport`), or accepting that this route's metadata is request-time.
  Given the archive-link titles are the whole point of that function, accepting
  request-time metadata is the likely answer — but confirm against what the build
  says rather than pre-emptively rewriting it.

## 7. Phase 4 — cache the Daily Gold reads (the payoff)

In `queries.ts`, add `'use cache'` plus `cacheLife` and `cacheTag` to the
day-keyed functions. Two families, because they key differently:

- **Day-keyed** (`getEditionByDate`, `getGoodNewsForDate`) — one specific
  calendar day. Archive days never change: `cacheLife('max')`. Tag
  `dg-edition:${date}` and `dg-goodnews:${date}`.
- **Month-day keyed** (`getPeopleForDate`, `getOnThisDayForDate`,
  `getGreatestMomentsForDate`) — "what happened on this day across history", so
  the cache key and the tag must both be the month-day, not the full date.
  `cacheLife('max')`, tag `dg-almanac:${monthDay}` (and `dg-people:${monthDay}`
  for the Born Today gallery).
- **List reads** (`getAvailableDates`, `getLatestEdition`) — change whenever an
  edition is published. `cacheLife('hours')` plus tag `dg-dates`, so a publish
  invalidates them explicitly and the time bound is only a backstop.
- **`getPersonBySlug`** — `cacheLife('max')`, tag `person:${slug}` (shared with
  Phase 5c).

Rules to hold to:

- **Never cache the reader-keyed reads.** `getSavedKeys`,
  `getTodayExplorationForActiveChild`, `getSession`, `getActiveChildProfile`
  stay uncached forever. They read cookies; a cached copy is a data leak between
  families, not a performance win.
- **`today()` must stay outside every cached scope.** `app/daily-gold-edition/page.tsx:15`
  calls `new Date()`. If that value is captured by a closure inside a `'use cache'`
  function it becomes part of the cache key and can hang the build (the guide's
  "Build Hangs (Cache Timeout)" section). Pass the date string in as an argument
  — which `fetchDay` already does.

### Invalidation

Tag from the four admin writers. `updateTag` for read-your-own-writes (Server
Actions only — the admin desk should see its own edit immediately);
`revalidateTag` where stale-while-revalidate is fine.

| Writer | Tables | Tags to invalidate |
| --- | --- | --- |
| `app/admin/daily-gold/actions.ts` (~387, 423, 457) | `dailyGoldEdition` insert/delete | `dg-edition:${date}`, `dg-dates` |
| `app/admin/daily-gold/dayActions.ts` (~292-610) | `dailyGoldEdition`, `goodNewsItem` | `dg-edition:${date}`, `dg-goodnews:${date}`, `dg-dates` on insert |
| `app/admin/daily-gold/almanacActions.ts` (~317-594) | `onThisDayEvent`, `greatestMoment` | `dg-almanac:${monthDay}` |
| `app/admin/people/actions.ts` (~177-532) | `remarkablePerson`, `storyBrief` | `dg-people:${monthDay}`, `person:${slug}` |

Line numbers are from 2026-08-02 and are orientation only — find the write sites
by table name, not by line.

The end-to-end check for this phase: publish an edition in the admin desk and
confirm the reader sees it on the next load, without a restart.

## 8. Phase 5 — the Activity audit (the real risk)

`cacheComponents` switches navigation to React `<Activity>`: routes are hidden,
not unmounted, so `useState`, form inputs and scroll position survive navigating
away and back (migration guide, "UI state preservation"). **Nothing errors.** This
is a silent behaviour change and it is the only part of this migration that a
green build does not cover.

Walk each of these, navigating away and back:

`components/welcome/WelcomeWizard.tsx`, `components/auth/GateForm.tsx`,
`components/auth/ProfilePicker.tsx`, `components/ui/DatePicker.tsx`,
`components/maison/MaisonHeader.tsx`, `components/admin/ImageModal.tsx`,
`components/admin/AskPanel.tsx`, `components/admin/DayEditor.tsx`,
`components/admin/AlmanacEditor.tsx`, `components/admin/PersonEditor.tsx`,
`components/admin/PeopleLibrary.tsx`, `components/admin/CandidateCard.tsx`,
`components/admin/SlotOpener.tsx`, `components/admin/DailyGoldDesk.tsx`,
`app/(site)/page.tsx`.

**Highest stakes first:** `GateForm` (PIN entry — a preserved PIN field across
navigation is a security-shaped bug, not a cosmetic one) and `WelcomeWizard` (a
preserved step index means a returning family resumes mid-wizard). Do those two
before the admin surfaces.

Fixes, per the guide: close dropdowns in a `useLayoutEffect` cleanup; derive
dialog open-state from the URL rather than local state; reset forms in the submit
handler, or in a cleanup effect where that isn't possible.

## 9. Phase 6 — restructure the reader page for PPR (optional; do last, or not at all)

Only worth it if Phases 1-5 land cleanly and the shell still feels slow.
`app/daily-gold-edition/page.tsx` awaits everything at the top, so `loading.tsx`
covers the whole page and the static shell is empty. Getting a real shell means
splitting into a cached day component and Suspense-wrapped reader components.

Be warned this collides with the last-good-day fallback at
`page.tsx:146-175`: it can only decide to refetch *after* learning the requested
day is blank, which is sequential by construction and cannot prerender. The
docblock there explains why the fallback renders in-request rather than
redirecting, and that reasoning still holds. Do not restructure it casually —
`<SettleAddress>`, the shareable-URL invariant and the wax seal all depend on the
page declaring exactly one date.

## 10. Verification

- `npm run build` passes with zero `blocking-route` errors, and the build output
  lists `login`, `signup`, `forgot-password`, `reset-password`, `(site)` and
  `stories/[name]` as prerendered.
- `npm test` — vitest. The contract tests cover other action modules; confirm the
  Phase 0 rename touches none of them before assuming green.
- `NEXT_PRIVATE_DEBUG_CACHE=1 npm run start`, then load an archive day twice and
  confirm the second load hits cache.
- Local dev: Postgres on port 5555.
- Manual: an admin publish reaches the reader without a restart (Phase 4), and
  the Phase 5 walkthrough is done and recorded.

## 11. Tradeoffs being accepted

- **Cache durability regresses versus `unstable_cache`.** `use cache` defaults to
  in-memory, scoped to a single deployment (migration guide, "fetch cache
  options"). `npm run build` runs `drizzle-kit migrate && next build` and `start`
  restarts the process, so **every deploy starts with a cold cache**, and so does
  every restart. Values baked into a prerender survive; runtime-filled entries do
  not. If that becomes painful, configure `cacheHandlers` — decide then, not now.
- **Edge runtime becomes unavailable.** Not used today; this only constrains
  future routes.
- **PPR everywhere, not per-route.** There is no way to adopt this on one page.

## 12. Sequencing and rollback

Commit per phase, in order: 0 (extract) → 1 (flag + config deletion) → 2
(boundaries) → 3 (metadata) → 4 (caching + invalidation) → 5 (Activity audit) →
6 (optional).

Phases 0 and 2 stand on their own merits and should be kept even if the flag is
reverted — the extraction closes nine open endpoints, and the `(dg)` layout
refactor fixes a real entry-navigation block. A rollback is therefore: revert the
`next.config.ts` change and restore `force-dynamic` where it mattered, keeping
the structural work.
