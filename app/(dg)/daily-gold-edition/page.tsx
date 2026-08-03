import { redirect } from 'next/navigation';
import DailyGoldEditionPage from '@/components/dailygold/DailyGoldEditionPage';
import SettleAddress from './SettleAddress';
import { getEditionByDate, getLatestEdition, getAvailableDates, getPeopleForDate, getGoodNewsForDate, getOnThisDayForDate, getGreatestMomentsForDate } from './queries';

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

// Everything on the page that is keyed by the day itself — refetched as a unit
// when the bare route falls back to the last good day. There is nothing else
// left to keep: every read this page performs is now day-keyed.
async function fetchDay(date: string) {
  const [edition, people, goodNews, onThisDay, greatestMoments] = await Promise.all([
    getEditionByDate(date),
    getPeopleForDate(date),
    getGoodNewsForDate(date),
    getOnThisDayForDate(date),
    getGreatestMomentsForDate(date),
  ]);
  return { edition, people, goodNews, onThisDay, greatestMoments };
}

// A shared archive link should say which day it opens, both in the tab title
// and wherever the link is unfurled.
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  // `?date=` first, the clock second. Reading the current time before any
  // request data is a prerender error under Cache Components
  // (next-prerender-current-time) — the clock is only allowed once the render
  // has already committed to being request-time work, which awaiting
  // searchParams is exactly what does. The order is load-bearing, not stylistic.
  const raw = (await searchParams).date;
  const todayStr = today();
  const date = resolveDate(raw, todayStr);
  const title = !date || date === todayStr
    ? 'Daily Gold Edition'
    : `Daily Gold Edition — ${formatDate(date)}`;
  return { title, openGraph: { title } };
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  // searchParams before the clock — see generateMetadata above for why the
  // order matters.
  const params = await searchParams;
  const todayStr = today();
  const date = resolveDate(params.date, todayStr);
  if (date === null) redirect('/daily-gold-edition');

  // The page declares one date — the one in the URL — and every section shows
  // that day's content or nothing; it never borrows another day's content to
  // fill a gap. So the edition row is that day's or absent (see the
  // last-good-day fallback below, which moves the *date* rather than borrowing
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
  // ── Nothing about the reader is read here, and that is load-bearing ───────
  //
  // The reader belongs to layout.tsx, which resolves the session, the active
  // child and their saved keys once for the whole (dg) group (auth-plan §1) and
  // holds them in ReaderContext. A layout is not re-rendered by a client-side
  // navigation, so those reads happen once per hard load rather than once per
  // page turn — where `React.cache` could never have helped, its memoisation
  // being scoped to a single request.
  //
  // The consequence for this page is the point of it: every prop below is a
  // function of the date alone, so the segment the router builds is identical
  // for every reader on a given day. That is what makes it safe to prefetch and
  // keep — a segment carrying one child's hearts is not a segment the client
  // cache may hand back later. See DGNavigationRail for the link that relies
  // on it, and ReaderContext for how the hearts stay truthful without it.
  const [requestedDay, dates] = await Promise.all([
    fetchDay(date),
    getAvailableDates(todayStr),
  ]);

  // Arriving at the bare route on a day with nothing on it — before the
  // morning's edition is published, or on a day that was never authored — used
  // to open a masthead with empty sections under it. Show the most recent day
  // that does have a paper instead, rendered in *this* request: by the time the
  // blankness is known, loading.tsx has already begun streaming, so a
  // `redirect()` here can only be the meta-refresh kind (Next 16 redirect
  // reference, "streaming context") — a second navigation, a second full
  // render, and the skeleton flashing twice. Fetching the fallback day in
  // place keeps the skeleton up exactly once, and <SettleAddress> then moves
  // the URL (and tab title) to that day's own address without refetching, so
  // the page still declares one date, every section is still that date's
  // content, the wax seal lands on the right day, and the link stays
  // shareable.
  //
  // Only when today has *nothing*. A day with good news but no edition row, or
  // only a Born Today gallery, is a real day and shows what it has. And only
  // for the bare route: an explicit `?date=` is the reader asking for that day,
  // empty or not.
  const todayIsBlank = !requestedDay.edition
    && requestedDay.people.length === 0
    && requestedDay.goodNews.length === 0
    && requestedDay.onThisDay.length === 0
    && requestedDay.greatestMoments.length === 0;

  let shownDate = date;
  let day = requestedDay;
  let settleUrl: string | null = null;
  if (date === todayStr && todayIsBlank) {
    // The newest published edition is the fallback because the edition row is
    // what makes a full paper; `dates` catches the case where there is no
    // edition at all but some earlier day still has good news or a birthday.
    const latest = await getLatestEdition();
    const lastGoodDay = latest && latest.edition_date < todayStr
      ? latest.edition_date
      : dates.filter((d) => d < todayStr).pop();
    // `welcome=1` rides along in the settled address, because this fallback is
    // exactly when a new family is most likely to hit it: the wizard lands on
    // the bare route, and a household that finishes before the morning's paper
    // is published keeps the flourish — on screen now, and on a reload of the
    // address the URL settles to.
    // Nothing anywhere: fall through and render today's empty paper.
    if (lastGoodDay) {
      shownDate = lastGoodDay;
      day = await fetchDay(lastGoodDay);
      const flourish = params.welcome === '1' ? '&welcome=1' : '';
      settleUrl = `/daily-gold-edition?date=${lastGoodDay}${flourish}`;
    }
  }

  return (
    <>
      {settleUrl && (
        <SettleAddress
          url={settleUrl}
          title={`Daily Gold Edition — ${formatDate(shownDate)}`}
        />
      )}
      <DailyGoldEditionPage
        date={shownDate}
        today={todayStr}
        edition={day.edition}
        dates={dates}
        people={day.people}
        goodNews={day.goodNews}
        onThisDay={day.onThisDay}
        greatestMoments={day.greatestMoments}
        welcome={params.welcome === '1'}
      />
    </>
  );
}
