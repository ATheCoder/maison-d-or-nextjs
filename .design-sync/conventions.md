# Maison d'Oré — how to build with this design system

An editorial, print-inspired system: warm parchment grounds, gold rules, Playfair
Display headings over Lato body text. Everything below is verified against the
shipped bundle.

## 1. Wrap everything in ThemeProvider

Every `DG*` component, `TreasuryHeart`, and `FlagSealMedallion` calls `useTheme()`.
Outside a provider they render blank. Wrap once, at the root:

```jsx
const { ThemeProvider, DGHero, DGInspirationBar } = window.MaisonDoreNext;

<ThemeProvider>
  <DGHero dateStr="Monday, 27 July 2026" heroImageUrl={art} />
  <DGInspirationBar edition={{ daily_quote: '…', daily_quote_author: '…' }} />
</ThemeProvider>
```

`useTheme()` returns the active palette. Use it for inline styles — this is how
every shipped component styles itself:

`bgPrimary` `bgSoft` `bgCard` `bgParchment` `bgOverlay` · `textHeadline`
`textBody` `textMuted` · `accentGold` `accentSage` `accentSecondary`
`accentTertiary` · `fontHeadline` `fontBody` · `radiusSmall` `shadowSoft`
`shadowDeep`

Five palettes ship: `lightAiry` (default), `coastalBlue`, `sageEarth`,
`blushGold`, `nightMode` — exported as `THEMES` / `DEFAULT_THEME`.

## 2. There is no utility-class vocabulary — this is important

This DS ships **no Tailwind utilities**. Writing `bg-surface-1`, `p-4`, `gap-md`
or any similar class produces **completely unstyled output**. For your own layout
glue, use the CSS custom properties below in inline styles or your own CSS.

**Design tokens** (defined on `:root`, safe to use anywhere):

| Colour | | Type |
|---|---|---|
| `--ivory` `#FAF7F2` page ground | `--linen` `#F0E6D3` tinted panel | `--font-serif` Playfair Display |
| `--gold` `#C9A96E` | `--surface` `#F5EFE2` | `--font-sans` Lato |
| `--gold-light` `#D4B896` | `--border` `#E8DDD0` hairlines | `--font-script` Great Vibes |
| `--brown` `#2C2416` headings | `--taupe` `#8B7355` body text | |

**Global classes** — the only ones that exist:
`.mdo-btn` · `.mdo-card` · `.mdo-input` · `.mdo-divider` · `.mdo-nav-link` ·
`.mdo-signin` · `.mdo-story-back` · plus animation helpers `.gold-ink-reveal`
and `.hero-breathe`.

Anything matching `GoldenStory_*` is that component's internal CSS-module output.
Never write those class names yourself.

## 3. Where the truth lives

Read these before styling anything: `_ds/<folder>/styles.css` and the
`_ds_bundle.css` it imports (all tokens, `.mdo-*` rules, and component CSS), and
each component's `components/<group>/<Name>/<Name>.prompt.md`. The design specs
under `guidelines/` describe the Daily Gold navigation model, flag-seal
collection, and the Golden Story book format.

## 4. Component gotchas that will cost you a render

- **`MaisonBrandName`** is the protected wordmark. Never wrap it in
  `text-transform` — it breaks the canonical casing of "Maison d'Ore".
- **`DGHero`** overlays its artwork heavily (0.75 opacity, a radial mask, and an
  ~80%-opaque cream wash) to keep the masthead legible. Pale images vanish; hero
  art needs real contrast.
- **`GoldenStory`** must get `embedded` plus a parent with a definite height, or
  it fits itself to `window.innerHeight` and collapses to nothing:
  ```jsx
  <div style={{ position: 'relative', height: 460 }}>
    <GoldenStory story={story} page={0} embedded />
  </div>
  ```
- **`DGModal`** is `position: fixed; inset: 0`. To contain it in a panel rather
  than the whole page, give an ancestor `transform: translateZ(0)`.
- **`DGBornToday`** lays out five volumes across; below roughly 1100px it reflows
  to two. Give it full width.
- Components that fetch their own data (`ChildSwitcherOverlay`) render empty in a
  preview. Everything worth composing takes props — including the collection
  views (`FlagCollectionView`, `TreasuryView`) and `TreasuryHeart`, whose saved
  state is server-fed rather than fetched on mount.

## 5. An idiomatic composition

```jsx
const { ThemeProvider, useTheme, MaisonDivider, DGOnThisDay } = window.MaisonDoreNext;

function Almanac({ events }) {
  return (
    <ThemeProvider>
      <main style={{ background: 'var(--ivory)', padding: '3rem 6vw' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', color: 'var(--brown)' }}>
          The Living Almanac
        </h1>
        <p style={{ color: 'var(--taupe)' }}>What the world did on this day.</p>
        <MaisonDivider style={{ margin: '2.5rem 0' }} />
        <DGOnThisDay events={events} />
        <button className="mdo-btn">Read the whole edition</button>
      </main>
    </ThemeProvider>
  );
}
```
