# Maison d'Ore

A Next.js app with two faces:

- **`/`** — the public editorial homepage.
- **`/daily-gold-edition`** — the product. A new edition each morning: a destination,
  the remarkable lives born on this date, the news worth telling a child, greatest
  moments, a taste/sound/nature trio, a phrase in another language. Children read it
  behind a family account and collect what they find into a **Passport** (country flag
  seals) and a **Treasury** (saved treasures); guardians watch from the **Parent
  Observatory**; the owner writes and publishes everything from **`/admin`**.

Long-form design docs live in [`docs/`](docs/). Conventions for AI agents working in
this repo are in [`AGENTS.md`](AGENTS.md).

## Requirements

- Node 22+ (the scripts use `--env-file` / `--env-file-if-exists`)
- Docker, for Postgres and the local Inngest dev server (`docker-compose.yml`)

## Getting started

```bash
npm install
docker compose up -d          # Postgres on :5555, Inngest dev server on :8288
```

Create `.env` in the repo root:

```bash
DATABASE_URL=postgres://user:password@localhost:5555/mydb
BETTER_AUTH_SECRET=<any long random string>
```

Then migrate, create the admin account, and run the dev server:

```bash
npm run db:migrate
npm run seed:admin -- --email you@example.com --password 'at least 8 chars'
npm run dev                   # http://localhost:3000
```

`seed:admin` is the **only** way an admin comes to exist — there is no self-serve admin
signup (`docs/auth-plan.md` §5). Re-running it updates the password and keeps the role.
Everyone else signs up normally at `/signup`.

With no `RESEND_API_KEY` set, outbound mail is printed to the server console instead of
sent, so signup, invites and password resets all work end to end locally — the console
line carries the real reset link.

## The build needs a database

```jsonc
"build": "drizzle-kit migrate && next build"
```

`npm run build` **runs migrations first** and fails if `DATABASE_URL` is unset or the
database is unreachable. This is deliberate: schema and code ship together. `drizzle-kit`
reads `.env` on its own, so no `--env-file` flag is needed here — but a CI or deploy
target must have a reachable database at build time, not just at runtime.

## Environment

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | everything — the app, every script, and `npm run build` |
| `BETTER_AUTH_SECRET` | signing sessions; required in every environment |
| `BETTER_AUTH_URL` | production only — the app's public origin |
| `RESEND_API_KEY` | real email delivery; absent = console fallback (see above) |
| `EMAIL_FROM` | the `From` header. Defaults to Resend's shared sender, which only delivers to the account owner — set your own in production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | `seed:admin`, when you'd rather not pass flags |
| `OPENROUTER_API_KEY` | Golden Story generation (`/admin/people`, the story writer and illustrator) |
| `S3_API`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_DOMAIN` | media uploads to R2 — story art, flag assets |
| `BASE44_APP_ID` / `BASE44_API_KEY` | the one-time `import:daily-gold` migration only |
| `PRODUCTION_DATABASE_URL` | `import:prod-db` — the Neon connection string, direct endpoint (put it in `.env.local`) |

`.env.local` overrides `.env` for the scripts (`--env-file-if-exists`).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `start` | dev server / production server |
| `npm run build` | **migrate, then build** (see above) |
| `npm test` | Vitest, once. `test:watch` to keep it running |
| `npm run lint` | ESLint |
| `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle Kit |
| `npm run seed:admin` | create or update the admin account |
| `npm run import:daily-gold` | one-time import of editions from Base44 |
| `npm run import:remarkable-people` / `sync:remarkable-people` | remarkable-person corpus in and out |
| `npm run backfill:country-codes` | populate `remarkable_person.country_code` |
| `npm run generate:story:openrouter` | write a Golden Story from the CLI |
| `npm run upload:story-media` / `rewrite:story-media-urls` / `compress:story` | story art pipeline (`docs/golden-story-art-pipeline.md`) |
| `npm run import:prod-db` | **wipe the local database and restore it from production** (see below) |
| `npm run sync:db` / `sync:flags` | local database and flag-asset sync helpers |

## Working from production data

```bash
# .env.local — the direct Neon endpoint, not the -pooler one
PRODUCTION_DATABASE_URL=postgresql://...@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

```bash
npm run import:prod-db -- --dry-run   # connect, compare versions, count rows, write nothing
npm run import:prod-db                # then do it
```

This **replaces** the local database: `pg_dump` from Neon, drop every schema in
`mydb` (`public` and drizzle's), restore. Local rows, local migrations and the admin
from `seed:admin` do not survive — sign in with a production account afterwards. It
refuses to run against a target that isn't on this machine, and asks you to type the
database name first. `--schema-only`, `--data-only`, `--dump-file`, `--from-dump` and
`--yes` are there when you need them; `node scripts/import-prod-db.mjs --help` is the
header comment of the script.

To go the other way — top a database up with rows the other one has, changing nothing
that already exists — that's `npm run sync:db`, which never drops or overwrites.

## Things worth knowing before you edit

- **Cache Components is on** (`cacheComponents: true` in `next.config.ts`). Pages are
  dynamic by default and `export const dynamic` is dead config — it is gone from all 18
  files that carried it and must not come back. Uncached data or a runtime API read
  outside `<Suspense>` is a build error, not a silent opt-out.
- **`proxy.ts`, not `middleware.ts`.** It does optimistic redirects only — it checks that
  a session cookie *exists*, never that it is valid. Real authorization is in
  `lib/dal.ts`, on every page and action.
- **Cache invalidation goes through `lib/daily-gold-tags.ts`**, which owns every
  `revalidateTag` / `updateTag` / `revalidatePath` call in the repo and fires tags and
  paths together. `lib/daily-gold-tags.contract.test.ts` enforces that statically — if
  you add a mutating export without a matching `touch*`, the test fails. Three shipped
  bugs came from getting this wrong by hand.
- **The clock is request data.** The footer's copyright year is stamped at config load
  (`NEXT_PUBLIC_BUILD_YEAR`) because reading it during render was enough on its own to
  keep the homepage off the prerender. See `components/maison/CopyrightYear.tsx`.
- **Route groups:** `app/(site)` is the public homepage, `app/(dg)` is the Daily Gold
  reading experience and its chrome, `app/admin` is the writing desk.
- **`.jsx` is type-checked too.** `tsconfig.json` sets `checkJs` and includes
  `**/*.jsx`, so a new file in `components/dailygold/` or `components/treasury/`
  is checked from the day it is written whichever extension it carries. The
  legacy files that don't pass yet each carry a `@ts-nocheck` line saying so —
  `git grep -l ts-nocheck` is the backlog, and clearing one file means deleting
  its marker and fixing what it hid. A marker must sit **above** `'use client'`;
  below it, TypeScript never sees it and the file is silently checked anyway.
- The reader's boundary is typed end to end: `app/(dg)/daily-gold-edition/page.tsx`
  → `DailyGoldEditionPage.tsx` → the six section components, all taking the record
  types `queries.ts` exports. Those are type-only imports of a `server-only`
  module, which is safe because the statement is erased — see
  `.design-sync/NOTES.md` before making one a value import.
- **Themes are one list, not two.** `components/theme/themes.ts` declares
  `THEMES: Record<ThemeKey, Theme>` over `lib/theme-keys.ts` (the server-safe
  half, which server actions read) and re-exports its default, so adding a
  palette on one side without the other is a compile error. Everything a theme
  needs lives on `Theme` — including the picker's `swatch`.
