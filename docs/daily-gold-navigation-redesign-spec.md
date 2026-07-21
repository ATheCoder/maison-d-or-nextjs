# Daily Gold — Navigation & Identity Redesign — Specification (v1)

Audience: UI/UX design + front-end. This document describes what we are
redesigning (the left navigation rail and the bottom/mobile navigation of the
Daily Gold Edition page), why, and the two distinct jobs the new navigation must
do at once: **give children a place to be, act, and return to**, and **give
parents data-driven insight into their child** — insight that is a byproduct of
the child genuinely engaging with the page.

It deliberately avoids prescribing final visual styling beyond the house
constraints at the end. It does prescribe structure, behaviour, and the data
that must flow, because those are the parts that determine whether the redesign
actually produces the insight it promises.

---

## 1. What this is

The Daily Gold Edition (`/daily-gold-edition`,
`components/dailygold/DailyGoldEditionPage.jsx`) is a daily, cinematic "world
journey" for children — good news, remarkable lives born today, on-this-day
history, a destination country, values, and greatest moments. It is the child's
daily home surface.

Today it carries three separate navigation/identity elements:

1. **`DGNavigationRail`** — a fixed 80px-wide left rail (desktop). Seven global
   app destinations: Home, Academy, Daily Gold, Journeys, Library, Family,
   Profile. Monogram at top, avatar at bottom. Pure app-shell navigation — it
   knows nothing about the child or their activity.
2. **`DGMobileTabBar`** — a fixed 70px bottom bar (mobile). Four tabs: For You,
   Explore, Saved, Family. Overlaps partly but not exactly with the rail, and
   several of its routes (`/discover`, `/saved`) differ from the rail's.
3. **`ChildGreetingStrip`** — an in-content strip below the hero: *"Hi, {name}"*
   (tap to switch reader), plus three **quick links**: **My Flags** (opens the
   flag-collection overlay), **My Book** (routes to `/assessments/goldprint`),
   and **My Recipes** (currently a no-op `onClick={() => {}}`).

The redesign's job is to fold these three things into **one coherent navigation
system** where identity ("Hi, {name}") and the child's personal shelf ("My
Flags / My Book / My Recipes") are first-class parts of the navigation — not a
content strip that scrolls away — and where every meaningful interaction is
captured as signal for the parent.

### Who uses it

- **Children** (primary, on the page): the reader. Needs a warm, legible,
  low-friction way to move between today's sections, revisit their collections,
  and feel ownership ("*my* flags, *my* book"). Reading age spans wide; icons
  must be labelled, targets must be large.
- **Parents** (secondary, mostly elsewhere): the account owner. Does not live on
  this page, but everything the child does here should roll up into insight the
  parent can read in the **For Parents** section (`DGForParents`) and the
  **Parent Observatory** (`/parent-observatory`). The parent's presence on *this*
  page is limited to the private "For Parents" band near the foot.

### The dual goal (the reason this redesign exists)

- **For the child:** make the page a place worth spending time in — easy to
  navigate, rewarding to return to, and personally *theirs*.
- **For the parent:** turn that genuine engagement into a **data-driven picture
  of the child** — what they're curious about, how they spend their attention,
  what they collect, what they revisit — framed as *"see your child through
  curiosity, not comparison"* (the existing `DGForParents` promise).

These goals are complementary: the parent insight is only trustworthy if it is a
faithful record of unforced child behaviour. The navigation must therefore make
engagement natural **and** instrument it honestly.

---

## 2. Current-state problems (what the redesign must fix)

1. **Three systems, one job.** The left rail, the bottom bar, and the greeting
   strip each do a slice of navigation/identity with no shared model. Routes
   even disagree (rail → `/discover`? no; bottom bar → yes).
2. **Identity is content, not navigation.** "Hi, {name}" and the personal shelf
   live in `ChildGreetingStrip`, which scrolls away with the page. The child's
   own stuff should always be reachable.
3. **The rail is anonymous.** An 80px rail of generic app icons tells the child
   nothing about themselves and gives the parent nothing. It's wasted primary
   real estate on the child's home surface.
4. **Dead affordance.** "My Recipes" does nothing. Either it earns a real
   destination or it leaves.
5. **Instrumentation is thin and lossy.** `trackInteraction` only writes an
   `AnalyticsEvent` *when a `child` is present*, fires once per topic bucket, and
   `timeSpent` is a coarse whole-minute counter reset on every mount. Navigation
   events, collection views, revisits, and per-section dwell are **not**
   captured — so the parent view is starved of exactly the signal this redesign
   is meant to create.
