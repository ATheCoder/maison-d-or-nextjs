import 'server-only';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { db } from '@/src/db';
import { remarkablePerson } from '@/src/db/schema';

/**
 * The cache tags the Daily Gold reads are stored under, and the one way a
 * writer is allowed to invalidate them.
 *
 * One definition, used by both sides. The reads in
 * app/(dg)/daily-gold-edition/queries.ts tag their entries with the builders
 * below; every writer in the app calls a `touch*` function. A tag written as a
 * string literal in two files is a tag that goes stale the first time one of
 * them is edited and the other is not — and the failure is silent, because a
 * cache that never invalidates looks exactly like a cache that is working.
 *
 * ── Why the writers may not call `revalidatePath` themselves ──────────────
 *
 * They did, and it cost real staleness twice. `revalidatePath` clears the
 * *router* cache for a page; a `use cache` entry lives in a different layer and
 * is only reached by its tag. A writer holding only `revalidatePath` therefore
 * looks invalidated, reviews as invalidated, and leaves the reader on a copy
 * that `cacheLife('max')` will keep for thirty days. Four writers were in
 * exactly that state before this module absorbed them.
 *
 * So the two halves are welded together here: every `touch*` fires the tags
 * *and* the paths that belong to the thing it names, and nothing outside this
 * file imports `next/cache`'s invalidation primitives at all.
 * `lib/daily-gold-tags.contract.test.ts` asserts both, so a new writer that
 * reaches for `revalidatePath` alone is a red test rather than a bug nobody
 * sees for a month.
 *
 * ── What each tag covers ──────────────────────────────────────────────────
 *   dg-edition:<YYYY-MM-DD>  the edition row a reader sees for that day
 *   dg-goodnews:<YYYY-MM-DD> that day's published good-news column
 *   dg-almanac:<MM-DD>       On This Day + Greatest Moments for that month-day
 *   dg-people:<MM-DD>        the Born Today gallery for that month-day
 *   person:<slug>            one published Golden Story
 *   dg-dates                 the set of days the wax-seal navigator offers,
 *                            and which day is "latest"
 */

export const dgEditionTag = (date: string) => `dg-edition:${date}`;
export const dgGoodNewsTag = (date: string) => `dg-goodnews:${date}`;
export const dgAlmanacTag = (monthDay: string) => `dg-almanac:${monthDay}`;
export const dgPeopleTag = (monthDay: string) => `dg-people:${monthDay}`;
export const personTag = (slug: string) => `person:${slug}`;
export const DG_DATES_TAG = 'dg-dates';

/** The month-day an edition date or a birth date falls on, or null. */
export const monthDayOf = (date: string | null | undefined): string | null =>
  typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5) : null;

// ── Who is doing the writing ─────────────────────────────────────────────────

/**
 * Where the write happened, which decides both primitives a `touch*` uses.
 *
 * `'action'` — a Server Action: an admin has just made an edit and is looking
 *   at the screen. `updateTag` expires the entry outright, because
 *   read-your-own-writes is the requirement — stale-while-revalidate would show
 *   them their previous version and make the desk feel broken. The paths go out
 *   too: they clear the router cache for the admin's own pages, which is the
 *   layer the tags do *not* reach.
 *
 * `'job'` — an Inngest run, i.e. a Route Handler. Two differences, both forced:
 *   `updateTag` throws outside a Server Action (Next raises E872), so the tag
 *   is marked stale with `revalidateTag(tag, 'max')` instead — the next family
 *   to open the day is served the previous copy while the fresh one is fetched,
 *   which is the right trade for a write nobody is sitting in front of. And no
 *   paths: `revalidatePath` from a background run can only purge the client
 *   cache of the request that called it, and that request belongs to Inngest,
 *   not to an admin. The admin desk polls its job rows, so it learns anyway.
 */
export type TouchFrom = 'action' | 'job';

export type TouchOpts = { from?: TouchFrom };

const tagger = (from: TouchFrom) =>
  (from === 'job' ? (tag: string) => revalidateTag(tag, 'max') : updateTag);

function pathsFor(from: TouchFrom, paths: string[]) {
  if (from === 'job') return;
  for (const path of paths) revalidatePath(path);
}

const dayPaths = (date: string) => [
  `/admin/daily-gold/${date}`,
  '/admin/daily-gold',
  '/daily-gold-edition',
];

