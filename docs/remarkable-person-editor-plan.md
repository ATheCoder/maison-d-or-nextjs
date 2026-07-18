# Remarkable Person Editor — Implementation Plan

Implements the approved Claude Design
(`Remarkable Person Editor.dc.html`, project `0a7106c6`) against the spec in
`docs/remarkable-person-editor-spec.md`. The design covers four screens:

1. **The editor** — top bar (back to library, name + slug chip, autosave
   indicator, Draft/Published segmented control, "Publish to families"),
   232px section rail with completeness dots + illustrations progress panel,
   center editing panel (chapter title + ✦ Rewrite, narrative field with
   word-count chip and stanza-convention hint, "How this page composes"
   layout pickers with spread diagrams, chapter-illustration summary card),
   512px live book pane on the dark stage with flip controls.
2. **The image slot** — parameter chips (leaf, size, blend + white-bg),
   decomposed prompt (🔒 fixed blocks collapsed, editable scene with
   character-sheet text highlighted, "Edit full prompt" escape hatch),
   Path A (generate here: parchment preview, Regenerate/Revert/Accept) and
   Path B (Copy prompt + parameters, size/white-bg callout, PNG/webp
   drop zone with corner-pixel check), slot state chips.
3. **Generate story text** — a leave-and-return job with staged progress
   (brief → character sheet/golden thread → narratives → lists → scenes),
   per-field rewrite as CURRENT vs ✦ AI PROPOSES with Reject/Try again/Accept,
   golden-thread and character-sheet panels.
4. **Image status board** — 6-column grid of all ~17 slots with per-slot
   state (generated/uploaded/generating/empty/failed), "Generate all
   missing", failure banner with per-slot retry that never discards
   completed slots.

The library screen (spec §6) is not in this design; v1 ships a minimal list +
create flow and leaves the calendar-coverage grid for a follow-up design pass.

**Before writing any code**: this repo's Next.js has breaking changes — read
the relevant guide in `node_modules/next/dist/docs/` first (AGENTS.md).

---

## Standing decisions

- **Auth**: every new server action and route handler starts with
  `requireAdmin()` (lib/dal.ts). Server actions are open endpoints — validate
  all inputs in the action, as the existing actions do.
- **Storage**: editor images go to R2 under `story-media/<slug>/<file>.webp`
  (the prefix `upload-story-media.mjs` already uses), converted to webp via
  sharp, public URL `${R2_DOMAIN}/<key>`. Reuse the `getS3()` pattern from
  `app/daily-gold-edition/actions.ts` (lift it into the shared module).
- **Editor state shape**: the editor edits a `PersonRecord` (the story.json
  shape `<GoldenStory>` consumes) in memory and maps to DB columns only on
  save — this makes the live preview a plain prop pass.
- **Jobs**: DB-backed job rows + in-process async runner + client polling.
  No queue infra; single admin, self-hosted Node server. If deployment ever
  moves to serverless, only the runner needs replacing.
- **AI proposals never overwrite silently**: generation writes into job
  results / brief storage; applying to the person is an explicit accept
  (the initial whole-book generation on a fresh draft auto-applies, since
  there is nothing to overwrite).

---

## Phase 1 — Schema + shared generation module (no UI)

**Schema** (`src/db/schema.ts`, one migration):

- `remarkable_person`: add `published boolean not null default false`.
  Migration backfills `true` for all existing rows (they are live today).
  Public readers — `getPersonBySlug`, the Born Today query — filter on it;
  admin readers don't.
- New `story_brief` table: `slug` (PK, FK → remarkable_person, cascade),
  `brief jsonb` (the writer's output: narratives, scenes, character_sheet,
  golden_thread), `prompt_overrides jsonb` (per-slot full-prompt overrides,
  keyed by slot file), `updated_at`.
- New `generation_job` table: `id serial PK`, `slug`, `kind`
  (`'brief' | 'images' | 'slot' | 'rewrite'`), `state`
  (`'running' | 'done' | 'failed'`), `progress jsonb` (stage list / per-slot
  states, mirroring screens ③ and ④), `result jsonb` (e.g. a rewrite
  proposal), `error text`, timestamps.

**Shared module** `lib/golden-story/` — port the script's core to TypeScript:

- `prompts.ts` — STYLE / STRIP_BLEED / SINGLE_BLEED / COVER_BLEED / PAPER /
  OPAQUE blocks and `buildSlots(brief)` (pure). Extend each slot with the
  display metadata the design shows: label ("Chapter 2 · illustration"),
  leaf/placement, blend, and which brief field its scene comes from.