6. **Fixed 80px margin coupling.** The page content hard-codes `marginLeft: 80`
   to clear the rail. Any width change to the rail silently breaks layout.

---

## 3. Design principles

- **One navigation model, two renderers.** A single source of truth for
  destinations and personal shelf items, rendered as a **left rail** on desktop
  and a **bottom bar + identity header** on mobile. No route disagreements.
- **Identity is persistent chrome.** "Hi, {name}", the child's avatar, and the
  reader switcher belong to the navigation, visible without scrolling.
- **The personal shelf is a peer of global nav.** "My Flags / My Book / My
  Recipes" is the child's *own* collection space — grouped, labelled, and always
  reachable, distinct from app-wide destinations.
- **Every interaction is signal.** Navigation, opens, revisits, dwell, and
  collection views all emit structured events. Instrumentation is not optional
  and does not depend on a section remembering to call a tracker.
- **Insight, not surveillance.** What the child sees is play and ownership; what
  the parent sees is curiosity and growth. Never show the child "you are being
  measured", never show the parent raw comparison/ranking.
- **Calm, legible, large-target.** House aesthetic (parchment, gold, Playfair /
  Lato). Labelled icons, generous hit areas, motion that rewards without
  nagging.

---

## 4. Redesigned navigation — structure

Define one config the whole system reads from (replacing the three separate
`NAV_ITEMS` / `TABS` / hard-coded shelf arrays):

### 4.1 Global destinations (app shell)

Curated for a child's daily journey. Proposed set (final list is a design
decision, but rail and bar must agree):

| Destination | Route | Notes |
|---|---|---|
| Today (Daily Gold) | `/daily-gold-edition` | Home of the child's day; default active |
| Explore | `/discover` | Browse editions / news / books beyond today |
| Library | `/library` | Books & stories to spend time on |
| Academy | `/academy` | Structured learning |
| Family | `/family` | Shared / parent-facing space |

Reconcile the current divergence: the rail's `/home`, `/journey/...`,
`/profile` and the bar's `/saved` must be resolved into this single set (or
consciously demoted into an overflow). **Open question in §9.**

### 4.2 The personal shelf — "My World"

This is where "Hi, {name}" and the three shelf items live, promoted from the
scroll-away strip into persistent navigation. It is *the child's own space*:

- **Identity block** — avatar + *"Hi, {name}"* + reader switcher
  (`ChildSwitcherOverlay`, already built; keep sessionStorage-backed switching
  and the `dg_active_child_obj` cache).
- **My Flags** — opens the full-screen `FlagCollectionView` overlay (not a
  route). Should surface a **count badge** (`earnedCount / 197`) so the child
  sees progress at a glance and the parent sees breadth of geographic curiosity.
- **My Book** — the child's "Goldprint" (`/assessments/goldprint`). Rename in
  copy only if design wishes; route unchanged.
- **My Recipes** — **must be given a real destination** (e.g. a
  `/recipes` collection of the "taste of the day" dishes the child has
  encountered, tied to `taste_of_day` from editions). If no destination can be
  committed for v1, **remove it** rather than ship a dead control. Decision
  required — §9.

### 4.3 Desktop — left rail

- Widen from 80px to accommodate the identity block and a labelled personal
  shelf. **Rail width must become a shared token** (e.g. `--dg-rail-width`) that
  the page's content offset reads, replacing the hard-coded `marginLeft: 80`.
- Vertical structure, top → bottom:
  1. Monogram / brand mark.
  2. **Identity block** (avatar, "Hi, {name}", switcher chevron).
  3. **Global destinations** (§4.1), labelled icons, active-state dot (keep
     current active treatment — gold tint + dot).
  4. Divider.
  5. **My World shelf** (§4.2) — visually distinct grouping (the child's own,
     warmer, collection-like).
  6. Overflow / settings if needed.
- Collapsed vs expanded: consider an expand-on-hover or a persistent labelled
  state. Labels are **required** for the child audience (icon-only fails younger
  readers); the current rail is icon-only with `title` tooltips — insufficient.

### 4.4 Mobile — bottom bar + identity header

- **Bottom bar:** the global destinations (§4.1), 4–5 max, labelled (current bar
  is already labelled — good). Keep active dot + gold treatment. Reconcile routes
  with the rail.
