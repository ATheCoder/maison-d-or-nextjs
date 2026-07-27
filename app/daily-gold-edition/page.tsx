import { redirect } from 'next/navigation';
import DailyGoldEditionPage from '@/components/dailygold/DailyGoldEditionPage';
import { getActiveChildProfile } from '@/app/profiles/actions';
import { getEditionByDate, getAvailableDates, getPeopleForDate, getGoodNewsForDate, getOnThisDayForDate, getGreatestMomentsForDate } from './actions';

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
  // fill a gap. So the edition row is that day's or absent (no
  // getLatestEdition fallback), and Born Today / On This Day / Greatest
  // Moments are fetched unconditionally: they are keyed by the day's month-day
  // ("what happened on this day across history") and are correct whether or
  // not an edition row exists.
  //
  // Every section is fetched here rather than in the client, which is what
  // lets the date live in the URL: turning to another day is a navigation, and
  // the server answers it the same way for a fresh visitor following a shared
  // link as for a reader pressing the wax seal.
  //
  // The reader comes from the session's active child profile (auth-plan §1) —
  // resolved here, never asserted by the client. Outside child mode it is
  // null and every child-specific surface simply stays absent; the edition
  // itself is the same for everyone, so the page still renders.
  const [
    edition,
    dates,
    people,
    goodNews,
    onThisDay,
    greatestMoments,
    child,
  ] = await Promise.all([
    getEditionByDate(date),
    getAvailableDates(),
    getPeopleForDate(date),
    getGoodNewsForDate(date),
    getOnThisDayForDate(date),
    getGreatestMomentsForDate(date),
    getActiveChildProfile(),
  ]);

  return (
    <DailyGoldEditionPage
      date={date}
      today={todayStr}
      child={child}
      edition={edition}
      dates={dates}
      people={people}
      goodNews={goodNews}
      onThisDay={onThisDay}
      greatestMoments={greatestMoments}
    />
  );
}