- `brief.ts` — `BRIEF_SCHEMA`, `WRITER_SYSTEM`, `writeBrief(name)` (streamed
  OpenRouter call, verbatim from the script), plus `suggestPersons(monthDay,
  excludeNames)` and `rewriteField(brief, fieldPath)` prompts.
- `images.ts` — `renderImage(prompt, size, quality)` verbatim.
- `storyJson.ts` — `toStoryJson(brief, slug, imageUrlFor)` with the image-URL
  resolver injected (CLI: `/stories/<slug>/x.png`; editor: R2 URLs).
- `storage.ts` — `getS3()` + `putStoryImage(slug, file, buffer)`
  (sharp → webp → PutObject → public URL).
- Rewrite `scripts/generate-story-openrouter.mjs` as a thin CLI over the
  module (run via `node --experimental-strip-types` or a tiny wrapper);
  behavior and flags unchanged.

**Verify**: migration round-trips (`drizzle-kit`), CLI still generates
Leonardo's prompts byte-identically (`--prompts-only --reuse-brief` diff
against `art/raw/leonardo/prompts.md`), public story page still renders.

## Phase 2 — Library v1 + create flow

Route `app/admin/people/page.tsx` (+ actions file):

- `listPeople()` — slug, name, birth month-day, published, cover thumb, and
  completeness (counts of empty image slots, missing birth date/chapters)
  computed in the query.
- Person rows/cards per the house admin style; badges reuse the design's
  chip/dot vocabulary. Search by name; filter draft/incomplete.
