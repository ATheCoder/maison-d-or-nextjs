import 'server-only';
import { updateTag } from 'next/cache';

/**
 * The cache tags the Daily Gold reads are stored under, and the invalidations
 * the admin desk performs against them.
 *
 * One definition, used by both sides. The reads in
 * app/(dg)/daily-gold-edition/queries.ts tag their entries with the builders
 * below; the four admin writers call the invalidators. A tag written as a
 * string literal in two files is a tag that goes stale the first time one of
 * them is edited and the other is not — and the failure is silent, because a
 * cache that never invalidates looks exactly like a cache that is working.
 *
 * `updateTag` rather than `revalidateTag` throughout: these are all Server
 * Actions driven by an admin who has just made an edit and is looking at the
 * screen. Read-your-own-writes is the requirement — stale-while-revalidate
 * would show them their previous version and make the desk feel broken. The
 * `revalidatePath` calls already in those actions stay: they clear the router
 * cache for the admin's own pages, which is a different layer from these.
 *
 * `updateTag` can only be called from a Server Action; every function here is
 * invoked from inside one.
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

/**
 * One day's edition row changed.
 *
 * `alsoDates` is for the writes that change *which* days exist for the reader
 * — publishing, unpublishing, deleting — as opposed to editing a day that was
 * already visible. Getting it wrong in the safe direction costs one recompute
 * of a list read; getting it wrong the other way leaves a published day
 * missing from the navigator, so when in doubt, pass it.
 */
export function invalidateEdition(date: string, { alsoDates = false } = {}) {
  updateTag(dgEditionTag(date));
  if (alsoDates) updateTag(DG_DATES_TAG);
}

/** One day's good-news column changed. Publishing a story can create a day. */
export function invalidateGoodNews(date: string, { alsoDates = false } = {}) {
  updateTag(dgGoodNewsTag(date));
  if (alsoDates) updateTag(DG_DATES_TAG);
}

/** On This Day or Greatest Moments changed for a month-day. */
export function invalidateAlmanac(monthDay: string) {
  updateTag(dgAlmanacTag(monthDay));
}

/**
 * A person changed.
 *
 * `monthDays` is a list because an edit can move someone: savePerson may write
 * a new birth date, which retires them from one Born Today gallery and adds
 * them to another. Both galleries are wrong until both are cleared.
 */
export function invalidatePerson(slug: string, monthDays: (string | null)[] = []) {
  updateTag(personTag(slug));
  for (const md of new Set(monthDays.filter((md): md is string => !!md))) {
    updateTag(dgPeopleTag(md));
  }
  // A person is one of the three sources getAvailableDates counts, so
  // publishing, unpublishing, deleting or re-dating one can move the set.
  updateTag(DG_DATES_TAG);
}
