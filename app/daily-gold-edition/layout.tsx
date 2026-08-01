import { getActiveChildProfile } from '@/app/profiles/actions';
import DailyGoldEditionChrome from '@/components/dailygold/DailyGoldEditionChrome';

/**
 * The reader's persistent chrome.
 *
 * /daily-gold-edition stays outside the (dg) route group — its chrome has to
 * live under DGInstrumentationProvider, which the group's shell does not mount
 * — so it gets a layout of its own. What matters is that this is a *layout*:
 * Next.js does not re-render it during a client-side transition, so turning to
 * another day (`?date=`) swaps only the reading column instead of tearing the
 * rail down and building a new one.
 *
 * The reader is resolved here as well as in the page. `getActiveChildProfile`
 * is React-cached for the request, so the second read costs nothing, and the
 * two can't disagree about who is reading.
 */

// The chrome names the active child, which comes from the session.
export const dynamic = 'force-dynamic';

export default async function DailyGoldEditionLayout({ children }: { children: React.ReactNode }) {
  const child = await getActiveChildProfile();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <DailyGoldEditionChrome child={child} today={today}>
      {children}
    </DailyGoldEditionChrome>
  );
}