- **Identity + shelf on mobile:** "Hi, {name}" and the My World shelf do **not**
  fit the bottom bar. Render them as a **sticky identity header** at the top of
  the page (persisting the current `ChildGreetingStrip` position but making it
  sticky), or as a bottom-sheet opened from a "My World" tab. Recommended:
  sticky compact header (avatar + name + switcher) with the three shelf items as
  a horizontally-scrollable chip row, so the personal shelf is reachable without
  a full-screen detour.
- The full-screen overlays (`FlagCollectionView`, celebrations) already work on
  mobile; keep them.

### 4.5 Reader switching

Keep the existing `ChildSwitcherOverlay` behaviour exactly (list children,
select, cache to sessionStorage, re-key page). It must now live in the identity
block of the navigation rather than in the content strip. Switching readers must
**re-scope all instrumentation** to the newly-selected child immediately.

---

## 5. Data-driven insight — the instrumentation model

This is the half of the spec that makes the parent goal real. The navigation
redesign is the *occasion*; the event model is the *substance*.

### 5.1 What must be captured

Every meaningful child action becomes a structured event. Minimum event
vocabulary (extends the existing `AnalyticsEvent` /
`daily_gold_interaction` pattern):

| Event | Fires when | Carries |
|---|---|---|
| `section_view` | a section enters the viewport / is dwelt on | section id, dwell ms, edition date |
| `content_open` | child opens a person, news item, destination, moment | content type, content id |
| `nav_select` | child taps a global destination | destination, source (rail/bar) |
| `shelf_open` | child opens My Flags / My Book / My Recipes | shelf item |
| `collection_view` | flag collection (or other) overlay opened | overlay, earned count |
| `flag_earned` | a seal is earned (already exists via `earnFlagSeal`) | country, source |
| `reader_switch` | active child changed | from/to child id |
| `session_heartbeat` | periodic while active/visible | elapsed, active section |

### 5.2 Fix the current capture defects

- **Do not gate on `child` presence for time/section signal.** Today
  `trackInteraction` only writes when `child` is truthy; buffer or attribute to
  the resolved child once known, so early interactions aren't silently dropped.
- **Replace coarse `timeSpent`.** The current 30s-interval whole-minute counter
  (reset every mount, paused-agnostic) should become **visibility-aware dwell**
  (pause on tab blur / page hidden), aggregated per section, so "time exploring"
  in `DGForParents` reflects attention, not wall-clock with the tab abandoned.
- **De-dupe intelligently, don't drop.** `topicsExplored` currently records a
  topic once ever. Keep the deduped *set* for display, but emit the raw events
  for the observatory so repeat-visits (a strong curiosity signal) are visible
  to the parent.
- **One tracker, injected.** Provide a single `track(event, payload)` via
  context so sections don't each re-implement (and forget) instrumentation. The
  navigation and shelf must emit through the same path.

### 5.3 What the parent sees (roll-up)

The existing `DGForParents` card already promises: Exploration Summary,
Curiosity Themes, Growth Insights, Family Conversation Starters, plus a Today's
Exploration snapshot (destination, time, topic count, topic chips). The event
model above must be sufficient to populate all of these **from real data** rather
than the current fallbacks (`topics || ['Geography','History','Good News']`,
`time || 0`). Specifically it must support:

- **Breadth** — distinct sections/topics/countries touched (flags earned is a
  ready-made breadth metric: `earnedCount / 197`).
- **Depth** — dwell and revisits per topic → "what genuinely holds attention".
- **Trajectory** — day-over-day patterns for "Growth Insights" (requires events
  keyed by `edition_date` + timestamp, which the model provides).
- **Conversation starters** — derived from today's top content the child opened,
  so dinner questions are grounded in what the child actually explored.

The `/parent-observatory` route ("Open Parent View") is the deeper home for this;
this spec only requires the navigation redesign to *feed* it, not build it.

### 5.4 Privacy & framing

- The child UI never surfaces measurement language. Collections are framed as
  achievement ("You've collected 42 of 197!"), never as scoring.
- The parent UI is framed as curiosity and growth, never ranking or comparison
  to other children.
- Events are per-child, scoped to the family account; `parent_email` continues
  to be attached as today.

---

## 6. Child engagement mechanics (the "make it worth returning to" half)

The navigation should actively support spending time, not just moving:

- **Progress made visible.** The My Flags badge (earned/197) and any book/recipe
  counts give the child a reason to come back and a visible reward for
  exploring. Progress lives *in the navigation*, always in view.
- **Continuity across days.** Because the page can view past editions
  (`DGWaxSealNavigator`), the shelf's collections (flags, recipes, book) are the
  through-line that persists across daily editions — the child's accumulating
  "world".