// ── The touches ──────────────────────────────────────────────────────────────

/**
 * One calendar day's edition row changed.
 *
 * `news` is for the writes that move the good-news column with the edition —
 * publishing the day, accepting or rejecting a retrieved story — as opposed to
 * editing a field on the edition row itself, which leaves the column alone.
 *
 * `dates` is for the writes that change *which* days exist for the reader —
 * publishing, unpublishing, deleting — as opposed to editing a day that was
 * already visible. Getting it wrong in the safe direction costs one recompute
 * of a list read; getting it wrong the other way leaves a published day missing
 * from the navigator, so when in doubt, pass it.
 */
export function touchEdition(
  date: string,
  { news = false, dates = false, from = 'action' }: TouchOpts & { news?: boolean; dates?: boolean } = {},
) {
  const tag = tagger(from);
  tag(dgEditionTag(date));
  if (news) tag(dgGoodNewsTag(date));
  if (dates) tag(DG_DATES_TAG);
  pathsFor(from, dayPaths(date));
}

/** One day's good-news column changed, and its edition row did not. */
export function touchGoodNews(date: string, { dates = false, from = 'action' }: TouchOpts & { dates?: boolean } = {}) {
  const tag = tagger(from);
  tag(dgGoodNewsTag(date));
  // Good news is one of the three sources getAvailableDates counts, so
  // publishing the first story on a day can put that day in the navigator.
  if (dates) tag(DG_DATES_TAG);
  pathsFor(from, dayPaths(date));
}

/**
 * On This Day or Greatest Moments changed for a month-day.
 *
 * One tag for two tables: both are authored on the same almanac screen and read
 * by the same page, so splitting them would buy nothing and cost a writer the
 * chance to clear one and forget the other.
 */
export function touchMonthDay(monthDay: string, { from = 'action' }: TouchOpts = {}) {
  tagger(from)(dgAlmanacTag(monthDay));
  pathsFor(from, [
    `/admin/daily-gold/almanac/${monthDay}`,
    '/admin/daily-gold',
    '/daily-gold-edition',
  ]);
}

/**
 * A person changed.
 *
 * `monthDays` is a list because an edit can move someone: savePerson may write
 * a new birth date, which retires them from one Born Today gallery and adds
 * them to another. Both galleries are wrong until both are cleared, so a caller
 * that is changing a birth date passes the old one and the new one.
 */
export function touchPerson(slug: string, monthDays: (string | null)[] = [], { from = 'action' }: TouchOpts = {}) {
  const tag = tagger(from);
  tag(personTag(slug));
  for (const md of new Set(monthDays.filter((md): md is string => !!md))) {
    tag(dgPeopleTag(md));
  }
  // A person is one of the three sources getAvailableDates counts, so
  // publishing, unpublishing, deleting or re-dating one can move the set.
  tag(DG_DATES_TAG);
  pathsFor(from, [
    `/admin/people/${slug}`,
    '/admin/people',
    `/stories/${slug}`,
    '/admin/daily-gold',
    '/daily-gold-edition',
  ]);
}

/**
 * `touchPerson` for the callers that hold only a slug — the image writers and
 * the Inngest runs, which change a painting or a paragraph and never a birth
 * date. The gallery is read back here rather than at each of those seven call
 * sites, because a person whose picture changed but whose `dg-people:<MM-DD>`
 * entry did not is exactly the leak this module exists to close.
 */
export async function touchPersonBySlug(slug: string, opts: TouchOpts = {}) {
  const rows = await db
    .select({ birthDate: remarkablePerson.birthDate })
    .from(remarkablePerson)
    .where(eq(remarkablePerson.slug, slug))
    .limit(1);
  touchPerson(slug, [monthDayOf(rows[0]?.birthDate)], opts);
}

/**
 * The admin's own pages, and no cache tag — for a write no reader can see yet:
 * a draft edition row, an unpublished story, a scene that only the image modal
 * reads.
 *
 * Naming it rather than reaching for `revalidatePath` is the point. "This one
 * needs no tag" is a claim about what the reader queries filter on, and it
 * should be made on purpose and be greppable; an omission looks identical to
 * the bug.
 */
export function touchDesk(...paths: string[]) {
  for (const path of paths) revalidatePath(path);
}
