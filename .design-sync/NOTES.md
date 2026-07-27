# Maison d'Oré (Next.js) — design-sync notes

## Repo shape (important — non-standard)

- This is a **Next.js 16 app**, not a publishable component library. There is no
  `dist/` and no `main`/`module`/`exports` entry, and `package.json` is private.
- The bundle entry is a **hand-written barrel**: `.design-sync/entry.jsx`. It
  re-exports only the presentational surface (`components/maison/*`,
  `components/dailygold/*`, `components/theme/*`, `TreasuryHeart`) so the bundle
  never pulls in server actions, drizzle, pg or `server-only`.
- **Scope deliberately excludes `components/admin/*` and `components/auth/*`** —
  those are server-action-coupled editors, not design-system parts.
- Build command:
  ```sh
  node .ds-sync/package-build.mjs --config .design-sync/config.json \
    --node-modules ./node_modules --entry ./.design-sync/entry.jsx --out ./ds-bundle
  ```
- If presentational components are added/removed, update **both**
  `.design-sync/entry.jsx` and `componentSrcMap` in `.design-sync/config.json`.

## Stubs — why they exist

`.design-sync/stubs/` holds browser-safe replacements, wired through
`.design-sync/tsconfig.sync.json` `compilerOptions.paths`:

| Stub | Replaces | Why |
|---|---|---|
| `next-link.tsx` | `next/link` | Cards run outside Next; degrades to `<a>`. Also exports `useLinkStatus` (Next 16) — omitting it fails the bundle. |
| `next-navigation.ts` | `next/navigation` | No router in a card; `useRouter`/`usePathname` become no-ops. |
| `base44Client.ts` | `@/api/base44Client` | Keeps cards offline and deterministic; entity queries resolve empty. |
| `daily-gold-edition-actions.ts` | `@/app/daily-gold-edition/actions` | Real module is a server action importing drizzle/pg/`server-only`. |
| `profiles-actions.ts` | `@/app/profiles/actions` | Same. |

⚠️ **Never add a `"//"` documentation key to `tsconfig.sync.json`.** The
converter's tsconfig reader strips `//` line comments before `JSON.parse`, which
mangles that key into invalid JSON. `tsconfigPathsPlugin` then silently returns
`null`, **no** path mapping runs, and every `@/…` import resolves to the real
module — dragging `lib/auth.ts` → better-auth → pg into the bundle and failing
with a wall of `Could not resolve "events"/"crypto"/…` errors. Block comments
(`/* … */`) are stripped safely; use those. This cost a full debugging cycle.

## Styling / CSS

- `cfg.cssEntry` = `.design-sync/.cache/globals.compiled.css`, produced by
  **`node .design-sync/build-css.mjs`** — it runs `app/globals.css` (Tailwind v4
  source, `@import "tailwindcss"`) through the repo's own `@tailwindcss/postcss`
  plugin. That file is gitignored, so **re-run `build-css.mjs` before every
  sync**, and again if `app/globals.css` changes.
- `build-css.mjs` pins `@source` to `components/`, `app/`, `lib/` and
  `.design-sync/previews/` because Tailwind v4 auto-detection respects
  `.gitignore` and would miss the bundle output.
- **The components barely use Tailwind.** They style with inline styles plus
  component-local `<style>` blocks. Only ~12 class rules ship: `.mdo-btn`,
  `.mdo-card`, `.mdo-input`, `.mdo-divider`, `.mdo-nav-link`, `.mdo-signin`,
  `.mdo-story-back`, `.gold-ink-reveal`, `.hero-breathe`, plus GoldenStory's
  CSS-module output. This is recorded in `conventions.md` because a design agent
  that assumes a Tailwind preset will emit entirely unstyled markup.
- `GoldenStory.module.css` is a CSS module; esbuild compiles it into
  `_ds_bundle.css` as `.GoldenStory_*` classes. Those are internal.

## Guidelines scope

`cfg.guidelinesGlob` is pinned to four **design** specs. The default glob
(`docs/*.md`) swept all 11 files in `docs/`, including engineering plans —
and `docs/daily-gold-migration-plan.md` contains a **live base44 API key**
(line 36). Do not widen this glob without re-checking for secrets.

## Playwright (render check)

