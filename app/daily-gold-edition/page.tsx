import DailyGoldEditionPage from '@/components/dailygold/DailyGoldEditionPage';
import { getInitialEdition, getEditionDates } from './actions';

export const metadata = { title: 'Daily Gold Edition' };

// Editions live in the database and change over time, so render per-request.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [initialEdition, initialDates] = await Promise.all([
    getInitialEdition(todayStr),
    getEditionDates(),
  ]);

  return (
    <DailyGoldEditionPage
      initialEdition={initialEdition}
      initialDates={initialDates}
    />
  );
}
