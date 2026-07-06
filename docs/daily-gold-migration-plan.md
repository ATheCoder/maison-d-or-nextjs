# Migrate DailyGoldEdition into the Next.js 16 app (base44 backend, no auth)

## Context

The Daily Gold Edition page currently lives in the ejected Vite app (`/home/athecoder/maison-d-or-ejected/src/pages/DailyGoldEdition.jsx`). Goal: move it (and its full dependency tree) into the fresh Next.js 16.2 app at `/home/athecoder/maison-d-or-nextjs`, keep base44 as the hosted backend/database, and remove all authentication/authorization. The ejected app's base44 client already runs auth-free via an `api_key` header, so the client config ports almost verbatim; the remaining work is App Router restructuring, react-router → next/navigation conversion, and stripping `base44.auth.me()` calls.

Verified facts shaping the plan:
- The full import closure is **24 files** and uses **no external UI packages** (no framer-motion/lucide/date-fns/canvas-confetti — verified by grep). Only new npm dep: `@base44/sdk`.
- `@base44/sdk@0.8.35` is SSR-safe (all `window`/`localStorage` access guarded; `requiresAuth` defaults to `false`).
- Target `tsconfig.json` already has `allowJs: true` and `@/*` → project root — mirroring the source's directory shape means **zero import-path rewrites**.
- `base44.auth.me()` appears in exactly 3 files in the closure: the page, `DGNavigationRail.jsx`, `ChildGreetingStrip.jsx`.
- The "Aurora is preparing" pill uses `@keyframes mdo-pulse` from the ejected app's `src/index.css:173` — must be ported.
- Target `globals.css` already loads Playfair Display + Lato, but is missing the Playfair *italic 600* axis the page uses.

## Steps

### 1. Install dependency
```
npm install @base44/sdk@^0.8.35
```
(Only package needed.)