Install `playwright@1.55.0` + `playwright-core@1.55.0` into `.ds-sync/` with
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` — that version pins chromium build **1187**,
already in `~/.cache/ms-playwright/`. Other versions fail with
"Executable doesn't exist".

## Preview overrides (cfg.overrides) — why each exists

- `DGModal` → `single` 760x560. Overlay; renders open by definition.
- `MaisonHeader` → `single` 1280x420. Below ~1100px the nav clips ("DISCOVE").
- `MaisonFooter` → `single` 1280x620. Three-column footer needs the width.
- `DGHero` → `single`, primary `WithArtwork`. Flagged `[GRID_OVERFLOW]` as
  fixed/portal — no grid layout can present it.
- `MMonogram` → `column`. The 96px size overflowed a grid cell.
- `DGBornToday` → `column` 1400x760, or the 5-across shelf wraps and clips.
- `DGGoodNews` → `single` 900x1150, primary `LeadAndMore`. The lead hero is tall
  enough that the secondary list falls outside a normal cell.
- `DGDestination`, `DGValuesStrip`, `DGInspirationBar`, `GoldenStory` → `column`.

## Component-specific findings

- **`GoldenStory`** needs `embedded` **and** a parent with a definite height.
  Without `embedded` it fits to `window.innerHeight` and collapses to just the
  page-turn arrows. Its `lessons` are objects (`{icon_name, lesson}`), not
  strings — passing strings silently renders empty rows.
- **`DGHero`** overlays artwork at 0.75 opacity behind a radial mask and an
  ~80%-opaque cream wash. Pale art is invisible; preview art is deliberately
  saturated so `WithArtwork` differs from `WithoutArtwork`.
- **`DGModal`** is `position: fixed; inset: 0` — the preview wraps it in a
  `transform: translateZ(0)` stage so it is contained by the card.
- **`DGDestination`**'s four sensory tiles read off `dest` itself
  (`taste_of_day`, `sound_of_day`, `nature_detail`, `tiny_phrase` as
  `{name|word, translation, language}`), not off a separate edition prop.
- All preview artwork is **inline data-URI SVG**, deliberately: the sibling
  base44 repo lost `GoldenSealIcon` to a floor card because its remote image
  URLs 404. Nothing here depends on the network at render time.

## Floor cards (4) — authorable on any re-sync

`ChildSwitcherOverlay`, `DGIdentityHeader`, `FlagCollectionView`,
`FlagSealCelebration`. All four are interaction- or fetch-driven
(profile switching, a celebration animation, a base44-backed collection), so
they have no meaningful static composition. The other 9 unauthored components
render real content from crash-prevention props.

## Known render warns (triaged — not new on re-sync)

- `[FONT_REMOTE]` for Lato, Source Sans 3, Playfair Display, Great Vibes —
  `app/globals.css` opens with a Google Fonts `@import`. Expected; they load at
  runtime. No `@font-face` ships, and none should.
- `[DOCS_UNMAPPED]` for all 30 — there are no per-component doc files; every
  `.prompt.md` is synthesized from the `.d.ts` plus the authored preview.
- `[NO_DIST]` is **not** expected — the `--entry` flag supplies the barrel.

## Re-sync risks (watch-list)

- **`globals.compiled.css` is gitignored** — a fresh clone has no `cfg.cssEntry`
  until `node .design-sync/build-css.mjs` runs. The build will fail confusingly
  without it. Run it first, always.
- **`entry.jsx` / `componentSrcMap` drift** if presentational components are
  added or removed — neither is auto-derived.
- **Stub drift**: if a component starts importing a new server action or
  `next/*` API, the bundle breaks until a stub is added and mapped in
  `tsconfig.sync.json`. `useLinkStatus` was already one such surprise.
- **Remote fonts** must be reachable at render time or cards fall back to system
  fonts, which silently changes every screenshot.
- **The sibling repo `/home/athecoder/maison-d-or-ejected` syncs to a different
  project** (`f8a3f114-2c05-4583-a029-9a4b5164ef0f`, the legacy base44 UI kit).
  Do not cross the two `projectId`s.
- Preview data (people, events, destinations) is **invented composition**, not
  real rows. If the schema changes shape, previews may render empty without
  failing the render check.
