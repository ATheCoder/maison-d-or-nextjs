# Authentication & Authorization Plan

Final plan for Maison d'Oré's auth system, agreed 2026-07-17. Covers identity,
sessions, family/child-profile structure, authorization, and the complete exit
from Base44. Implementation follows the phases at the end; nothing here is
built yet.

## 1. Principles

- **Children are profiles, not accounts.** Only admins and parents/guardians
  hold credentials. A child session is a guardian's session with an active
  child profile attached (Netflix/Disney+ model). Children never have an
  email, password, or SSO identity.
- **Sibling isolation via optional PINs.** A guardian may set a PIN on any
  child profile; a PIN-protected profile cannot be entered without it.
  Profiles without a PIN open directly from the picker. Either way, profile
  context only ever changes server-side.
- **Database sessions, not JWTs.** Session state (notably the active child
  profile) is mutable and must be revocable instantly across devices — a
  parent kills or changes a session and the child's next request obeys. JWTs
  cannot be revoked or updated once issued, and their one benefit
  (verification without a DB hit) is worthless in a same-origin app where
  every request already runs next to Postgres. If session reads ever matter
  in profiling, Better Auth's cookie cache (short-TTL signed snapshot backed
  by the DB row) is the tuning knob — revocation window of minutes, not
  weeks.
- **Authorization lives in a data-access layer, not in middleware or
  layouts.** Every page and server action enforces its own access; `proxy.ts`
  only does optimistic redirects for UX.
- **Family scoping is an invariant, not a filter.** Child-scoped reads and
  writes never accept a child-profile id from the client; it comes from the
  session. Where a guardian passes one explicitly (dashboard), the DAL
  verifies it belongs to the guardian's family before anything is returned.
- **Complete Base44 exit.** Auth work absorbs the remaining Base44 entities
  and functions; the end state has no `@base44/sdk` dependency.

## 2. Library: Better Auth

Better Auth with the Drizzle adapter, database session strategy.

Why not Auth.js: our primary flow is email/password, which Auth.js treats as
a discouraged escape hatch (no signup, hashing, reset, or verification
machinery for credentials), and its credentials path pushes toward JWT
sessions — both the opposite of this design. Better Auth ships first-class
email/password (registration, hashing, verification, reset, login rate
limiting), DB sessions by default, typed additional fields on user and
session, and social providers as configuration for the later SSO phase.

Risk posture: Better Auth is the younger project, but everything it manages
sits in our Postgres in standard-shaped tables, and all product-specific
logic (families, profiles, PINs, scoping) lives in our own DAL — the library
only owns identity plumbing, so replacing it later would be data work, not an
unpicking.

## 3. Data model

Identity (Better Auth-managed, extended with our fields):

| Table | Key fields | Notes |
|---|---|---|
| `user` | email (unique), name, `role` enum `admin` \| `guardian`, `family_id` FK (null for admins), `pin_hash` (guardian PIN for the grown-up gate) | Account holders only |
| `account` | user_id, provider, provider_account_id, password_hash | `credentials` rows now; `google` etc. later. This separation is what makes SSO additive |
| `session` | hashed token, user_id, expires_at, **`active_child_profile_id`** (nullable FK) | DB-backed; httpOnly/Secure/SameSite=Lax cookie; sliding expiry |
| `verification` | Better Auth's token table | Email verification, password reset |

Domain:

| Table | Key fields | Notes |
|---|---|---|
| `family` | id, name | |
| `family_invite` | family_id, email, hashed token, role, expires_at, invited_by | Path for additional guardians |
| `child_profile` | family_id, display_name, birth_date, avatar (preset key), `pin_hash` (nullable — optional PIN), pin_locked_until, `theme_preference` (phase 5, for `ThemeContext`) | Age 5–17 enforced at creation (lib/child-birth-date.ts). Minimal PII by design: nickname + birthday + preset avatar only |
| `saved_item` | child_profile_id, item_type, item_id, denormalized title/subtitle/image, saved_at | Replaces Base44 `SavedItem` |
| `flag_seal` | child_profile_id, country_code, source, earned_at; unique (child_profile_id, country_code) | Replaces Base44 `FlagSeal` + `earnFlagSeal` |
| `analytics_event` | child_profile_id, event_type, content_type, content_id, duration_seconds, occurred_at | Replaces Base44 `AnalyticsEvent`; consider daily rollup table when the dashboard lands |

