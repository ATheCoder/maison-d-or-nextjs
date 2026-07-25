# Flag Seal Collection ("Passport") — Requirements & Implementation Specification

**Feature name:** Flag Seals / My Flag Collection
**Target stack:** Next.js 16 (App Router) + TypeScript + **Drizzle** + Postgres, **no Base44**
**Source of truth:** reverse-engineered from the Base44/Vite implementation in `maison-d-or-ejected`
**Audience:** an implementing agent building this feature in `maison-d-or-nextjs`

> **Purpose of this document.** It is a complete, self-contained brief. Everything needed to
> rebuild the feature — data model, API contract, earn semantics, country resolution, visual
> tokens, component contracts, and the full 193-country reference list — is here. Sections
> marked **(Legacy bug — do not port)** describe defects in the original that the remake must
> fix rather than reproduce.
>
> **Read §0 first.** The first draft of this document was written against a generic
> Prisma/REST stack and against the assumption that the feature was greenfield here. Neither
> is true. §0 records what this codebase actually is, which parts of the feature are already
> (badly) ported into it, and the decisions taken to reconcile the two. Every section below
> has been updated to match; §0 exists so the *reasons* survive.

---

## 0. Implementation Context — this codebase

### 0.1 Stack reality

| Concern | Original draft assumed | This repo actually has | Effect |
|---|---|---|---|
| ORM | Prisma | Drizzle (`src/db/schema.ts`, `drizzle.config.ts`, migrations in `drizzle/`) | §3.2 rewritten as a Drizzle table |
| Child identity | client sends `childId`; server checks `child.parentId === session.userId` | `session.activeChildProfileId`, resolved server-side and family-scoped, via `lib/dal.ts` | §5.3 rewritten — the client never names a child |
| Ownership edge | `Child.parentId` (one parent) | `child_profile.familyId → family`; a family has many guardians | a `parentId` check would break co-parents |
| Transport | REST route handlers | server actions (`app/*/actions.ts`); only two route handlers exist (better-auth, Inngest) | §5.1 and §5.4 rewritten as server functions |
| Caching | `revalidateTag` | `force-dynamic` pages; `cacheComponents` not enabled in `next.config.ts` | R8.4 rewritten |

The ownership difference is the important one. §5.3 originally prescribed the standard fix for
the legacy IDOR (accept `childId`, verify the caller owns it). This codebase already solved the
problem one level higher: `lib/dal.ts` is a documented authorization boundary where child
identity comes *only* from the session, so a client-supplied child id has nowhere to enter. The
remake adopts that instead — it is strictly stronger than the fix originally specified here,
and it is the house pattern every other child-scoped surface already follows.

### 0.2 The feature is already half-ported — with its defects intact

This is **not** greenfield. The legacy components were copied into this repo verbatim and are
live, still calling Base44 at runtime:

| File | State |
|---|---|
| `components/dailygold/FlagSealMedallion.jsx` | legacy copy — emoji flags (L5), clickable `<div>` (L9) |
| `components/dailygold/FlagSealCelebration.jsx` | legacy copy |
| `components/dailygold/FlagCollectionView.jsx` | legacy copy — reads the **Base44 entity** directly; header comment still says "197", list is the wrong 193 (L4) |
| `components/dailygold/DailyGoldEditionPage.jsx:178-200` | `handleFlagEarn` → `base44.functions.invoke('earnFlagSeal')`; single-slot `celebration` state (L6) |
| `components/dailygold/DGBornToday.jsx:13` | live `COUNTRY_TO_ISO2` table; receives the dead `onFlagEarned` prop (L10) |
| `components/dailygold/DGDestination.jsx:8,31` | live `COUNTRY_TO_ISO2`; bidirectional `includes()` resolver (R4.8) |
| `components/dailygold/DGOnThisDay.jsx:9` | live `LOC_TO_ISO2` |

Three of the five legacy country tables are therefore live in this repo today. The two
storybook tables were never ported, so **L7's triple earn site does not exist here** — it only
needs to not be reintroduced (see R6.6a).

Implementation is consequently a *migration*, not a build: every task below has a "delete the
ported legacy version" half. Nothing is done until `api/base44Client.js` has no flag-seal
callers left.

### 0.3 Decisions taken

**D1–D4 are ratified** — they resolve the four architectural mismatches between the original
draft and this codebase, and the rest of this document is written as though they hold. Treat
them as settled; reopening one invalidates §3.2, §5, §7.4 and R8.4 together.

**D5–D7 are proposed, not yet approved.** They are scope additions rather than reconciliations,
so §11.2 sequences them but nothing else assumes them. See also the open product questions in
§11.3.

| # | Decision | Status | Rationale |
|---|---|---|---|
| D1 | **Drizzle, not Prisma.** §3.2 is a Drizzle table; migration generated via `npm run db:generate` into `drizzle/`. | ratified | Matches the repo. The translation is mechanical — `@db.Char(2)` → `char(…, { length: 2 })`, `String[]` → `.array()`, `@@unique` → `uniqueIndex` — but the array-union in the upsert is not; see R5.1. |
| D2 | **Server actions, not REST route handlers.** The feature's entry points live in `app/passport/actions.ts`. | ratified | Matches the repo: two route handlers exist in total (better-auth, Inngest); everything else is `app/*/actions.ts`. Also the only context Next 16 permits `updateTag`, should D4's caching stance ever change. |
| D3 | **The earn function takes no `childId`** — the active child comes from the session. | ratified | The draft's R5.7 (`where: { id: childId, parentId: session.userId }`) is unimplementable here: there is no `parentId`, ownership runs through `child_profile.familyId`, and a family has **multiple guardians**, so a user-id check would lock out co-parents. `lib/dal.ts` already establishes that the client never names a child. This closes L1 *by construction* rather than by validation — a stronger fix than the one originally specified. See §5.3. |
| D4 | **Passport is a real route, `/passport`, rendered dynamically.** | ratified | §7.4 already preferred a route over a modal; it is a destination, deserves a URL, and is shareable with the parent. Rendered dynamically because R8.4's `revalidateTag` is currently a no-op — `cacheComponents` is off and the daily-gold page is `force-dynamic` — and a per-child passport is cheap to render per request. If it is cached later, seals are per-child private data, so the primitive is `'use cache: private'` + `cacheTag`, invalidated with `updateTag`. Needs its own child-mode guard (R5.14). |
| D5 | Add `country_code` to `remarkable_person` | **proposed** | R4.1 is unimplementable without it — see §4.5 |
| D6 | Add `good_news` as a fourth earn source | **proposed** | §6.2; gated on the R6.8 backfill |
| D7 | Bundle SVG flag assets | **proposed** | R7.2; no such dependency exists yet, and the choice sets the medallion's asset-path contract (Q2) |

---

## 1. Product Overview

### 1.1 The concept

A child ("reader") explores the **Daily Gold Edition** — a daily illustrated magazine of good
news, notable people born on the date, historical events, and a featured world destination.
Every time the child encounters a **country** through that content, they collect a **Flag
Seal**: a vintage gold-rimmed circular medallion bearing that country's flag.

Seals accumulate into a personal **passport / flag collection** — a parchment wall showing all
193 countries, earned ones in full colour, unearned ones greyed out, with a completion
percentage. The metaphor is a traveller's passport gathering stamps.

### 1.2 Why it exists

- Turns passive reading into a **collection loop** — a reason to open tomorrow's edition.
- Rewards **breadth of curiosity** (many countries) rather than volume of clicks.
- Gives the child a **visible artefact of progress** that is theirs, not the parent's.
- Ties abstract "learning" to concrete geography.

### 1.3 Design tone

Cinematic, editorial, luxurious — never a flat dashboard. Playfair Display / Cormorant
Garamond serif headings, Lato / Jost sans body, warm parchment-and-gold palette, soft spring
animations. The medallion should read as an embossed wax-and-gold seal, not a flat emoji.

### 1.4 Explicitly out of scope

- **`MovementPassport`** (`base44/entities/MovementPassport.jsonc`) — a *separate* Physical
  Education feature that also uses the word "passport". Unrelated. Do not merge.
- **Treasury / SavedItem** — the heart-save collection. Adjacent (its records carry
  `country_code` / `country_name`, and `Treasury` has a `country_stamps` section), but a
  distinct feature with its own lifecycle. Flag Seals are **earned automatically by viewing**;
  Treasury items are **saved deliberately by tapping a heart**. Keep them decoupled.

