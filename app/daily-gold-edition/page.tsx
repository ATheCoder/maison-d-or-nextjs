import DailyGoldEditionPage from '@/components/dailygold/DailyGoldEditionPage';
import { getInitialEdition, getEditionDates, getPeopleForDate, getGoodNewsForDate, getOnThisDayForDate, getGreatestMomentsForDate } from './actions';

export const metadata = { title: 'Daily Gold Edition' };

// Editions live in the database and change over time, so render per-request.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [initialEdition, initialDates] = await Promise.all([
    getInitialEdition(todayStr),
    getEditionDates(),
  ]);
  // Born Today, Good News, On This Day and Greatest Moments follow the
  // edition being viewed (which may be the latest edition rather than
  // today's) — news by the exact date, the rest by its month-day.
  const [initialPeople, initialGoodNews, initialOnThisDay, initialGreatestMoments] = initialEdition
    ? await Promise.all([
        getPeopleForDate(initialEdition.edition_date),
        getGoodNewsForDate(initialEdition.edition_date),
        getOnThisDayForDate(initialEdition.edition_date),
        getGreatestMomentsForDate(initialEdition.edition_date),
      ])
    : [[], [], [], []];

  return (
    <DailyGoldEditionPage
      initialEdition={initialEdition}
      initialDates={initialDates}
      initialPeople={initialPeople}
      initialGoodNews={initialGoodNews}
      initialOnThisDay={initialOnThisDay}
      initialGreatestMoments={initialGreatestMoments}
    />
  );
}