The placeholder `users` table in `schema.ts` is replaced by this model. The
Base44 `Treasury` entity (one usage) gets its shape inventoried and a local
equivalent in phase 5.

## 4. Sessions and profile switching

- Login (guardian or admin) creates a DB session; guardians land on the
  **profile picker**: one tile per child plus a "Parent" tile. The picker
  itself shows only names and avatars — safe to reach from any state.
- **Entering a PIN-protected child profile requires that profile's PIN.**
  The server action verifies the PIN (when one is set) and only then sets
  `active_child_profile_id` on the session row. Profiles without a PIN are
  entered directly. The client never asserts a profile id, so a forged
  request cannot bypass a profile's PIN.
- **Guardian override:** the guardian PIN (or password) also unlocks any
  child profile. Needed for PIN resets and for a parent viewing a child's
  experience. Setting, changing, or removing a child's PIN happens behind
  the grown-up gate.
- **Grown-up gate:** leaving child mode for the picker is free; entering the
  parent area (dashboard, family management) requires the guardian PIN.
- **PIN posture:** 4-digit PINs are a sibling lock, not a cryptographic
  control. They are hashed and attempt-throttled (short per-profile lockout
  after a few failures, guardian-PIN unlock). The session cookie and family
  scoping remain the real security boundary.
- Side benefit: for PIN-protected profiles, gated entry makes analytics
  attribution trustworthy — the dashboard shows the actual child's activity.

## 5. Authorization

Three layers:

