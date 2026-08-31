import { requireAdmin } from '@/lib/dal';
import DailyGoldDesk from '@/components/admin/DailyGoldDesk';
import { findDuplicateEditions, getDeskCoverage, getWeekAhead } from './actions';

export const metadata = { title: 'Daily Gold desk — Maison d\'Oré' };

export default async function DailyGoldDeskPage() {
  await requireAdmin();

  // Today is resolved here, not in the client: the desk's whole framing is
  // "what does a family see right now", and the reader resolves its own date on
  // the server too — deriving it from the browser clock could disagree.
  const today = new Date().toISOString().slice(0, 10);

  // The OpenRouter balance is no longer fetched here. It used to be, and the
  // desk drew its own chip from it, but the number is an account fact rather
  // than a fact about this page — AdminChrome shows it on all six admin screens
  // now, which also takes an external call off this route's critical path.
  const [coverage, week, duplicates] = await Promise.all([
    getDeskCoverage(),
    getWeekAhead(today),
    findDuplicateEditions(),
  ]);

  return (
    <DailyGoldDesk
      coverage={coverage}
      week={week}
      duplicates={duplicates}
      today={today}
    />
  );
}