---

## 2. Glossary

| Term | Meaning |
|---|---|
| **Reader / Child** | The child profile the experience is scoped to. Owned by a parent account. |
| **Flag Seal** | One `(child, country)` record. Exists ⇒ that country is collected. |
| **Earn** | The act of recording an encounter with a country. First earn creates the seal; later earns increment a counter. |
| **Source** | Which content surface triggered the earn: `born_today` \| `on_this_day` \| `destination` \| `good_news`. See §6.2 for why `good_news` was added and what was deliberately excluded. |
| **Edition date** | `YYYY-MM-DD` of the Daily Gold Edition the earn happened in. |
| **Medallion** | The circular flag UI atom. |
| **Collection view** | The full-screen 193-country parchment grid. |

---

## 3. Data Model

### 3.1 Legacy shape (Base44 `FlagSeal` entity)

```jsonc
{
  "child_id":          "string",        // required
  "parent_email":      "string",
  "country_name":      "string",        // required
  "country_code":      "string",        // required, ISO-3166-1 alpha-2
  "first_earned_date": "date",          // YYYY-MM-DD
  "times_earned":      "number",        // default 1
  "sources":           "string[]",      // deduped
  "edition_dates":     "string[]"       // deduped, YYYY-MM-DD
}
```

### 3.2 Target Drizzle model

Appended to `src/db/schema.ts`, migration generated with `npm run db:generate`.

```ts
export const flagSealSource = pgEnum('flag_seal_source', [
  'born_today', 'on_this_day', 'destination', 'good_news',
]);

export const flagSeal = pgTable('flag_seal', {
  id: text('id').primaryKey(),
  childId: text('child_id').notNull()
    .references(() => childProfile.id, { onDelete: 'cascade' }),

  // ISO-3166-1 alpha-2, always uppercase. char(2) so the DB rejects the
  // legacy `.toUpperCase().slice(0,2)` garbage at the boundary (L13).
  countryCode: char('country_code', { length: 2 }).notNull(),
  // Display label captured at first earn — NOT authoritative, see R3.3.
  countryName: text('country_name').notNull(),

  firstEarnedDate: date('first_earned_date').notNull(),
  // NEW — legacy had no "most recent" field.
  lastEarnedDate: date('last_earned_date').notNull(),
  timesEarned: integer('times_earned').notNull().default(1),

  // Set-semantics, deduped in the action (R3.5).
  sources: flagSealSource('sources').array().notNull().default([]),
  // 'YYYY-MM-DD' strings, capped at 60 (R3.6).
  editionDates: text('edition_dates').array().notNull().default([]),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // CRITICAL — the upsert target. See R3.2.
  uniqueIndex('flag_seal_child_country_idx').on(t.childId, t.countryCode),
  index('flag_seal_child_first_earned_idx').on(t.childId, t.firstEarnedDate.desc()),
]);

export type FlagSealRow = typeof flagSeal.$inferSelect;
export type NewFlagSeal = typeof flagSeal.$inferInsert;
```

Notes on the translation:

- `id` is `text` + an app-generated id, matching `child_profile` / `family` in this schema
  rather than introducing `cuid()`.
- `sources` is a **pg enum array**, so an invalid source is a DB error rather than a silent
  string. This is the one place the remake is stricter than the legacy `string[]`.
- **Ownership is not modelled on this table.** There is no `parentId` or `parentEmail` column
  and none should be added: `child_profile.familyId` already carries it, and the earn path
  never receives a child id from the client (§5.3). Storing a denormalised parent identity is
  exactly what let the legacy function stamp a session's email onto someone else's child.
- R3.7 (cascade on child delete) holds through `onDelete: 'cascade'`; `child_profile` in turn
  cascades from `family`.

### 3.3 Data model requirements

| # | Requirement |
|---|---|
| R3.1 | `countryCode` is stored **uppercase, exactly 2 chars, `[A-Z]{2}`**. Reject anything else at the API boundary — do not merely truncate. |
| R3.2 | A **unique constraint on `(childId, countryCode)`** is mandatory. The legacy implementation did a read-then-write with no constraint, so two concurrent earns could create two rows for the same country. Earning must be a single atomic upsert. **(Legacy bug — do not port)** |
| R3.3 | `countryName` is the *display* name captured at first earn (e.g. "French", "Paris, France"). It is **not** authoritative — the collection view renders the canonical name from the country table, keyed by code. Store it for the detail panel and for debugging bad resolutions. |
| R3.4 | `firstEarnedDate` is immutable after creation. |
| R3.5 | `sources` and `editionDates` are set-semantics (deduped, order-insensitive). |
| R3.6 | `editionDates` must be **capped** (keep the most recent 60). The legacy array grew unbounded — a daily reader would accumulate hundreds of entries per country. **(Legacy bug — do not port)** |
| R3.7 | Deleting a `Child` cascades to its seals. |

---

## 4. Country Resolution

This is the part the legacy implementation got most wrong, and the highest-value thing to fix.

### 4.1 The legacy problem **(Legacy bug — do not port)**

**Five** separate, divergent, hardcoded country-mapping tables existed. **Three of them are
live in this repo today** (see §0.2) and must be deleted as part of this work:

| Legacy file | Table | Keys | Notes | Ported here? |
|---|---|---|---|---|
| `src/components/dailygold/DGBornToday.jsx` | `COUNTRY_TO_ISO2` | ~90 | nationalities + country names | **yes** — `components/dailygold/DGBornToday.jsx:13` |
| `src/components/dailygold/BiographyStorybook.jsx` | `COUNTRY_TO_ISO2` | ~80 | has Kenya/Nigeria/Vietnam/Indonesia the others lack | no |
| `src/pages/StorybookPage.jsx` | `COUNTRY_TO_ISO2` | ~70 | | no |
| `src/pages/StorybookPageV2.jsx` | `COUNTRY_ISO2` | ~70 | near-duplicate of the above | no |
| `src/components/dailygold/DGDestination.jsx` | `COUNTRY_TO_ISO2` | ~85 | country names only, no nationalities | **yes** — `components/dailygold/DGDestination.jsx:8` |
| `src/components/dailygold/DGOnThisDay.jsx` | `LOC_TO_ISO2` | ~70 | includes **cities** ("Paris"→FR, "Tokyo"→JP) | **yes** — `components/dailygold/DGOnThisDay.jsx:9` |

Harvest the keys from all six before deleting the three live ones — the two storybook tables
survive only in `maison-d-or-ejected`, and R4.2 requires their union.

Consequences: the same person could resolve to a flag on one screen and no flag on another;
adding a country meant editing five files; and a Base44 function
(`patchBornTodayCountryCodes`) existed purely to hand-patch six people's missing country codes
in production data.

### 4.2 Target design

**One module: `lib/countries.ts`.** It owns the canonical country table and every resolver.
No other file may contain a country mapping.

```ts
export type Iso2 = string;                         // branded 'AA'..'ZZ'
export interface Country { code: Iso2; name: string }

export const COUNTRIES: readonly Country[];        // 193, see Appendix A
export function countryByCode(code: string): Country | undefined;
export function isValidIso2(code: string): boolean;              // /^[A-Z]{2}$/

/** Nationality/demonym or country name → ISO2. "French" → "FR". */
export function resolveNationality(input?: string | null): Iso2 | null;

/** Free-form place string → ISO2. Handles "Paris, France", "Kyoto, Japan", bare cities. */
export function resolveLocation(input?: string | null): Iso2 | null;

/** Person record → ISO2. Prefers an explicit country_code, then nationality, then country. */
export function resolvePerson(p: { countryCode?: string; nationality?: string; country?: string }): Iso2 | null;

export function flagEmoji(code: Iso2): string;     // ISO2 → 🇫🇷
```

### 4.3 Resolution requirements