1. **DAL (the security boundary)** — a server-only module exposing
   request-cached `getSession()` plus `requireUser()`, `requireAdmin()`,
   `requireGuardian()`, `requireChildContext()`. Every page and server action
   calls one of these itself. Layout checks are never relied on (layouts
   don't re-run on client navigation).
2. **Family scoping invariant** — as in §1. All child-data queries filter by
   the session's family; dashboard queries verify profile → family ownership.
3. **`proxy.ts`** — optimistic redirects only (`/admin/*` and app pages →
   `/login`; logged-in guardian without profile context → picker). Never the
   authorization check.

Role capabilities:

- **Admin** — `/admin` area with CRUD over content tables
  (`remarkable_person`, `good_news_item`, `on_this_day_event`,
  `greatest_moment`, `daily_gold_edition`). No self-serve admin signup; the
  first admin is seeded by script. Admins have no family and no access to any
  family's analytics.
- **Guardian** — manage family (invite co-guardians, create/edit child
  profiles and PINs), view own-family children's analytics and saved items.
- **Child context** — read content, save items, earn flag seals, emit
  analytics; own profile only; no guardian or admin surface reachable.

Existing gap closed by this work: the client-callable `saveEnrichedEvent`
action is an open endpoint today. It is deleted in phase 7 when enrichment
moves fully server-side (until then, phase 4 gates it behind a session).

## 6. Flows

- **Guardian signup** — creates user + family in one step. Email verification
  soft-required (nag but don't block) unless decided otherwise. Additional
  guardians join only via `family_invite` links.
- **Login → picker → child mode** — as in §4. Child-mode UI hides parent
  navigation entirely; analytics attribute to the active profile from the
  moment it is set.
- **Admin** — same login page, redirected to `/admin` by role.
- **SSO (later)** — Google (then others) for guardians and admins only,
  linked through the `account` table, matched on verified email. Children
  never touch SSO.
- **Analytics capture** — client batches view/heartbeat events (section,
  content id, duration); a server action stamps them with the session's
  profile. The client reports *what*, never *who*.

## 7. Child privacy posture

- No child credentials or contact info anywhere; guardian-created profiles
  are the parental-consent path (COPPA/GDPR-K aligned).
- Child PII limited to nickname, birthday, preset avatar.
- Analytics visible only to same-family guardians; never third parties.
- Retention: raw `analytics_event` rows kept for a fixed window (default
  12 months, see §9), rollups kept longer.
- Cookies httpOnly/Secure/SameSite=Lax; login rate limiting; generic auth
  error messages (no account enumeration).

## 8. Base44 exit map

| Base44 usage | Replacement | Phase |
|---|---|---|
| `Child` entity + hardcoded child id in `DailyGoldEditionPage` | `child_profile` + session context | 3 |
| `Child.list()` in the greeting strip's reader switcher | `child_profile` scoped by family + the picker's `enterChildProfile` (PIN path included) | 3 |
| `Child.theme_preference` in `ThemeContext` | Needs a `theme_preference` column on `child_profile` — see §3 | 5 |
| `SavedItem` (SaveHeartSeal, saved lists) | `saved_item` + server actions | 5 |
| `FlagSeal` + `earnFlagSeal` | `flag_seal` + one server action (new/already-earned dedupe) | 5 |
| `AnalyticsEvent` | `analytics_event` + batched capture action | 5 |
| `Treasury` | Local equivalent (inventory shape first) | 5 |
| `enrichHistoricalEvent` | Own server-side pipeline: LLM research/rewrite (OpenRouter pattern exists in `scripts/generate-story-openrouter.mjs`) + image generation + R2 upload. Inputs are the preserved `raw_text`/`raw_extract` on `on_this_day_event` (310 un-enriched rows to backfill) | 7 |
| `saveEnrichedEvent` server action (the write-through bridge) | Deleted — enrichment no longer round-trips through the client | 7 |
| `api/base44Client.js` + `@base44/sdk` | Removed; exit criterion is the app compiling and running clean without the dependency | 7 |

## 9. Open decisions (defaults apply unless changed)

1. **Is content login-gated?** Default **yes**: daily gold requires a session
   (child context or guardian); only marketing/landing pages are public. The
   product is family-scoped and analytics are per-profile.
2. **One family per guardian?** Default **yes** for v1. Cross-household
   co-parenting would need a membership table; revisit if demanded.
3. **Analytics retention?** Default **12 months raw, rollups indefinitely**.
4. Email verification strictness (default: soft-require).

## 10. Phases

| Phase | Delivers | Exit criterion |
|---|---|---|
| 1 | Identity core: Better Auth + Drizzle wiring, identity tables, signup/login/logout, roles, admin seed script, `/login` + `/signup`, `proxy.ts` redirects | Guardian can sign up, log in, log out; admin seeded and redirected to a stub `/admin` |
| 2 | Families + invites | Second guardian joins a family via emailed invite link |
| 3 | Child profiles, picker with optional PIN gates, child mode, grown-up gate, guardian override, PIN throttling; Daily Gold reads its reader from the session (hardcoded child id deleted) and its greeting-strip switcher changes profile through the same PIN-gated action | A PIN-protected profile cannot be entered without its PIN; parent can override, set, and reset PINs; Daily Gold shows the active profile with no `Child` entity call |
| 4 | Authorization sweep: DAL helpers on every existing action/page, gate `saveEnrichedEvent`, `/admin` shell with content CRUD | No unauthenticated mutation endpoints; admin can edit content without touching the DB |
| 5 | Base44 entity exit: `saved_item`, `flag_seal`, `analytics_event`, `child_profile.theme_preference`, Treasury equivalent; rewire SaveHeartSeal, flag earning, collection view, the greeting strip's flag/save links, `ThemeContext` | Child features work end-to-end with zero Base44 entity calls |
| 6 | Parent analytics dashboard (per-child reading time, sections, saves) | Guardian sees own children only; cross-family access provably impossible |
| 7 | Own enrichment pipeline; backfill 310 raw events; delete `saveEnrichedEvent`; remove `@base44/sdk` | `npm uninstall @base44/sdk` and the app builds and runs clean |
| 8 | Google SSO, password reset polish, rate-limit hardening | Guardian can link/login with Google; children still cannot |
