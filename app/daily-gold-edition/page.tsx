import DailyGoldEditionPage from '@/components/dailygold/DailyGoldEditionPage';
import { getInitialEdition, getEditionDates, getPeopleForDate, getGoodNewsForDate, getOnThisDayForDate } from './actions';

export const metadata = { title: 'Daily Gold Edition' };

// Editions live in the database and change over time, so render per-request.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [initialEdition, initialDates] = await Promise.all([
    getInitialEdition(todayStr),
    getEditionDates(),
  ]);
  // Born Today, Good News and On This Day follow the edition being viewed
  // (which may be the latest edition rather than today's) — people and
  // historical events by its month-day, news by the exact date.
  const [initialPeople, initialGoodNews, initialOnThisDay] = initialEdition
    ? await Promise.all([
        getPeopleForDate(initialEdition.edition_date),
        getGoodNewsForDate(initialEdition.edition_date),
        getOnThisDayForDate(initialEdition.edition_date),
      ])
    : [[], [], []];

  return (
    <DailyGoldEditionPage
      initialEdition={initialEdition}
      initialDates={initialDates}
      initialPeople={initialPeople}
      initialGoodNews={initialGoodNews}
      initialOnThisDay={initialOnThisDay}
    />
  );
}