### 2. Route-group restructure (keep MaisonHeader off the DG page)
The root layout mounts a sticky `MaisonHeader` that would collide with DG's fixed nav rail / full-screen overlay:
- `app/layout.tsx`: remove `<MaisonHeader />` (keep html/body, metadata, `globals.css` import).
- New `app/(site)/layout.tsx`: server component rendering `<><MaisonHeader />{children}</>`.
- Move `app/page.tsx` → `app/(site)/page.tsx` (landing page keeps `/` and its header; route groups don't change URLs).

### 3. base44 client (no auth)
Create `api/base44Client.js` at project root (so existing `@/api/base44Client` imports resolve unchanged):
```js
import { createClient } from '@base44/sdk';

export const base44 = createClient({
  appId: process.env.NEXT_PUBLIC_BASE44_APP_ID ?? '69dba1f66d3b6e4e9e515e5c',
  headers: { api_key: process.env.NEXT_PUBLIC_BASE44_API_KEY ?? 'a583b146482742d5930736abb79b966f' },
});
```
- Add `.env.local` with both `NEXT_PUBLIC_*` vars. Note: the key is exposed in the browser either way (same as the ejected app); a server proxy can be layered in later without touching components.
- **Drop `src/lib/app-params.js`** — Vite-specific (`import.meta.env`) and only served the localStorage token/auth flow; dead under no-auth.

### 4. Copy files (source `src/…` → target project root, keep `.jsx`)
| Source | Target |
|---|---|
| `pages/DailyGoldEdition.jsx` | `components/dailygold/DailyGoldEditionPage.jsx` (renamed) |
| `components/dailygold/` — DGHero, DGBornToday, DGGoodNews, DGOnThisDay, DGDestination, DGMoreToExplore, DGForParents, DGNavigationRail, DGMobileTabBar, DGValuesStrip, DGGreatestMoments, DGWaxSealNavigator, DGInspirationBar, FlagSealCelebration, FlagCollectionView, ChildGreetingStrip, FlagSealMedallion, SaveHeartSeal (18 files) | `components/dailygold/` same names |
| `components/treasury/TreasuryHeart.jsx` | `components/treasury/TreasuryHeart.jsx` |
| `components/theme/ThemeContext.jsx`, `themes.jsx` | `components/theme/` |
| `lib/maisonDesignSystem.js` | `lib/maisonDesignSystem.js` (pure constants, verbatim) |

Do NOT migrate `DGTinyWonder.jsx` (imported by the page but never rendered — drop the import) or `DGChildSelector.jsx` (not in the closure).

### 5. Route file
`app/daily-gold-edition/page.tsx` — minimal server component (allows `metadata`):
```tsx
import DailyGoldEditionPage from '@/components/dailygold/DailyGoldEditionPage';
export const metadata = { title: 'Daily Gold Edition' };
export default function Page() { return <DailyGoldEditionPage />; }
```

### 6. Code transformations

**6a. `'use client'`** — add to all 22 migrated component/theme `.jsx` files (not `lib/maisonDesignSystem.js` or `api/base44Client.js`). Strictly only the entry needs it, but every file uses hooks/browser APIs and it future-proofs direct imports.

**6b. Router hooks** (`react-router-dom` → `next/navigation`):
- `DailyGoldEditionPage.jsx`, `DGMoreToExplore.jsx`, `DGForParents.jsx`, `DGBornToday.jsx`: `useNavigate` → `useRouter`; `navigate(x)` → `router.push(x)`.
- `DGHero.jsx`: `useLocation` → `usePathname`; also delete its unused `base44` import.
- `DGNavigationRail.jsx`, `DGMobileTabBar.jsx`: both hooks converted.
- `ChildGreetingStrip.jsx`: receives `navigate` as a prop — in the page pass `navigate={(path) => router.push(path)}`.
- Dead routes (`/storybook/...`, `/parent-observatory`, `/academy`, etc.) stay as-is; they 404 until those pages are migrated. Accepted.

**6c. Auth removal (3 files):**
- `DailyGoldEditionPage.jsx`: drop `base44.auth.me()` from the `Promise.all` (user stays `null`); guard `if (user || child)` → `if (child)`; `parent_email: null` in `AnalyticsEvent.create` stays.
- `DGNavigationRail.jsx`: delete the `useEffect` calling `auth.me().then(setUser)`; profile affordance degrades gracefully.
- `ChildGreetingStrip.jsx`: replace `auth.me().then(u => Child.filter({ parent_email: u.email }, …))` with `base44.entities.Child.list('-created_date', 20)` — correct for a no-auth single-tenant DB.

**6d. Page cleanups (`DailyGoldEditionPage.jsx`):**
- Delete the debug `getRandomChildId` effect (lines 118–126) and stray `console.log`s.
- Remove both `navigate('/daily-gold')` redirects — if the child fetch fails, clear stale sessionStorage keys and continue with `child = null` (all child UI is already conditional).
- Drop the `DGTinyWonder` import.

**6e. sessionStorage/SSR:** move the `getSessionChild()` restore out of the `useState` lazy initializer into the data-loading `useEffect` (`useState(null)`, then `const cached = getSessionChild(); if (cached) setChild(cached);`) — avoids any SSR/hydration edge case.

**6f. Styles/fonts:**
- In the page's first `<style>` block: delete the Google Fonts `@import` line (fonts come from `globals.css`); keep the keyframes/box-sizing/scrollbar rules; **add `@keyframes mdo-pulse`** copied from ejected `src/index.css:173–176`.
- `app/globals.css` line 1: extend the Playfair Display axis list with `;1,600` so italic-600 headings don't synthesize.

**6g. Error boundary:** keep the inline `DGErrorBoundary` class component (fully supported in React 19 client components). Optionally add `app/daily-gold-edition/error.tsx` as a route-level net — not required for parity.

### Pitfalls already cleared
- No `import.meta.env` in any migrated file (only in dropped `app-params.js`).
- Date/`toISOString` hydration risk is nil — all date markup is behind the `loading` gate; don't "fix" preemptively.
- `document.body.style.overflow` / listeners are all inside effects — fine.
- ESLint will warn on `<img>` usage (`no-img-element`) — warnings only, ignore.
- No `next.config.ts` changes needed (plain `<img>`, Turbopack compiles `.jsx` via existing `allowJs`).

## Verification
1. `npm run dev`; visit `/` — landing page still renders with MaisonHeader.
2. Visit `/daily-gold-edition` — gold-sun loading overlay, then content fades in, no MaisonHeader.
3. DevTools Network: successful base44 calls (`Child.filter`, `DailyGoldEdition.filter`; `generateDailyGoldWithMoodboard` only if today's edition is missing); **no auth endpoints, no 401s**.
4. Console: no hydration warnings, no `sessionStorage` ReferenceError.
5. Interactions: wax-seal date navigator, save-heart (`saveItem`), flag-earn celebration, flag collection overlay, child switcher lists children, theme loads from `theme_preference`, "Aurora is preparing" pill pulses.
6. Nav rail/tab bar clicks push routes (404s for unmigrated routes are expected — confirm no crash).
7. `npm run build` completes clean under Turbopack.