| # | Requirement |
|---|---|
| R4.1 | An **explicit valid `country_code` on the source record always wins.** Only fall back to text matching when it is absent or malformed. **No source table currently has such a column — see §4.5.** |
| R4.2 | The demonym table MUST be the **union** of all five legacy tables plus full coverage of the 193 canonical countries. Every country needs at least its canonical name as a key; common demonyms should be present for the well-represented ones. |
| R4.3 | Matching is **case-insensitive and diacritic-insensitive** (`Côte d'Ivoire` ≡ `Cote dIvoire`). Normalise with `String.normalize('NFD').replace(/\p{Diacritic}/gu,'')`. |
| R4.4 | **Compound nationalities** must resolve: split on `[-,/\s]+` and take the first matching part. `"Polish-French"` → `PL`, `"British-American"` → `GB`. Document that first-part-wins is the intended rule. |
| R4.5 | **`"City, Country"` strings** must resolve: take the segment after the last comma first, then fall back to the whole string, then to the first segment. `"Kyoto, Japan"` → `JP`. |
| R4.6 | Historical/political aliases resolve to the modern successor: `Soviet`/`USSR`/`Soviet Union` → `RU`, `Czechoslovakia` → `CZ`, `Persian` → `IR`, `Austro-Hungarian` → `AT`, `Prussian` → `DE`, `Scottish`/`Welsh`/`English` → `GB`. |
| R4.7 | A **city index** (separate from the country table) supports `resolveLocation` for "On This Day" event locations, which are frequently bare city names. Minimum: the ~70 cities in the legacy `LOC_TO_ISO2` map. |
| R4.8 | Substring matching, if used at all, MUST be **word-boundary aware and longest-match-first**. The legacy `DGDestination` resolver used bare bidirectional `includes()`, so a 2-char destination name could match almost anything. **(Legacy bug — do not port)** |
| R4.9 | Resolution failure is a **silent no-op** (no seal, no flag rendered, no error toast) — but MUST emit a structured `flag_resolution_missed` telemetry event with the unresolved string, so the mapping table can be improved from real data instead of hand-patch functions. |
| R4.10 | The resolver is **pure and synchronous** — usable in both server and client components, and unit-testable without a DB. |

### 4.4 Canonical country list

**193 entries** (Appendix A). The legacy list had two errors **(Legacy bug — do not port)**:

- It was **labelled and commented as "197 UN-recognised countries" but contained 193 entries**,
  and the UI printed `${ALL_COUNTRIES.length}` — so the header said "193 of" while the code
  comment and the previous spec document both claimed 197.
- It **omitted Côte d'Ivoire (`CI`)** and **included Vatican City (`VA`)**, which is a UN
  observer, not a member. Net: 193 entries, but not the 193 UN members.

Decision for the remake: use the **193 UN member states** (Appendix A, with `CI` added and `VA`
removed). Derive every displayed total from `COUNTRIES.length` — never hardcode a number in
copy.

The ported `FlagCollectionView.jsx` still carries the wrong list and the "197" copy in its
header comment (line 3), its list comment (line 10) and its corner plaque comment (line 223).
Replace the array with an import from `lib/countries.ts`; do not hand-patch it.

### 4.5 The missing `country_code` column **(prerequisite — blocks R4.1)**

R4.1 gives an explicit country code priority over text matching. **There is nowhere for that
code to live.** Current source columns:

| Source | Column | Type | Populated? |
|---|---|---|---|
| `born_today` | `remarkable_person.country` | free text | yes — but no `nationality`, no `country_code` |
| `on_this_day` | `on_this_day_event.location` | free text | yes |
| `destination` | `daily_gold_edition.destination_country` | free text | yes |
| `good_news` | `good_news_item.location` | free text | **mostly null** — see §6.2 |

Note the ported `DGBornToday.jsx:42` already reads `person.country_code` and
`person.nationality`. Both are always `undefined` — `app/daily-gold-edition/actions.ts:79`
maps only `country: row.country`. The resolver has been running in fallback mode since the
port, and nobody noticed, which is precisely the failure R4.9's telemetry exists to catch.

**Required:**

| # | Requirement |
|---|---|
| R4.11 | Add `countryCode: char('country_code', { length: 2 })` (nullable) to `remarkable_person`, and surface it in `app/admin/people` / `components/admin/PersonEditor.tsx`. |
| R4.12 | Backfill it by running every existing `remarkable_person.country` through `resolveNationality`, writing only unambiguous hits. Leave the rest null for an editor to fill. |
| R4.13 | Expose it through `personToRecord` in `app/daily-gold-edition/actions.ts` so R4.1 has something to prefer. |

Without R4.11–R4.13, `flag_resolution_missed` (R4.9) has no remediation path and the feature
re-creates the condition that produced the legacy `patchBornTodayCountryCodes` hand-patch
function. Adding the column is the difference between a feedback loop and a bug report.

---

## 5. Backend — Earn Action

### 5.1 The earn entry point

**A server action, not a route handler** (D2). New file `app/passport/actions.ts`:

```ts
'use server';

export type FlagSource = 'born_today' | 'on_this_day' | 'destination' | 'good_news';

export type EarnResult =
  | { status: 'new_seal' | 'already_earned';
      sealId: string;
      countryCode: string;    // normalised uppercase
      countryName: string;    // canonical name from COUNTRIES, never the caller's
      timesEarned: number }
  | { status: 'noop' };       // no child mode, invalid code, or rate-limited

export async function earnFlagSeal(input: {
  countryCode: string;        // ISO2, case-insensitive on input
  countryName: string;        // display label, stored for debugging (R3.3)
  source: FlagSource;
  editionDate?: string;       // 'YYYY-MM-DD'; defaults to server-side today
}): Promise<EarnResult>;
```

**There is no `childId` parameter.** The child comes from `requireChildContext()` (§5.3).
This is the single most important change from the original draft — see §0.1.

Failure model, replacing the original `401/403/400/500`: a server action has no status codes,
and R6.4 requires the caller never to surface a failure anyway. So:

| Condition | Behaviour |
|---|---|
| No session, or not in child mode | `{ status: 'noop' }` — **not** a redirect. `requireChildContext()` redirects, which is wrong inside a fire-and-forget call; use `getActiveChild()` and return `noop` on null. |
| Invalid ISO2, unknown source, malformed date | `{ status: 'noop' }` + a `flag_resolution_missed` / `flag_seal_invalid` telemetry event. Never throw — a throw becomes an unhandled rejection in the client. |
| Rate limit exceeded (R5.10) | `{ status: 'noop' }` + telemetry |
| Unexpected DB error | logged, rethrown-as-swallowed by the caller (R7.23); returns `noop` |

The distinction the original `403` carried — "you asked for a child that isn't yours" — cannot
occur, because no caller can ask for a child at all.

### 5.2 Earn semantics

| # | Requirement |
|---|---|
| R5.1 | Earning is a **single atomic upsert** on `(childId, countryCode)`. No read-then-write. In Drizzle: `.insert(flagSeal).values(…).onConflictDoUpdate({ target: [flagSeal.childId, flagSeal.countryCode], set: {…} }).returning()`. The array unions and the 60-entry cap (R3.6) must be expressed as SQL in the `set` clause — pulling the row into JS to merge arrays reintroduces the read-then-write race the unique index exists to prevent. |
| R5.2 | **First earn** → create with `timesEarned: 1`, `firstEarnedDate = lastEarnedDate = editionDate`, `sources: [source]`, `editionDates: [editionDate]`. Return `new_seal`. |
| R5.3 | **Repeat earn** → increment `timesEarned`, union `source` into `sources`, union `editionDate` into `editionDates` (capped per R3.6), set `lastEarnedDate`. Return `already_earned`. |
| R5.4 | `timesEarned` counts **trigger events, not distinct days**. Re-opening the same storybook twice in one day increments it twice. This is the legacy behaviour and is intentional — but it makes the number a weak signal. **Recommended change:** only increment when `editionDate` is not already in `editionDates`, so `timesEarned` means "days this country was encountered". Pick one and state it in the UI copy ("Encountered 4×" vs "Seen on 4 days"). |
| R5.5 | The endpoint is safe to call repeatedly. Clients are expected to be chatty; correctness must not depend on client-side deduping. |
| R5.6 | The response returns the **canonical** country name from the table, not the caller's `countryName`, so the celebration overlay never says "You earned French!". **(Legacy bug — do not port:** the legacy overlay rendered the raw nationality string.) |

### 5.3 Authorisation **(Legacy bug — do not port)**

The legacy function authenticated the caller (`base44.auth.me()`), then wrote using
`asServiceRole` with a caller-supplied `child_id` and **never verified that the child belonged
to the caller**. It stamped `parent_email` from the session while writing to an arbitrary
child's collection — an IDOR: any authenticated user could pollute any child's passport.

