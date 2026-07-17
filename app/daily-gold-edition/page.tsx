import DailyGoldEditionPage from '@/components/dailygold/DailyGoldEditionPage';
import { getInitialEdition, getEditionDates, getPeopleForDate, getGoodNewsForDate } from './actions';

export const metadata = { title: 'Daily Gold Edition' };

// Editions live in the database and change over time, so render per-request.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [initialEdition, initialDates] = await Promise.all([
    getInitialEdition(todayStr),
    getEditionDates(),
  ]);
  // Born Today and Good News follow the edition being viewed (which may be
  // the latest edition rather than today's) — people by its month-day, news
  // by the exact date.
  const [initialPeople, initialGoodNews] = initialEdition
    ? await Promise.all([
        getPeopleForDate(initialEdition.edition_date),
        getGoodNewsForDate(initialEdition.edition_date),
      ])
    : [[], []];

  return (
    <DailyGoldEditionPage
      initialEdition={initialEdition}
      initialDates={initialDates}
      initialPeople={initialPeople}
      initialGoodNews={initialGoodNews}
    />
  );
}
