# Remarkable Person Editor — Specification (v1)

Audience: UI/UX design. This document describes what the editor is, who uses it,
the content it edits, the workflows it must support, and the constraints the
design must respect. It deliberately avoids prescribing implementation or visual
style beyond the house constraints listed at the end.

---

## 1. What this is

An admin-only editor for creating and editing **remarkable persons** — the
illustrated children's biographies ("Golden Stories") that power the
**Born Today** section of the Daily Gold Edition and the `/stories/<slug>`
storybook pages.

A remarkable person is not a form record; it is a **book**. It renders as a
fixed-size (1300×866) leather-bound storybook of parchment spreads the reader
flips through: cover → childhood page → chapters → life timeline → treasures &
lessons → closing page. The editor's job is to let one admin produce and refine
these books quickly, with AI doing the heavy lifting and the admin acting as
**curator and art director**, not typist.

### Users

- A single admin (the family's parent/owner). Desktop-first; no mobile editing
  layouts required. No multi-user concurrency to design for.
- Trust level: full. The design problem is efficiency and confidence, not
  permissions.

### Why the person exists (surfacing rules the design should convey)

- Each person is keyed by a URL **slug** (e.g. `albert-einstein`) — the slug is
  the identity and the public URL. It is chosen once at creation and never
  changes.
- **Born Today** surfaces a person on the month-day of their `birth_date`. A
  person without a full birth date can never surface — this is the one field
  the editor should treat as effectively required, with the reason stated.
- Content is live immediately: the public story page re-reads the database on
  every request. "Save" without a draft concept means "publish to families."

---

## 2. The content model (what the admin edits)

The book, in reading order. Every image field may legitimately be empty — the
book renders a labeled parchment placeholder in its place — so "no image yet"
must look like a normal state, not an error.

| Book section | Fields |
|---|---|
| **Cover** | name, story title, role (poetic epithet, e.g. "Painter, Inventor & Endless Dreamer"), field, country, birth date (full date, required), death date (year-only, full date, or "living"), famous quote, cover image |
| **Childhood page** | childhood title (e.g. "A Little Boy in Vinci"), childhood narrative, childhood landscape strip image |
| **Chapters** (ordered list, typically 4) | per chapter: title, narrative, image, layout hints (below) |
| **Modern page** ("If X were 10 today") | title, narrative, image, layout hints |
| **Timeline** (ordered list, typically 5) | per entry: year, caption, small vignette image |
| **Treasures** (ordered list, typically 6) | per treasure: name, description, spot image |
| **Lessons** (list, typically 4) | per lesson: icon name (one lowercase word, e.g. "curiosity") + one-line lesson |
| **After-treasures page** ("Gifts That Live On") | title, narrative, image, layout hints |
| **Takeaway** | one-line story takeaway shown on the closing page |

### Layout hints (per chapter / modern / after-treasures)

These control how a page composes, and their effect is purely visual — they
must be presented as **visual pickers with small spread diagrams**, never text
inputs (unrecognized values silently fall back to the default):

- `page_span`: **default** (classic spread: text on left leaf, art on right) ·
  **single** (art + text share one leaf) · **both** (full-bleed art across the
  spread, text overlaid) · **image** (art only, one leaf, no text). Two
  consecutive single/image chapters pair up onto one spread — so reordering
  chapters can repaginate everything after them.
- `blend`: **multiply** (default — art painted on white melts into the
  parchment) · **normal** (opaque art shown as-is; used for the cover, the
  modern spread, and the final image-only chapter).
- `fade`: on by default; a legibility wash behind text overlaid on art. Only
  meaningful for single/both spans.

### Text conventions

Narratives are picture-book stanzas: a blank line starts a new paragraph, a
single line break is a hard break within a stanza. House writing rules: 40–70
words per page (never > 75), 6–9 words per sentence, one idea per page. The
editor should surface a soft warning when a narrative likely overflows its leaf
— leaf capacity, not a character count, is the real limit.

---

## 3. Core design requirement: live book preview

The single most important property. The editor must render the **actual
storybook** (the same renderer families see) alongside the editing surface,
and keep it in sync:

- Editing a chapter jumps the preview to that chapter's spread.
- Layout-hint changes, text edits, and image changes reflect immediately.
- The admin must be able to flip through the whole book from inside the editor.

Rationale: layout hints and stanza breaks are incomprehensible as abstract
values; text overflow of the fixed-size leaf is invisible in a form; image
blend behavior (multiply vs opaque) only exists on the parchment. Without the
live preview every edit becomes a save-and-check-the-site loop.

A suggested arrangement (designer's call): section navigation rail → editing
panel → book preview pane, with the preview collapsible for focused writing.

---

## 4. AI assistance (the generation pipeline in the UI)

An existing pipeline (script `scripts/generate-story-openrouter.mjs`) already
generates complete books: Claude writes a structured **brief** (all text plus
one *scene description* per image slot, a *character sheet* fixing the
protagonist-as-child's appearance, and a *golden thread* — the story's single
defining quality), then fixed style/composition blocks are prepended to each
scene to form the final **image prompt**, then an image model renders each
slot. The editor wraps this pipeline step by step. AI assistance is always
**propose → review → accept**; it never overwrites admin work silently.

### 4.1 Suggest a person for a date

Entry point: the library's calendar coverage view (see §6) or a "New person"
flow. Given a month-day, AI proposes candidate figures born that day suitable
for ages 5–10, excluding people already in the library. Admin picks one (or
types their own) → flows into brief generation.

### 4.2 Generate the story text (the brief)

One action generates the entire book's text: all narratives, titles, quote,
timeline, treasures, lessons, plus the per-slot scene descriptions, character
sheet and golden thread. Design implications:

- Takes **minutes**, not seconds. Needs a progress state the admin can leave
  and return to; on completion the book populates and the preview comes alive.
- The brief is persisted; scenes/character sheet remain viewable and editable
  afterward — they are the source for image prompts.
- Regeneration of text must be possible per-field or per-section (e.g.
  "rewrite this chapter's narrative") without touching the rest, always with
  accept/reject against the current version.
- The golden thread and character sheet should be visible somewhere ambient —
  they are the story's spine and the art's consistency anchor.

### 4.3 Images: the dual-path workflow (the most important AI feature)

Every image slot (~17 per book: cover, childhood strip, 4 chapters, modern,
after-treasures, 5 timeline vignettes, 6 treasure spots) carries a fully
assembled **prompt** = fixed style block + this slot's scene + a fixed
composition/bleed block that depends on the slot type. Per slot, the admin can
go **either way, interchangeably, at any time**:

**Path A — generate in-app.** Review/edit the prompt → generate via the app
(OpenRouter) → result previews *on the parchment with the slot's real blend
mode* → accept / regenerate / revert. Per-slot regeneration must not touch
other slots.

**Path B — generate outside.** Copy the full prompt (plus the parameters that
are not prompt text: the slot's pixel size, and the white-background
requirement for multiply slots) → use any external tool → return and upload
the finished image into the slot.

Design requirements for the slot card:

- The prompt is shown **decomposed**: the fixed style/composition blocks appear
  as a read-only (collapsed) preamble; the editable part is the **scene**.
  Editing the scene re-derives the full prompt. An "edit full prompt" escape
  hatch exists for the rare override, and overrides are visibly flagged.
- **Copy** must be one click and must include/state the generation parameters:
  exact size (e.g. 1024×1536) and, for multiply slots, "the background must be
  pure flat white — off-white or textured backgrounds will show as a box on
  the page."
- **Upload** accepts PNG/webp. On upload into a multiply slot the app checks
  the corner pixels and warns if the background isn't near-white (warn, not
  block).
- Slot status is glanceable across the whole book: empty / prompt ready /
  generating / generated / uploaded / failed-retry. A book-level "generate all
  missing images" action runs slots in parallel with per-slot progress and
  per-slot failure ("14 of 17 done; timeline-2 failed — retry?"); one failure
  never discards completed slots.
- Character-sheet consistency note: chapter/timeline scenes that show the
  protagonist should start with the character sheet verbatim — if the admin
  edits a scene and drops it, a gentle hint is warranted.

### Cost/latency honesty

Text generation: minutes. Each image: tens of seconds. The design should treat
generation as **jobs with visible state**, never a blocking spinner over the
whole editor; the admin keeps editing other sections while images render.

---

## 5. Creating, saving, safety

- **Create flow**: from a date suggestion (§4.1) or from a typed name. Slug is
  auto-derived from the name, editable only before first save, with a
  collision check ("this will overwrite Albert Einstein") — never a silent
  overwrite.
- **Autosave / never lose prose.** Long-form writing must survive navigation,
  generation jobs, and browser mishaps. A visible saved/dirty indicator.
- **Save vs publish.** Because saves are otherwise instantly public, the design
  should assume a draft state exists: a person is either *draft* (invisible to
  families) or *published*, with an explicit publish action and a clear
  indicator of which state you're editing. Editing a published person should
  make the immediacy of changes evident.
- Deleting a person is rare and destructive → strong confirmation, typed slug.

---

## 6. The library (list view)

The entry screen. It answers the admin's operational questions, not just
"what exists":

- **Calendar coverage**: a month-day grid showing which days have a person and
  which don't — the primary "what should I make next?" tool, and the entry
  point for date-based AI suggestions (§4.1).
- Person cards/rows: cover thumbnail, name, birth month-day, draft/published
  state, and completeness badges (missing birth date · missing cover · N
  images empty · no chapters).
- Search by name; filter by incomplete / draft / month.

---

## 7. Out of scope for v1

- Multi-admin presence, roles, or conflict resolution.
- Mobile editing layouts (the preview book is 1300×866; desktop-first).
- Editing the other Daily Gold content types (good news, on-this-day,
  greatest moments) — same admin shell, separate editors, later phases.
- Version history / revert-to-previous beyond accept/reject of AI proposals.

---

## 8. House context for the designer

- Existing admin shell (`app/admin/page.tsx`): warm parchment ground
  `#F5F0E7`, panels `rgba(255,248,238,.8)` with hairline gold borders
  `rgba(201,169,110,.25)`, ink `#241A0C`, muted brown `#5C4A2A` / `#8B7355`,
  gold accent `#C9A96E`. Headings in Playfair Display, body in Lato,
  uppercase letter-spaced kickers.
- The editor is a professional tool wearing the house's calm, warm identity —
  closer to a well-lit atelier than a dashboard. The storybook itself, shown
  in the preview, is the most beautiful thing on the screen; the chrome
  around it should defer to it.