- **Create**: name input → slug preview (script's slugify), slug editable
  only here, collision check with explicit "overwrite Albert Einstein?"
  confirmation; creates an unpublished row and opens the editor.
- **Delete**: typed-slug confirmation; also deletes `story_brief` rows
  (cascade) — R2 objects are left in place (cheap, and slugs may return).
- Wire the "Remarkable people" card in `app/admin/page.tsx` to link here.

## Phase 3 — Editor shell + live preview (screen ①)

Route `app/admin/people/[slug]/page.tsx` (server: loads person + brief +
running jobs) hosting a client `PersonEditor`.

- **Layout**: top bar / rail / editing panel / preview pane exactly as
  designed (232px rail, fluid center, 512px collapsible preview).
- **State**: one `PersonRecord` draft in a reducer; section list derived from
  it (Cover, Childhood, Chapter n · title, Modern, Timeline x/y, Treasures,
  Lessons, After-treasures, Takeaway) with the design's dot semantics
  (done / partial / empty / no-art warning).
- **Autosave**: debounced (~2s after last edit) server action
  `savePerson(slug, record)` mapping record → DB columns; saved/dirty
  indicator with timestamp as designed; `beforeunload` guard while dirty.
- **Draft/Publish**: segmented control reflects `published`; "Publish to
  families" flips it (with a confirm noting it goes live immediately);
  editing while Published shows the amber treatment from the design.
- **Live preview**: render the real `<GoldenStory story={draft}>` inside the
  dark stage, scaled to the 512px pane (it already scales via its fixed
  1300×866 canvas). Small renderer change: accept optional controlled
  `page`/`onPageChange` props (default = current internal state, families'
  behavior untouched) and export a `spreadIndexFor(section)` helper so
  selecting a rail section flips the book to that spread.

**Verify**: edit → autosave → reload round-trip; preview matches the public
`/stories/<slug>` page for the same data; publish toggle gates the public
page and Born Today.

## Phase 4 — Section editors (screen ① center panel)

Per-section editing panels, all against the draft record:

- **Cover**: identity fields; birth date as a required-with-reason date
  input; death date as the three-way control (full date / year only /
  living); quote; cover image slot card (Phase 6 component, placeholder
  until then).
- **Narratives** (childhood, chapters, modern, after-treasures): textarea
  preserving the stanza conventions, the convention hint line, live word
  count with the amber "Leaf nearly full" chip (>70 words) and red past 75,
  house-rule chip — all as designed.
- **Layout pickers**: the `page_span` spread diagrams (Classic / Single /
  Full-bleed / Art only), Blend segmented control, Fade switch with the
  "dimmed here — classic spans don't overlay text" disabled state. Values
  map 1:1 onto `page_span`/`blend`/`fade`; nothing free-text.
- **Chapters list**: add / delete / duplicate / drag-reorder (HTML
  drag-and-drop is fine at this scale); reorder renumbers and repaginates
  the preview live.
- **Timeline / Treasures / Lessons**: row editors with reorder; lesson
  icon_name as a picker over the icon set `DGBornToday`/GoldenStory actually
  renders.

**Verify**: every layout-hint combination previews identically to the public
renderer; chapter reorder repaginates correctly (two singles pairing).

## Phase 5 — AI text generation (screen ③)

Job infra + the writing flows:

- **Runner**: `startJob(kind, slug, run)` inserts a `generation_job` row,
  kicks the async function in-process, updates `progress` as stages
  complete, marks `done`/`failed`. One concurrent job per (slug, kind).
- **Polling**: the editor polls a `getJob(slug)` action every few seconds
  while a job is running (single admin — polling is fine; no SSE needed).
- **Generate the whole book**: action validates the person is empty-or-
  confirmed, runs `writeBrief`, persists to `story_brief`, applies
  `toStoryJson` text fields to the person (draft), stamps progress through
  the design's five stages. The editor shows the staged progress panel and
  the "you can leave this page" callout; on completion the form and preview
  repopulate.
- **Suggest a person for a date**: small action + picker in the create flow
  (full calendar-coverage entry point comes with the library redesign).
- **Rewrite one field**: ✦ Rewrite buttons run a `rewrite` job whose
  `result` holds the proposal; the CURRENT / AI-PROPOSES side-by-side with
  Reject / Try again / Accept applies only on Accept. Scene rewrites update
  the brief, narrative rewrites update the person.
- **Ambient panels**: golden thread (editable, stored in brief) and
  character sheet with its "verbatim anchor" explainer, per the design.

**Verify**: generate a real person end-to-end on a draft; kill the browser
mid-job and confirm the job finishes and the editor picks it up on return.

## Phase 6 — Image slots, dual path (screens ② and ④)

- **Slot model**: derive the ~17 slots from `buildSlots(brief)` joined with
  the person's image fields and any running `slot` jobs → per-slot status
  (empty / prompt-ready / generating / generated / uploaded / failed).
  "Uploaded" vs "generated" is recorded in `story_brief.prompt_overrides`'
  sibling metadata (per-slot source + accepted flag).
- **Slot card** (screen ②): parameter chips; fixed blocks collapsed behind
  "Show ▾"; scene textarea with the character-sheet span highlighted and
  the "consistency may drift" hint when it's absent; "Edit full prompt"
  stores an override and visibly flags it; editing the scene re-derives the
  prompt and updates the brief.
- **Path A**: `generateSlot(slug, file)` job → render via OpenRouter →
  sharp→webp → R2 under a staging key → preview composited on the parchment
  with the slot's real blend → Accept moves it to the canonical key and
  writes the person's image URL; Revert restores the previous URL.
- **Path B**: "Copy prompt + parameters" copies the assembled prompt plus a
  parameter footer (size, white-background rule for multiply slots — the
  design's callout text). Drop zone accepts PNG/webp; client-side canvas
  corner-pixel check warns (never blocks) on non-white corners for multiply
  slots; upload action stores to R2 and sets the URL with source
  `uploaded`.
- **Status board** (screen ④): the 6-column grid modal/panel fed by the
  slot model; "Generate all missing" starts an `images` job running slots
  with concurrency 3 and per-slot retry (port `renderAll`'s loop), progress
  in `job.progress` per slot; failure banner + per-slot retry; completed
  slots always kept. The rail's illustrations panel (12/17 + progress bar +
  "Generate all missing") reads the same model.

**Verify**: both paths on the same slot land pixel-identical treatment on
the public page; kill a batch mid-run and confirm completed slots persist
and retry only re-renders the failures.

## Phase 7 — Hardening + polish

- Public-surface sweep: `published` respected everywhere people are read
  (Born Today, story page, any sitemap/links); draft slugs 404 publicly.
- Stale-write guard: `savePerson` compares `updatedAt` and refuses with a
  reload prompt if another session wrote (cheap, per spec's non-goal).
- Run `/verify` and `/code-review` over the branch; fix findings.
- Follow-up backlog (explicitly out of v1): calendar-coverage library view
  (needs its own design pass), version history, editing the other Daily
  Gold content types in the same shell.

---

## Order and shippability

Each phase lands independently behind `/admin`: 1 is invisible plumbing,
2 gives a usable library over existing people, 3–4 make a fully manual
editor (already valuable — today editing means SQL), 5 adds the writer,
6 adds art. Nothing outside `/admin` changes until the Phase 1 `published`
filter, which is why its backfill-to-true migration ships in the same
commit as the filter.