**The ported `DailyGoldEditionPage.jsx:186` still sends `child_id: child.id` to that Base44
function. The IDOR is live in this repo.** It is the single highest-priority item here.

This codebase fixes it structurally rather than by validation. `lib/dal.ts` is the documented
authorization boundary (`docs/auth-plan.md` §5): child identity is `session.activeChildProfileId`,
set server-side only, and `getActiveChild()` re-verifies it against `session.user.familyId` on
every read. The client cannot name a child, so there is no id to validate.

| # | Requirement |
|---|---|
| R5.7 | The earn action MUST resolve the child via `getActiveChild()` and return `{ status: 'noop' }` when it is null. It MUST NOT accept a child id, a family id, or an email as a parameter. *(Supersedes the original `where: { id: childId, parentId: session.userId }` — this repo has no `parentId`; ownership is `child_profile.familyId === session.user.familyId`, and a family has multiple guardians, so a user-id check would lock out co-parents.)* |
| R5.8 | Ownership is derived **server-side from the session** — never from a client-supplied `parentEmail`. Unchanged in intent; now enforced by the signature rather than by a check. |
| R5.9 | The read functions (§5.4) resolve the child the same way. No flag-seal function anywhere takes a child id. |
| R5.10 | Apply a per-user rate limit (e.g. 60 earns/minute), keyed on `session.userId`. Earns are automatic and client-triggered; a loop bug should not be able to hammer the DB. **No rate-limiting primitive exists in this repo** — see §11. |
| R5.14 | The `/passport` route (D4) calls `requireChildContext()`, which redirects to `/profiles` outside child mode. Only the fire-and-forget earn path uses the non-redirecting `getActiveChild()`. |

### 5.4 Read functions

Server functions in the same `app/passport/actions.ts`, child resolved from the session:

```ts
export async function getFlagSeals(): Promise<{
  seals: FlagSealRow[];
  earnedCount: number;
  totalCountries: number;      // COUNTRIES.length
}>;

export async function getFlagSeal(countryCode: string): Promise<FlagSealRow | null>;
```

| # | Requirement |
|---|---|
| R5.11 | `getFlagSeals` returns **all** seals for the child. Do not paginate at 200 like the legacy client did — the ceiling is `COUNTRIES.length`, but a hardcoded limit that happens to exceed it is brittle. The ported `FlagCollectionView.jsx` still carries that `limit: 200`; it goes away with the Base44 call. |
| R5.12 | Sort by `firstEarnedDate` descending (most recently discovered first) for "recent finds" surfaces. The grid re-orders alphabetically by canonical name itself. |
| R5.13 | The `/passport` page is a **Server Component** calling `getFlagSeals()` directly — no client fetch waterfall, and no `useEffect` fetch like the ported `FlagCollectionView.jsx` does today. The client path is only the live earn/celebration loop. |

---

## 6. Earn Trigger Points

Each surface below fires exactly one earn when the child meaningfully encounters the country.

| Source | Surface | Trigger moment | Country from | Status |
|---|---|---|---|---|
| `born_today` | Golden Story (`/stories/[name]`) | On mount, once the person record resolves | `person.country_code` → `country` | route exists, **earns nothing today** — see §6.3 |
| `on_this_day` | "On This Day" column | When the lazily-researched event for the selected year resolves **with a location** | `on_this_day_event.location` (city or country string) | ported, live |
| `destination` | "Where in the World" card | First open of the destination modal | `daily_gold_edition.destination_country` ("City, Country") | ported, live |
| `good_news` | Good News card → `NewsModal` | On opening the news modal | `good_news_item.location` | **new** — see §6.2 |

The `born_today` route differs from the original draft: this repo has one Golden Story route,
`app/stories/[name]/page.tsx`, keyed by person slug — not the legacy
`/storybook/:editionId/:personIndex`. It also has no `nationality` field to fall back to
(§4.5).

### 6.1 Trigger requirements

| # | Requirement |
|---|---|
| R6.1 | An earn fires **only** when there is a resolvable child **and** a valid ISO2. Otherwise silent no-op. |
| R6.2 | Each surface guards against re-firing within its own lifetime: storybook = once per mount; On This Day = once per `year`; destination = once per modal-open cycle. |
| R6.3 | A page-level guard dedupes across surfaces by `countryCode` for the page session, so two surfaces mentioning France don't produce two celebrations back to back. (Keyed on the code alone — the client no longer holds a child id; see R7.20.) |
| R6.4 | Earn calls are **fire-and-forget from the user's perspective** — never block rendering, never surface a failure toast. Failures release the dedupe guard so a later encounter can retry. |
| R6.5 | Earning is a **side effect of viewing detail**, not of a card being present in a list. Rendering ten portrait medallions in "Born on This Day" must NOT earn ten seals; only opening a person's storybook earns. This is the intended rule and the legacy code follows it — `DGBornToday` receives an `onFlagEarned` prop and deliberately never calls it. **(Legacy wart:** the unused prop is threaded through from `DailyGoldEdition.jsx:428` for no reason — and came along in the port, now at `DailyGoldEditionPage.jsx:365`. Drop it, or implement it — but do not leave dead wiring. Same pattern again in Treasury, R6.10.) |
| R6.6 | **(Legacy bug — do not port)** Two storybook routes existed (`StorybookPage.jsx`, `StorybookPageV2.jsx`) and `BiographyStorybook.jsx` *also* fired an earn on mount. A person opened through the modal path and the route path could double-increment. The remake must have **exactly one** storybook earn site. |
| R6.6a | Neither legacy storybook component was ported into this repo, so the triple earn site **does not exist here** — L7 is a regression to avoid, not a bug to fix. `GoldenStory.jsx` must stay earn-free; the one site is fixed by §6.3. |
| R6.7 | `good_news` fires on **opening `NewsModal`**, not on the card being rendered — the same R6.5 rule the other surfaces follow. `DGGoodNews.jsx` already has the modal (`:91`) and its open handlers (`:204`, `:254`); the earn hangs off those. |

### 6.2 Sources considered

The original draft fixed the source list at three. A pass over every content entity in
`src/db/schema.ts` found one clear addition, one candidate deferred on cost, and several that
look like sources but must not be.

**Added — `good_news`.** `good_news_item.location` already exists, and its schema comment
(`src/db/schema.ts:326`) reads *"Mostly null in current data; feeds the flag chip if present"* —
the intent predates this spec. `DGGoodNews.jsx:234` already passes `primary.location` as
`countryName` into `SaveHeartSeal`, with `countryCode=""` because no resolver existed to fill
it. It has a real detail interaction, so it satisfies R6.5 without inventing one.

It is also the best *product* fit of the four. `born_today` and `on_this_day` are historical
and `destination` is curated; Good News is the only surface where a child meets a country
because something good is happening there **now**. That is closer to the "breadth of curiosity"
goal in §1.2 than any other source.

| # | Requirement |
|---|---|
| R6.8 | **`good_news_item.location` is mostly null in current data** — confirmed against `art/backups/good_news-backup-2026-07-17.json`, where the place sits in the prose (*"In the heart of Chicago, brilliant minds gathered…"*) but the column is `null`. Wiring the trigger without a backfill ships a source that silently never fires. Backfill `location` through the same enrichment pipeline that populates `on_this_day_event`, **before** enabling this source. |

**Deferred — Greatest Moments.** `greatest_moment` is structurally a twin of
`on_this_day_event` (`month_day`, `year`, `headline`, `story`) but has **no location column at
all**. The asymmetry is visible to a child: stepping through On This Day earns seals and the
ranked top-ten moments beside it do not. Cost is a new column plus a backfill — the same shape
as R6.8, which is why it sequences after it rather than with it. Track as future work; do not
block v1.

**Rejected, deliberately.** Each of these is a plausible-looking source that would make the
collection worse. Recorded here so they are not "discovered" and added later:

| Candidate | Why not |
|---|---|
| `daily_gold_edition.tinyPhraseLanguage` | **A language is not a country.** "Spanish" → `ES` is wrong for twenty countries; "Arabic" and "Portuguese" are worse. This is exactly the class of sloppy mapping §4 exists to eliminate. `lib/countries.ts` must not accept language names as resolver input. |
| `tasteOfDay`, `soundOfDay`, `natureDetail`, `tinyPhrase` | Attributes **of the destination country**, which `destination` already earned. Firing on them would inflate `timesEarned` four times per edition for a country the child already holds. |
| `remarkable_person.chapters` / `timeline` / `treasures` | A person's story spans countries — Einstein is DE → CH → US. The one-country-per-person rule is deliberate; "people who moved" is a different feature, not another source. |
| `SavedItem` / Treasury | Out of scope per §1.4, and its lifecycle is opposite: deliberate save vs. automatic earn. See R6.10. |

### 6.3 The `/stories/[name]` earn site **(open gap)**

`components/dailygold/StorybookView.jsx` is 67 lines of chrome and **contains no earn call**.
A child who deep-links to `/stories/leonardo` — reachable, indexed, and linked from the
edition — collects nothing. This is the one trigger the original draft assumed existed and
which does not.

Placing it is a genuine trade-off, so decide it explicitly rather than by accident:

| # | Requirement |
|---|---|
| R6.9 | The **single** `born_today` earn site is in the Golden Story surface (satisfying R6.6/R6.6a), which means the `/stories/[name]` route needs child context it does not currently have. The route is a Server Component with no `getActiveChild()` call, and it must not gain a redirect — a signed-out or non-child visitor still reads the story. Resolve the child server-side, pass it down, and let the earn no-op when absent (R6.1). The page-level dedupe guard (R6.3) does not span a full navigation, so the server action's own idempotence (R5.5) is what prevents a double-count when a person is opened from the edition and then revisited directly. |

### 6.4 Treasury dead wiring

| # | Requirement |
|---|---|
| R6.10 | `SaveHeartSeal.jsx:14-15` and `TreasuryHeart.jsx:18-19` accept `countryCode` / `countryName` and forward them as `country_code` / `country_name`, but **every call site passes `""`** (`DGGoodNews.jsx:233`, `DGDestination.jsx:186`). This is L10's dead-wiring pattern in a second place. Treasury stays out of scope (§1.4), but once `lib/countries.ts` exists, either fill those props from it or delete them. Do not leave them threaded and empty. |

---

## 7. UI Components

### 7.1 Design tokens

Extract these to `lib/flagSealTokens.ts`; the legacy components inlined every value.

```ts
export const SEAL = {
  gold:        '#C9A96E',   // primary rim / accent
  goldBright:  '#D4AF37',   // celebration text, +1 badge
  goldLight:   '#E2D0A8',
  parchment:   '#F5EDD8',
  parchmentMid:'#EDE0C4',
  parchmentDeep:'#E0CFA8',
  ink:         '#3C2E1A',   // headings
  inkSoft:     '#5C4A2A',   // labels
  inkMuted:    '#8B7355',   // meta text
  faceEarned:  'radial-gradient(circle at 35% 30%, #FDF6E8 0%, #EFE0BE 55%, #D8C89A 100%)',
  faceLocked:  'radial-gradient(circle at 35% 30%, #E8E4DC 0%, #D4D0C8 55%, #C4C0B8 100%)',
} as const;

export const SEAL_SIZES = { xs: 24, sm: 36, md: 56, lg: 80 } as const;

export const FONTS = {
  display: '"Playfair Display", Georgia, serif',
  serif:   '"Cormorant Garamond", Georgia, serif',
  sans:    'Lato, sans-serif',
  ui:      'Jost, sans-serif',
} as const;
```

| # | Requirement |
|---|---|
| R7.0 | **Two of these four fonts are not loaded.** `app/globals.css:1` imports Playfair Display, Lato, Great Vibes and Dancing Script — **not Cormorant Garamond, not Jost**. The ported `FlagSealMedallion.jsx` already asks for Cormorant Garamond and has been silently falling back to Georgia. Either add both families to the `@import`, or re-map `FONTS.serif` / `FONTS.ui` onto the existing stack. Prefer re-mapping onto the CSS variables `--font-serif` / `--font-sans` that `globals.css:20-21` already defines, so the feature inherits the site's typography instead of forking it. |

### 7.2 `<FlagSealMedallion />`

The atom. A circular embossed seal bearing the flag.

```ts
interface FlagSealMedallionProps {
  countryCode: string;
  countryName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';   // 24 | 36 | 56 | 80 px
  earned?: boolean;                    // default true
  showLabel?: boolean;                 // caption under the seal
  fallbackInitials?: string;
  onClick?: () => void;
}
```

Visual anatomy (all derived from `px = SEAL_SIZES[size]`, so it scales cleanly):

| Layer | Spec |
|---|---|
| Face | `border-radius: 50%`, `overflow: hidden`, `SEAL.faceEarned` / `faceLocked` |
| Rim | `max(2, round(px * 0.06))px solid`; `rgba(201,169,110,0.9)` earned / `rgba(180,170,155,0.4)` locked |
| Emboss ring | absolutely positioned, `inset: round(px * 0.09)`, `1px` inner border, `rgba(230,200,140,0.55)` earned |
| Specular highlight | earned only — ellipse at `top 8% / left 12%`, `42% × 38%`, white radial fade |
| Shadow | earned: `0 {px*0.04}px {px*0.18}px rgba(100,80,40,0.22)`, inset white top hairline, plus a `{px*0.12}px` gold bloom. Locked: `0 1px {px*0.1}px rgba(0,0,0,0.08)` |
| Locked treatment | `filter: grayscale(1) opacity(0.38)` |
| Flag glyph | Unicode regional-indicator emoji at `font-size: round(px * 0.5)`, centred |
| Fallback glyph | when the code is invalid: initials from `countryName` (or `fallbackInitials`, or `?`) in `FONTS.serif` 600 at `round(px * 0.32)`, colour `rgba(140,100,40,0.85)` |
| Label | `showLabel` — `FONTS.serif` at `max(8, round(px*0.19))`, `#5C4A2A` earned / `#9A9490` locked, wraps only at `px ≥ 56`, ellipsis otherwise |

| # | Requirement |
|---|---|
| R7.1 | ISO2 → emoji: `String.fromCodePoint(...code.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65))`. Guard with `/^[A-Z]{2}$/` first — the legacy component did this correctly, keep it. |
| R7.2 | **Flag emoji do not render on Windows Chrome.** The legacy build silently showed empty boxes for all Windows users — a total feature failure on a major platform, never caught because the fallback only triggers on *invalid codes*, not on *missing glyphs*. **The remake MUST use SVG flag assets** (e.g. bundled `flag-icons` SVGs or self-hosted 4:3 SVGs keyed by lowercase ISO2), with the initials treatment as the fallback. **(Legacy bug — do not port)** |
| R7.2a | **No flag assets exist in this repo** — `public/` holds five stock Next.js SVGs. The ported `FlagSealMedallion.jsx:20` is emoji-only, so the Windows failure is live here. ~193 SVGs at ~1 KB each is the largest asset decision in the feature; settle `flag-icons` (MIT, 4:3, lowercase ISO2 filenames) versus self-hosting before building the medallion, because the choice determines the component's asset-path contract. |
| R7.3 | The medallion is presentational and dependency-free (no data fetching, no router). |
| R7.4 | When `onClick` is provided it MUST render as a real `<button>` with `aria-label`; otherwise a `<span>` with `role="img"` and `aria-label="{countryName} flag, {earned ? 'collected' : 'not yet collected'}"`. The legacy version used a bare clickable `<div>` — not keyboard reachable. **(Legacy bug — do not port)** |
| R7.5 | Hover on interactive medallions: subtle lift (`transform: scale(1.06)`) over 0.15s. Honour `prefers-reduced-motion`. |

### 7.3 `<FlagSealCelebration />`

The reward moment. Two modes.

```ts
interface FlagSealCelebrationProps {
  countryCode: string;
  countryName: string;
  type: 'new' | 'repeat';
  onDone: () => void;
}
```

**`type: 'new'`** — full-screen overlay, ~2.9s total:

| Phase | Timing | Behaviour |
|---|---|---|
| enter | 0–40ms | medallion at `scale(0.08) rotate(-200deg)`, opacity 0 |
| show | 40ms–2400ms | springs to `scale(1) rotate(0)` over 750ms, `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| exit | 2400ms | fades to `scale(0.85) rotate(5deg)` over 400ms |
| done | 2900ms | `onDone()` |

Composition: `position: fixed; inset: 0; z-index: 9999; pointer-events: none`. Radial gold
backdrop wash `rgba(212,175,55,0.2) → transparent 60%`. Behind the `lg` medallion, a pulsing
glow ring (`inset: -16px`, radial gold, 1.4s ease-in-out alternate, `scale 0.88 ↔ 1.12`).
Headline **"You earned {Country}!"** — `FONTS.display` 700, `clamp(1.2rem, 4vw, 1.7rem)`,
`#D4AF37`, `text-shadow: 0 0 24px rgba(212,175,55,0.6)`. Sub-label **"✦ Flag Seal Collected ✦"**
— `FONTS.sans` 0.72rem, uppercase, `letter-spacing: 0.14em`, `rgba(92,74,42,0.65)`.

**`type: 'repeat'`** — quiet centred pulse, ~1.7s total: `md` medallion, spring-in over 0.3s,
a `+1` badge (24px gold circle, `#D4AF37`, white `Jost` 700 12px) pinned at `top:-8px;
right:-8px`, and the country name in `FONTS.serif` italic 1rem `#C9A96E` beneath. Exits at
1200ms, `onDone` at 1700ms.

| # | Requirement |
|---|---|
| R7.6 | Celebrations MUST be **queued**, not single-slot. The legacy page held one `celebration` state object, so a second earn arriving mid-animation overwrote the first — the child lost a "new country!" moment. Implement a FIFO queue that plays one at a time. **(Legacy bug — do not port)** |
| R7.7 | `pointer-events: none` throughout — the celebration never blocks interaction. |
| R7.8 | Under `prefers-reduced-motion`, replace spin/scale with a plain 200ms fade; keep the same durations. |
| R7.9 | Announce to screen readers via `role="status"` / `aria-live="polite"`: "New flag seal collected: {Country}." |
| R7.10 | All timers cleared on unmount (the legacy version did this correctly — keep it). |

### 7.4 `<FlagCollectionView />` — the passport

Full-screen parchment collection. **Decided (D4): a real route, `/passport`** — it is a
destination, deserves a URL, and is shareable with the parent. Not `/children/:childId/flags`:
per R5.9 no flag-seal surface takes a child id, and the passport shows the session's active
child.

This replaces the ported modal wiring: `ChildGreetingStrip.jsx:307` currently fires
`onShowFlags` → `DailyGoldEditionPage.jsx:312` → `<FlagCollectionView>` overlay. "My Flags"
becomes a `<Link href="/passport">`, and the backdrop/`backdrop-filter` layer below is dropped
along with the overlay. The route calls `requireChildContext()` (R5.14).

Composition:

- Backdrop `rgba(15,12,8,0.88)` + `backdrop-filter: blur(6px)` (if kept as an overlay).
- Sheet: `max-width: 1100px`, `min-height: 100vh`, background
  `radial-gradient(ellipse at 50% 0%, #F5EDD8 0%, #EDE0C4 40%, #E0CFA8 100%)`, padding
  `2rem 1.5rem 4rem`.
- Header: title **"My Flag Collection"** (`FONTS.display` 700,
  `clamp(1.6rem, 4vw, 2.4rem)`, `#3C2E1A`); subtitle `FONTS.serif` italic 1.05rem `#8B7355` —
  *"You have collected {earned} of {total} countries"*; a pill badge **"✦ {pct}% Complete"**
  (`Jost` 0.72rem, uppercase, `letter-spacing: 0.12em`, gold-tinted) shown only when
  `earned > 0`.
- Decorative divider: hairline — ✦ — hairline in gold at 30% opacity.
- Grid: `repeat(auto-fill, minmax(72px, 1fr))`, gap `1rem 0.75rem`, `md` medallions with
  `showLabel`.
- Corner plaque: fixed bottom-right, `"{total} Countries" / "THE WORLD"` on parchment with a
  2px gold border.

Seal detail panel (on tapping an earned seal): `lg` medallion with label, then **Earned**
`{timesEarned}×` and **First collected** `{date, 'en-GB', day numeric / month short / year
numeric}`, then one chip per source (`born_today` → "born today", `good_news` → "good news" —
replace underscores, uppercase, gold-tinted pill), then a Close button. Derive the chip label
from the enum value; do not hand-map four strings, or the fifth source will be missed.

| # | Requirement |
|---|---|
| R7.11 | Unearned countries render greyed via `earned={false}` — never hidden. The locked wall *is* the motivation. |
| R7.12 | Grid order is alphabetical by canonical country name. |
| R7.13 | Only earned seals are interactive; locked ones are inert and `aria-disabled`. |
| R7.14 | Loading state shows *"Loading your collection…"* in the subtitle slot, with the grid rendered fully locked (no layout shift on arrival). |
| R7.15 | Empty state (zero earned) is warm, not blank: *"Your passport is waiting for its first stamp."* No percentage badge. |
| R7.16 | All totals come from `COUNTRIES.length`. No literal `197` or `193` anywhere in copy. |
| R7.17 | The corner plaque must not overlap the grid on small screens — make it static below the grid under 640px. |
| R7.18 | The detail panel is a proper dialog: focus trap, Escape to close, focus returned to the invoking medallion. The legacy overlay had none of this. **(Legacy bug — do not port)** |
| R7.19 | 193 medallions is heavy — memoise the medallion and avoid re-rendering the whole grid when the detail panel opens. |

### 7.5 `useFlagEarn()` hook

The single client-side entry point for triggering earns.

```ts
function useFlagEarn(): {
  earn(countryName: string, countryCode: string, source: FlagSource): void;
  celebration: CelebrationItem | null;   // head of the queue
  dismissCelebration(): void;
}
```

No `childId` parameter (D3) — the hook calls the `earnFlagSeal` server action, which resolves
the child from the session.

| # | Requirement |
|---|---|
| R7.20 | Maintains an in-flight/completed guard keyed on `countryCode` alone (a `Set` in a ref). Key added **before** the request; removed only on failure, so a transient error can retry. *(The original `${childId}-${countryCode}` key is obsolete — the client no longer knows a child id. R7.24 covers reader switches, which is all the child half of that key ever did.)* |
| R7.21 | Maps the response to a celebration: `new_seal` → `type: 'new'`, `already_earned` → `type: 'repeat'`; pushes onto the queue. |
| R7.22 | No-ops on an invalid code — no server call. Absence of child mode is no longer knowable client-side; the action returns `{ status: 'noop' }` and the hook queues no celebration for it. |
| R7.23 | Swallows errors (no user-facing failure), but reports them to telemetry. |
| R7.24 | Guard state resets on reader switch. The active child is server state, so the hook cannot observe the change directly — remount the subtree instead. `DailyGoldEditionPage.jsx:342` already uses `key={child?.id \|\| 'no-child'}` for exactly this; extend that pattern to cover the earn boundary. |

---

## 8. Cross-Cutting Requirements

| # | Requirement |
|---|---|
| R8.1 | **Resilience.** Every call is individually catchable; no flag-seal failure may blank or block a page. |
| R8.2 | **Reader scoping.** Every read and write is scoped to the active child. Switching readers must swap the collection with no bleed-through of cached seals. |
| R8.3 | **Server-first.** The collection page is a Server Component reading the DB directly. Only the earn/celebrate path is client-side. |
| R8.4 | **Cache invalidation.** There is currently **no cache to invalidate**: `cacheComponents` is not enabled in `next.config.ts`, and `app/daily-gold-edition/page.tsx` is `export const dynamic = 'force-dynamic'`. `revalidateTag('flag-seals:…')` would be a no-op. **Default: render `/passport` dynamically** and drop the requirement — a per-child passport is cheap, private, and read once per visit. If it is cached later, note that `'use cache'` is for *shareable* data and seals are per-child: the correct primitive is `'use cache: private'` + `cacheTag`, and the invalidation call from a server action is `updateTag`, not `revalidateTag` (which is route-handler-only, and whose one-argument form is deprecated in Next 16). Read `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-private.md` before implementing. |
| R8.5 | **Telemetry.** Emit `flag_seal_earned` (`{ childId, countryCode, source, status }`) and `flag_resolution_missed` (`{ input, surface }`). The latter is the feedback loop that keeps the country table honest — and, with R4.11, the input to a real fix rather than a hand-patch. **No telemetry sink exists in this repo**; see §11. |
| R8.6 | **Testing.** The country resolver needs a table-driven unit suite covering every legacy mapping key, compound nationalities, "City, Country" forms, diacritics, and historical aliases. The earn action needs tests for first-earn, repeat-earn, concurrent-earn (unique-index path), no-child-mode `noop`, and invalid-code `noop`. **There is no test runner in this repo at all** — no vitest, jest or playwright in `package.json`; see §11. The cross-tenant test the original draft asked for (`403`) is no longer expressible: with D3 there is no parameter to attack. Replace it with a *static* assertion — no exported flag-seal function accepts a child identifier — which is the property that actually closes L1. |
| R8.7 | **No native dialogs.** Never `alert` / `confirm` / `prompt`. |
| R8.8 | **Motion.** All animation honours `prefers-reduced-motion`. |

