import DailyGoldEditionPage from '@/components/dailygold/DailyGoldEditionPage';
import { getInitialEdition, getEditionDates, getPeopleForDate } from './actions';

export const metadata = { title: 'Daily Gold Edition' };

// Editions live in the database and change over time, so render per-request.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [initialEdition, initialDates] = await Promise.all([
    getInitialEdition(todayStr),
    getEditionDates(),
  ]);
  // Born Today follows the edition being viewed (which may be the latest
  // edition rather than today's), keyed by its month-day.
  const initialPeople = initialEdition
    ? await getPeopleForDate(initialEdition.edition_date)
    : [];

  return (
    <DailyGoldEditionPage
      initialEdition={initialEdition}
      initialDates={initialDates}
      initialPeople={initialPeople}
    />
  );
}
