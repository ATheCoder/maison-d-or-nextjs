import { requireAdmin } from '@/lib/dal';
import { getOpenRouterCredits } from '@/app/admin/people/actions';
import DailyGoldDesk from '@/components/admin/DailyGoldDesk';
import { findDuplicateEditions, getDeskCoverage, getWeekAhead } from './actions';

export const metadata = { title: 'Daily Gold desk — Maison d\'Oré' };

export default async function DailyGoldDeskPage() {
  await requireAdmin();

  // Today is resolved here, not in the client: the desk's whole framing is
  // "what does a family see right now", and the reader resolves its own date on
  // the server too — deriving it from the browser clock could disagree.
  const today = new Date().toISOString().slice(0, 10);

  const [coverage, week, duplicates, credits] = await Promise.all([
    getDeskCoverage(),
    getWeekAhead(today),
    findDuplicateEditions(),
    // The credit balance is a fact, not a forecast (R6.5) — and never a reason
    // to fail the page if OpenRouter is unreachable.
    getOpenRouterCredits(),
  ]);

  return (
    <DailyGoldDesk
      coverage={coverage}
      week={week}
      duplicates={duplicates}
      credit={credits.ok ? credits.credits.remaining : null}
      today={today}
    />
  );
}