---

## 9. Legacy Defects Summary

Consolidated list of what **not** to reproduce. Each is detailed above.

**"Live here"** marks defects that were copied into `maison-d-or-nextjs` with the components
(§0.2) and are therefore shipping today — these are bug fixes, not just things to avoid.

| # | Defect | Fix | Live here? |
|---|---|---|---|
| L1 | No ownership check on `child_id` — any authed user could write to any child's collection (IDOR) | R5.7–R5.9 | **yes** — `DailyGoldEditionPage.jsx:186` still posts `child_id` to the Base44 function. **Highest priority.** |
| L2 | Read-then-write with no unique constraint — concurrent earns duplicate rows | R3.2, R5.1 | yes (server-side, in Base44) |
| L3 | Five divergent hardcoded country tables; a Base44 function existed solely to hand-patch missing codes | §4.2 | **yes** — three of the five, see §4.1 |
| L4 | Country list labelled "197", actually 193 entries, missing `CI`, wrongly including `VA` | §4.4, Appendix A | **yes** — `FlagCollectionView.jsx:3,10,223` |
| L5 | Flag emoji don't render on Windows Chrome; fallback only covers invalid codes, not missing glyphs | R7.2, R7.2a | **yes** — `FlagSealMedallion.jsx:20` |
| L6 | Single-slot celebration state — rapid earns overwrite each other | R7.6 | **yes** — `DailyGoldEditionPage.jsx` `celebration` state |
| L7 | Three earn call sites for one person (two storybook routes + the storybook component) | R6.6, R6.6a | no — neither storybook component was ported. Regression to avoid. |
| L8 | `edition_dates` array grows unbounded | R3.6 | yes (server-side) |
| L9 | Clickable `<div>`s; no keyboard access, no focus trap, no live-region announcement | R7.4, R7.9, R7.18 | **yes** — `FlagSealMedallion.jsx:33` |
| L10 | `DGBornToday` receives `onFlagEarned` and never calls it — dead wiring | R6.5 | **yes** — `DailyGoldEditionPage.jsx:365`. Same pattern again in Treasury, R6.10. |
| L11 | Hardcoded `200` fetch limit against a 193-item ceiling | R5.11 | **yes** — `FlagCollectionView.jsx` |
| L12 | Celebration headline rendered the raw nationality ("You earned French!") | R5.6 | **yes** — `DailyGoldEditionPage.jsx:193` passes the caller's `countryName` straight through |
| L13 | `country_code.toUpperCase().slice(0,2)` accepts non-alphabetic garbage server-side | R3.1 | yes (server-side); the `char(2)` column in §3.2 closes it at the DB |

---

## 10. Acceptance Criteria

**Earning**

- [ ] Opening a person's Golden Story earns that person's country once; a full celebration plays the first time and a `+1` pulse thereafter.
- [ ] Deep-linking to `/stories/[name]` in child mode earns the same seal the edition path does — and earns nothing when not in child mode (R6.9).
- [ ] Stepping "On This Day" to a year whose event resolves a location earns that country once per year.
- [ ] Opening the destination modal earns the destination's country once per session.
- [ ] Opening a Good News item's modal earns its country once; the card sitting in the list earns nothing (R6.7).
- [ ] Merely scrolling past medallions earns nothing.
- [ ] Two earns arriving in quick succession both play, in order, without overwriting.

**Passport**

- [ ] The passport lives at `/passport`, is linked from "My Flags", and redirects to `/profiles` outside child mode.
- [ ] It shows every country in `COUNTRIES`, earned in colour and locked greyed, with a live count and percentage derived from `COUNTRIES.length`.
- [ ] No literal `193` or `197` appears anywhere in the source or copy.
- [ ] Tapping an earned seal shows times earned, first-collected date, and source chips — including "good news"; tapping a locked seal does nothing.
- [ ] Flags render correctly on Windows Chrome, macOS Safari, iOS, and Android.
- [ ] The passport is fully keyboard-navigable; the detail panel traps focus and closes on Escape.

**Correctness & safety**

- [ ] No exported flag-seal function takes a child id, family id, or email parameter (R8.6). Grepping the feature for `childId:` as an *input* returns nothing.
- [ ] Two simultaneous earns for the same `(child, country)` produce exactly one row.
- [ ] `"Polish-French"`, `"Kyoto, Japan"`, `"Côte d'Ivoire"`, `"Soviet Union"`, and `"Paris"` all resolve correctly.
- [ ] A language name (`"Spanish"`, `"Arabic"`) resolves to **nothing** (§6.2).
- [ ] An unresolvable country string produces no seal, no error, and one `flag_resolution_missed` event.
- [ ] Switching readers swaps the collection with no stale seals.
- [ ] Every network failure in this feature is invisible to the child.

**Migration complete**

- [ ] `grep -rn "base44" components/dailygold/Flag* components/dailygold/DailyGoldEditionPage.jsx` returns nothing.
- [ ] `COUNTRY_TO_ISO2` and `LOC_TO_ISO2` exist nowhere in the repo; `lib/countries.ts` is the only country mapping.
- [ ] No component receives a flag-related prop it never uses (L10, R6.10).

---

## 11. Prerequisites & Build Order

### 11.1 Infrastructure that does not exist yet

None of the following is present in this repo. Each blocks a specific requirement, so settle
them before the code that depends on them — not after.

| Need | Current state | Blocks |
|---|---|---|
| **Test runner** | nothing — no vitest / jest / playwright in `package.json` | R8.6 |
| **Test database** | no strategy; no way to exercise the concurrent-earn or unique-index paths | R8.6 |
| **Telemetry sink** | nothing in `lib/` | R4.9, R8.5, R7.23 |
| **Rate limiter** | nothing; no Redis/Upstash dependency | R5.10 |
| **SVG flag assets** | `public/` holds five stock Next.js SVGs | R7.2, R7.2a |
| **Cormorant Garamond, Jost** | not in the `app/globals.css` `@import` | R7.0, §7.1 |
| **`remarkable_person.country_code`** | column does not exist | R4.1, R4.11–R4.13 |
| **`good_news_item.location` data** | column exists, mostly null | R6.8 |

Two of these are cheap to under-scope and expensive to retrofit: the **telemetry sink**
(without it R4.9 is a comment, and the country table never improves) and the **test runner**
(the resolver is the highest-value unit-testable surface in the feature, and R8.6's
concurrent-earn test is the only proof L2 is actually fixed).

### 11.2 Build order

1. **§0.3 — D1–D4 are ratified**, so steps 3–7 are unblocked. **D5–D7 still need a yes**, and
   they gate steps 2, 6 and 8 respectively; if any is declined, drop its step rather than
   improvising a substitute.
2. **`remarkable_person.country_code`** — column, admin field, backfill (R4.11–R4.13).
3. **Install vitest.** Then build `lib/countries.ts` and its table-driven suite. It is pure and
   synchronous (R4.10), needs no DB, and unblocks everything else. Harvest all six legacy
   tables (§4.1) — two live only in `maison-d-or-ejected`.
4. **Schema + migration** (§3.2), then `app/passport/actions.ts` (§5).
5. **Cut the three live call sites off Base44** and delete the three ported country tables.
   L1 stops shipping at this step — do not leave it for a polish pass.
6. **Assets and fonts** (R7.0, R7.2a), then rebuild the three components properly (§7).
7. **`/passport` route** (D4), replacing the modal.
8. **`good_news`**: backfill `location` (R6.8) *first*, then wire the trigger (R6.7).
9. **Greatest Moments** — deferred, §6.2. Revisit once R6.8's backfill pipeline exists, since
   it is the same shape of work.