- **Return hooks.** Celebrations (`FlagSealCelebration`) already reward earning;
  the navigation should reflect the new state immediately (badge increments) so
  the loop closes on-screen.
- **Low-pressure.** No streak-shaming, no timers shown to the child. Engagement
  is invited by warmth and collectibility, and *that* is what makes the parent
  data honest.

---

## 7. Architecture & component changes

- **New:** a single `dgNavConfig` (destinations + shelf) consumed by both
  renderers. Replaces `NAV_ITEMS`, `TABS`, and the inline shelf array.
- **New/updated:** `DGNavigationRail` (desktop) and `DGMobileTabBar` +
  identity header (mobile) both render from `dgNavConfig` and receive the active
  child + shelf actions (`onShowFlags`, navigate, recipes destination).
- **Fold in:** `ChildGreetingStrip`'s identity + switcher + shelf move into the
  navigation components. The standalone strip is retired (or reduced to the
  mobile sticky header).
- **New:** an instrumentation context (`track`, visibility-aware dwell,
  child-scoped) provided at the page root, replacing ad-hoc `trackInteraction` /
  `timeSpent` / `topicsExplored` local state. Sections call `track(...)`.
- **Layout:** replace hard-coded `marginLeft: 80` with a shared rail-width token
  so content offset and rail width can never drift apart.
- **Unchanged:** `FlagCollectionView`, `FlagSealCelebration`, `DGForParents`
  *markup* (it should now receive richer real props), the edition/date model,
  `ThemeProvider`, `earnFlagSeal`.

---

## 8. Constraints (house rules)

- **Read the Next.js docs first.** Per `AGENTS.md`, this is a modified Next.js;
  read `node_modules/next/dist/docs/` before writing routing/layout code and heed
  deprecations. Do not assume App Router conventions from memory.
- **Theming.** Use `ThemeContext` tokens (`theme.accentGold`, `theme.textMuted`,
  `theme.bgCard`, `theme.fontBody`, …) — the components already do. No new
  hard-coded palettes where a token exists.
- **Aesthetic.** Parchment/ivory ground, gold accents, Playfair Display for
  display/serif, Lato for body. Warm, editorial, calm.
- **`'use client'`** for interactive nav components (they use router/state).
- **Data access** stays via `base44.entities.*` / `base44.functions.invoke` and
  the existing server actions; no new data layer.
- **Accessibility:** labelled controls (not icon-only), ≥44px touch targets,
  focus states, switcher operable by keyboard, respects reduced-motion.
- **Responsive:** rail (≥768px) / bottom bar + sticky identity (<768px); no
  horizontal page scroll; overlays already full-screen.

---

## 9. Open questions (need a decision before build)

1. **Global destination set.** What is the canonical list (§4.1)? Resolve the
   rail vs bottom-bar disagreement (`/home`, `/profile`, `/journey/...`,
   `/discover`, `/saved`). Which are primary, which go to overflow?
2. **My Recipes.** Give it a real destination (proposed `/recipes` built from
   editions' `taste_of_day`) or cut it for v1? It cannot ship as a no-op.
3. **Rail form on desktop.** Persistent labelled rail (wider) vs
   collapsed-with-expand-on-hover? Affects the width token and content offset.
4. **Mobile personal shelf.** Sticky compact identity header + chip row
   (recommended) vs a dedicated "My World" bottom-sheet tab?
5. **Instrumentation storage.** Extend `AnalyticsEvent` with the new event
   vocabulary (§5.1) in place, or introduce a dedicated events table? Impacts how
   `/parent-observatory` queries roll-ups.
6. **Dwell definition.** Exact rules for visibility-aware time (blur pause
   threshold, section in-view fraction) — needed so "time exploring" is
   defensible.

---

## 10. Success criteria

- One navigation model; rail and bottom bar never disagree on routes.
- "Hi, {name}", reader switching, and My Flags / My Book / My Recipes are
  reachable at all times (not scroll-dependent) on both desktop and mobile.
- Every navigation, open, collection view, and dwell emits a structured,
  child-scoped event — with no dependence on a section remembering to call a
  tracker, and no silent drops when the child loads late.
- `DGForParents` (and the Parent Observatory) render from **real** captured
  signal — breadth, depth, and trajectory — with the fallbacks gone.
- No dead controls; My Recipes either works or is removed.
- Child-facing copy stays play/ownership; parent-facing copy stays
  curiosity/growth. No measurement language shown to children, no comparison
  shown to parents.
