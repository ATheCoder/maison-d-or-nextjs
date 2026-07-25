import DailyGoldEditionPage from '@/components/dailygold/DailyGoldEditionPage';
import { getActiveChildProfile } from '@/app/profiles/actions';
import { getEditionByDate, getAvailableDates, getPeopleForDate, getGoodNewsForDate, getOnThisDayForDate, getGreatestMomentsForDate } from './actions';

export const metadata = { title: 'Daily Gold Edition' };

// Editions live in the database and change over time, so render per-request.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const todayStr = new Date().toISOString().slice(0, 10);

  // The page declares one date — today — and every section shows today's
  // content or nothing; it never borrows another day's content to fill a gap.
  // So the edition row is today's or absent (no getLatestEdition fallback), and
  // Born Today / On This Day / Greatest Moments are fetched unconditionally:
  // they are keyed by today's month-day ("what happened on this day across
  // history") and are correct whether or not an edition row exists.
  //
  // The reader comes from the session's active child profile (auth-plan §1) —
  // resolved here, never asserted by the client. Outside child mode it is
  // null and every child-specific surface simply stays absent; the edition
  // itself is the same for everyone, so the page still renders.
  const [
    initialEdition,
    initialDates,
    initialPeople,
    initialGoodNews,
    initialOnThisDay,
    initialGreatestMoments,
    initialChild,
  ] = await Promise.all([
    getEditionByDate(todayStr),
    getAvailableDates(),
    getPeopleForDate(todayStr),
    getGoodNewsForDate(todayStr),
    getOnThisDayForDate(todayStr),
    getGreatestMomentsForDate(todayStr),
    getActiveChildProfile(),
  ]);

  return (
    <DailyGoldEditionPage
      initialChild={initialChild}
      initialEdition={initialEdition}
      initialDates={initialDates}
      initialPeople={initialPeople}
      initialGoodNews={initialGoodNews}
      initialOnThisDay={initialOnThisDay}
      initialGreatestMoments={initialGreatestMoments}
    />
  );
}