### 11.3 Open questions

| # | Question | Owner |
|---|---|---|
| Q1 | R5.4: does `timesEarned` count **trigger events** (legacy) or **distinct days** (recommended)? The UI copy differs — "Encountered 4×" vs "Seen on 4 days". Still unanswered; §7.4's detail panel copy depends on it. | product |
| Q2 | `flag-icons` dependency vs. self-hosted SVG subset (R7.2a) — determines the medallion's asset-path contract. | eng |
| Q3 | Appendix A footnote: 193 UN members, or 195 including observers? Affects every displayed total (though not the code, which derives from `COUNTRIES.length`). | product |

---

## Appendix A — Canonical Country List (193 UN member states)

```ts
export const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' }, { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' }, { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' }, { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' }, { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' }, { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' }, { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' }, { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' }, { code: 'CD', name: 'DR Congo' },
  { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czechia' },
  { code: 'DK', name: 'Denmark' }, { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' }, { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' }, { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' }, { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' }, { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' }, { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' }, { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' }, { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' }, { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' }, { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' }, { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' }, { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' }, { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'North Macedonia' }, { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' }, { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' }, { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' }, { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' }, { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' }, { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' }, { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' }, { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' }, { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' }, { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' }, { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' }, { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' }, { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' }, { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
] as const;
```

> If the product prefers to include UN observer states, add `{ code: 'VA', name: 'Vatican City' }`
> and `{ code: 'PS', name: 'Palestine' }` for 195 — but make it a deliberate, documented choice
> and keep all copy derived from `COUNTRIES.length`.

## Appendix B — Demonym Seed Data

Union of the five legacy tables, to seed `resolveNationality`. Extend to full coverage of
Appendix A.

```
French→FR  France→FR  British→GB  English→GB  Scottish→GB  Welsh→GB  United Kingdom→GB  UK→GB
Britain→GB  American→US  United States→US  USA→US  America→US  German→DE  Germany→DE
Italian→IT  Italy→IT  Spanish→ES  Spain→ES  Portuguese→PT  Portugal→PT  Dutch→NL
Netherlands→NL  Belgian→BE  Belgium→BE  Swiss→CH  Switzerland→CH  Austrian→AT  Austria→AT
Irish→IE  Ireland→IE  Swedish→SE  Sweden→SE  Norwegian→NO  Norway→NO  Danish→DK  Denmark→DK
Finnish→FI  Finland→FI  Greek→GR  Greece→GR  Russian→RU  Russia→RU  Soviet→RU  USSR→RU
Soviet Union→RU  Polish→PL  Poland→PL  Czech→CZ  Czechia→CZ  Czech Republic→CZ
Czechoslovakia→CZ  Hungarian→HU  Hungary→HU  Romanian→RO  Romania→RO  Bulgaria→BG
Croatia→HR  Serbia→RS  Ukrainian→UA  Ukraine→UA  Canadian→CA  Canada→CA  Mexican→MX
Mexico→MX  Brazilian→BR  Brazil→BR  Argentine→AR  Argentina→AR  Chilean→CL  Chile→CL
Colombian→CO  Colombia→CO  Peru→PE  Venezuela→VE  Ecuador→EC  Bolivia→BO  Paraguay→PY
Uruguay→UY  Cuban→CU  Cuba→CU  Japanese→JP  Japan→JP  Chinese→CN  China→CN  Korean→KR
South Korea→KR  North Korea→KP  Indian→IN  India→IN  Pakistani→PK  Pakistan→PK
Bangladesh→BD  Sri Lanka→LK  Nepal→NP  Thai→TH  Thailand→TH  Vietnamese→VN  Vietnam→VN
Indonesian→ID  Indonesia→ID  Malaysia→MY  Singapore→SG  Philippines→PH  Turkish→TR
Turkey→TR  Iranian→IR  Iran→IR  Persian→IR  Iraq→IQ  Saudi Arabia→SA  UAE→AE
United Arab Emirates→AE  Israeli→IL  Israel→IL  Jordan→JO  Lebanon→LB  Egyptian→EG  Egypt→EG
Moroccan→MA  Morocco→MA  Algeria→DZ  Tunisia→TN  Nigerian→NG  Nigeria→NG  Kenyan→KE  Kenya→KE
Ethiopia→ET  Ghana→GH  Tanzania→TZ  South African→ZA  South Africa→ZA  Australian→AU
Australia→AU  New Zealander→NZ  New Zealand→NZ  Iceland→IS  Luxembourg→LU  Malta→MT  Cyprus→CY
Polish-French→PL  British-American→GB  Austro-Hungarian→AT
```

## Appendix C — City Seed Data (for `resolveLocation`)

```
Paris→FR  Berlin→DE  London→GB  Washington→US  New York→US  Moscow→RU  Rome→IT  Madrid→ES
Tokyo→JP  Beijing→CN  Lisbon→PT  Athens→GR  Amsterdam→NL  Warsaw→PL  Cairo→EG  Istanbul→TR
Dublin→IE  Stockholm→SE  Vienna→AT  Kyiv→UA  Jerusalem→IL
```

## Appendix D — File Maps

### D.1 Target layout (`maison-d-or-nextjs`)

| Concern | File | State |
|---|---|---|
| Country table + resolvers | `lib/countries.ts` | **new** |
| Design tokens | `lib/flagSealTokens.ts` | **new** |
| Schema | `src/db/schema.ts` (`flagSeal`, `flagSealSource`) | extend |
| Migration | `drizzle/0019_*.sql` | **new**, via `npm run db:generate` |
| Earn + read actions | `app/passport/actions.ts` | **new** |
| Passport route | `app/passport/page.tsx` | **new** (D4) |
| Medallion | `components/dailygold/FlagSealMedallion.jsx` | rewrite (L5, L9) |
| Celebration | `components/dailygold/FlagSealCelebration.jsx` | rewrite (queue, R7.6) |
| Collection view | `components/dailygold/FlagCollectionView.jsx` | rewrite as the `/passport` body (L4, L11) |
| Earn hook | `components/dailygold/useFlagEarn.ts` | **new** (§7.5) |
| Page-level earn handler | `components/dailygold/DailyGoldEditionPage.jsx:178-200` | delete, replaced by the hook (L1, L6, L12) |
| Country tables to delete | `DGBornToday.jsx:13`, `DGDestination.jsx:8`, `DGOnThisDay.jsx:9` | delete (L3) |
| `born_today` trigger | `components/dailygold/StorybookView.jsx` + `app/stories/[name]/page.tsx` | **new** (R6.9) |
| `good_news` trigger | `components/dailygold/DGGoodNews.jsx:91,204,254` | **new** (R6.7) |
| Person country code | `src/db/schema.ts`, `components/admin/PersonEditor.tsx`, `app/daily-gold-edition/actions.ts:79` | extend (R4.11–R4.13) |
| Auth boundary (reference) | `lib/dal.ts` — `getActiveChild`, `requireChildContext` | unchanged; §5.3 depends on it |

### D.2 Legacy layout (`maison-d-or-ejected`)

For anyone cross-referencing the original implementation:

| Concern | Legacy file |
|---|---|
| Earn function | `base44/functions/earnFlagSeal/entry.ts` |
| Entity schema | `base44/entities/FlagSeal.jsonc` |
| Data hand-patch | `base44/functions/patchBornTodayCountryCodes/entry.ts` |
| Medallion atom | `src/components/dailygold/FlagSealMedallion.jsx` |
| Celebration | `src/components/dailygold/FlagSealCelebration.jsx` |
| Collection view | `src/components/dailygold/FlagCollectionView.jsx` |
| Page-level earn handler | `src/pages/DailyGoldEdition.jsx:242-264` |
| Collection entry point | `src/components/dailygold/ChildGreetingStrip.jsx` ("My Flags") |
| `born_today` trigger | `src/pages/StorybookPage.jsx:844`, `StorybookPageV2.jsx:132`, `BiographyStorybook.jsx:539` |
| `on_this_day` trigger | `src/components/dailygold/DGOnThisDay.jsx:165-175` |
| `destination` trigger | `src/components/dailygold/DGDestination.jsx:316-324` |
| Dead `onFlagEarned` prop | `src/components/dailygold/DGBornToday.jsx:289` |
