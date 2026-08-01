import { redirect } from 'next/navigation';
import DailyGoldEditionPage from '@/components/dailygold/DailyGoldEditionPage';
import { getSavedKeys } from '@/app/(dg)/treasury/actions';
import { getTodayExplorationForActiveChild } from '@/app/analytics/actions';
import { getActiveChildProfile } from '@/app/profiles/actions';
import { getSession } from '@/lib/dal';
import { getEditionByDate, getLatestEdition, getAvailableDates, getPeopleForDate, getGoodNewsForDate, getOnThisDayForDate, getGreatestMomentsForDate } from './actions';

// Editions live in the database and change over time, so render per-request.
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The day this request is for, read from `?date=`.
 *
 * Today keeps the bare `/daily-gold-edition`; every earlier day gets
 * `?date=YYYY-MM-DD`, which is what makes an archive day linkable and
 * shareable. Returns `null` for anything that isn't a shareable past day —
 * a malformed value, an impossible calendar date (2026-02-31), a future day,
 * or today spelled out — so the caller can send the reader to the one
 * canonical address instead of showing today's paper under someone else's
 * date.
 */
function resolveDate(raw: string | string[] | undefined, todayStr: string): string | null {
  if (raw === undefined) return todayStr;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Date normalises an overflowing day, so a value that survives the round
  // trip unchanged is a day that actually exists.
  if (parsed.toISOString().slice(0, 10) !== value) return null;
  return value < todayStr ? value : null;
}

function formatDate(date: string): string {
  // Midday, so the server's own timezone can never shift the label a day.
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// A shared archive link should say which day it opens, both in the tab title
// and wherever the link is unfurled.
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const todayStr = today();
  const date = resolveDate((await searchParams).date, todayStr);
  const title = !date || date === todayStr
    ? 'Daily Gold Edition'
    : `Daily Gold Edition — ${formatDate(date)}`;
  return { title, openGraph: { title } };
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const todayStr = today();
  const date = resolveDate((await searchParams).date, todayStr);
  if (date === null) redirect('/daily-gold-edition');

  // The page declares one date — the one in the URL — and every section shows
  // that day's content or nothing; it never borrows another day's content to
  // fill a gap. So the edition row is that day's or absent (see the
  // last-good-day redirect below, which moves the *date* rather than borrowing
  // content for today), and Born Today / On This Day / Greatest
  // Moments are fetched unconditionally: they are keyed by the day's month-day
  // ("what happened on this day across history") and are correct whether or
  // not an edition row exists.
  //
  // Every section is fetched here rather than in the client, which is what
  // lets the date live in the URL: turning to another day is a navigation, and
  // the server answers it the same way for a fresh visitor following a shared
  // link as for a reader pressing the wax seal.
  //
  // The reader itself belongs to layout.tsx, which resolves the session's
  // active child profile once for the chrome that names them (auth-plan §1) —
  // never asserted by the client, and never re-resolved per page turn. What is
  // fetched here is only what the reader may see of the day.
  //
  // The child's saved keys are fetched here too, in one query, so no heart on
  // the page fetches its own fill state. `null` outside child mode, which is
  // how the sections tell "saved nothing" from "no one to save for".
  //
  // `exploration` is the same story for the For Parents card: today's real
  // activity roll-up, resolved from the session like everything else here, and
  // `null` when there is no reader or the roll-up could not be read — the card
  // then shows its own empty state rather than invented numbers. It is always
  // *today's* activity, even when the URL asks for an archive day: the card
  // reports what this child did, not what the paper on screen contains.
  //
  // `session` and `child` are the last two: this route is public, and who is
  // holding the paper decides two things the day itself does not. With no
  // session at all the reader is a stranger, which is worth saying plainly
  // rather than leaving them tapping hearts that were never rendered
  // (onboarding plan WP-D). With `?welcome=1` the reader has just been created
  // by the /welcome wizard, and their paper opens with a flourish — the name
  // comes from the session's own active child, never from the URL, so the
  // parameter can announce nobody else's child.
  const [
    edition,
    dates,
    people,
    goodNews,
    onThisDay,
    greatestMoments,
    savedKeys,
    exploration,
    session,
    child,
  ] = await Promise.all([
    getEditionByDate(date),
    getAvailableDates(),
    getPeopleForDate(date),
    getGoodNewsForDate(date),
    getOnThisDayForDate(date),
    getGreatestMomentsForDate(date),
    getSavedKeys(),
    getTodayExplorationForActiveChild(),
    getSession(),
    getActiveChildProfile(),
  ]);

  const params = await searchParams;
  const welcomeName = params.welcome === '1' && child ? child.name : null;

  // Arriving at the bare route on a day with nothing on it — before the
  // morning's edition is published, or on a day that was never authored — used
  // to open a masthead with empty sections under it. Send that reader to the
  // most recent day that does have a paper instead, at that day's own address:
  // the page still declares one date, every section is still that date's
  // content, and the URL still says which day is on screen, so the wax seal
  // lands on the right day and the link stays shareable.
  //
  // Only when today has *nothing*. A day with good news but no edition row, or
  // only a Born Today gallery, is a real day and shows what it has. And only
  // for the bare route: an explicit `?date=` is the reader asking for that day,
  // empty or not.
  const todayIsBlank = !edition
    && people.length === 0
    && goodNews.length === 0
    && onThisDay.length === 0
    && greatestMoments.length === 0;
  if (date === todayStr && todayIsBlank) {
    // The newest published edition is the fallback because the edition row is
    // what makes a full paper; `dates` catches the case where there is no
    // edition at all but some earlier day still has good news or a birthday.
    const latest = await getLatestEdition();
    const lastGoodDay = latest && latest.edition_date < todayStr
      ? latest.edition_date
      : dates.filter((d) => d < todayStr).pop();
    // `welcome=1` rides along, because this hop is exactly when a new family is
    // most likely to be sent through it: the wizard lands on the bare route, and
    // a household that finishes before the morning's paper is published would
    // otherwise lose the flourish to a redirect it never asked for.
    // Nothing anywhere: fall through and render today's empty paper.
    if (lastGoodDay) {
      const flourish = params.welcome === '1' ? '&welcome=1' : '';
      redirect(`/daily-gold-edition?date=${lastGoodDay}${flourish}`);
    }
  }

  return (
    <DailyGoldEditionPage
      date={date}
      today={todayStr}
      edition={edition}
      dates={dates}
      people={people}
      goodNews={goodNews}
      onThisDay={onThisDay}
      greatestMoments={greatestMoments}
      savedKeys={savedKeys}
      exploration={exploration}
      signedOut={!session}
      welcomeName={welcomeName}
    />
  );
}
