'use client';

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, selectPillClasses } from '@/components/ds';
import MMonogram from '@/components/maison/MMonogram';
import { getOpenRouterCredits } from '@/app/admin/people/actions';
import type { OpenRouterCredits } from '@/app/admin/people/actions';

/**
 * AdminChrome — the one frame every admin screen wears.
 *
 * Before this, the admin was six routes and six different ideas of "where am I
 * and how do I leave". Sign out existed on exactly one of them; the Daily Gold
 * desk had no route back to /admin at all; the People library's only way home
 * was an unstyled <Link> wrapped around its eyebrow, which is not an
 * affordance, it is a rumour. Getting from the desk to the library meant
 * finding a link inside a paragraph of body copy.
 *
 * ── Why a top bar and not a rail ──────────────────────────────────────────
 * The reader side answers this question with DGNavigationRail, and copying it
 * here would be the obvious move and the wrong one: DayEditor already runs a
 * 262px left rail, AlmanacEditor a 340px one, and PersonEditor its own. A
 * second rail would cost ~330px of horizontal room on desks whose content
 * wraps are 1340px. Four of the six screens ALREADY draw a bar in exactly this
 * position, so this is the shape the admin had been converging on anyway.
 *
 * ── The tabs replace the back-links, they do not join them ────────────────
 * `‹ Desk` (DayEditor, AlmanacEditor) went to /admin/daily-gold and `‹ Library`
 * (PersonEditor) went to /admin/people — which is precisely where the two tabs
 * go. So each of those was deleted rather than left to say the same thing
 * twice. What stayed is everything that moves SIDEWAYS instead of up: the
 * day's ‹ › date arrows, the almanac's "this month-day as a real date", the
 * desk's prose links that name a specific destination.
 *
 * ── No private stylesheet ─────────────────────────────────────────────────
 * The geometry is Tailwind on the element. The five private stylesheets under
 * components/admin/ are exactly what the primitives migration spent itself
 * undoing — each had grown its own .btn, .btn-gold and .field — and a sixth
 * one, in the file whose whole job is consistency, would be a joke at its own
 * expense.
 */

/** Read by the four page shells below the bar, which subtract it from 100dvh,
 *  and by DayEditor's sticky rail, which offsets by it. Stated once, here,
 *  because a shell that guesses this number is a shell that drifts from it. */
export const ADMIN_CHROME_H = '46px';

/**
 * The bar's stacking level, published as `--admin-chrome-z` so the one shell
 * that has to out-stack it can say so in terms of it rather than by guessing a
 * bigger number.
 *
 * PersonEditor is that shell. It is `position: fixed`, which creates a stacking
 * context, so its modals (z-index 60 and 80) are sealed inside its layer and
 * cannot beat this bar on their own — the bar stayed on top of a full-viewport
 * scrim, and Sign out stayed clickable through it. Its fix is
 * `calc(var(--admin-chrome-z) + 1)`, which costs nothing visually because the
 * editor starts where the bar ends, and which cannot drift from this number.
 *
 * The other four admin shells are static flow, create no stacking context, and
 * their overlays (ds Overlay at 2000, ImageModal at 80) out-stack the bar by
 * themselves.
 */
export const ADMIN_CHROME_Z = 50;

const SECTIONS = [
  { href: '/admin/daily-gold', label: 'Daily Gold', short: 'Gold' },
  { href: '/admin/people', label: 'People', short: 'People' },
] as const;

/* ── Credits ───────────────────────────────────────────────────────────────
 *
 * The balance used to exist twice and differently: the Daily Gold page fetched
 * it on the server and the desk rendered a flat "$4.12 credit" chip, while
 * PersonEditor kept its own client state and drew a richer one with tone
 * thresholds and a retry. One of those had to win, and the richer one did —
 * the AI writer and the renderer both spend this money from inside the person
 * editor, so it is the screen that taught the chip what it needed to say.
 *
 * It lives here now because the balance is an account fact, not a page fact:
 * it is equally true on all six screens and it belongs beside the account.
 */
type CreditsApi = { refresh: () => void };
const CreditsContext = createContext<CreditsApi>({ refresh: () => {} });

/**
 * For the screens that SPEND credits and want the bar to catch up the moment a
 * job lands — PersonEditor after a brief or an image finishes. Safe to call
 * from anywhere under the admin layout; outside it, it is a no-op rather than
 * a crash, which is what the default context value is for.
 */
export function useAdminCredits(): CreditsApi {
  return useContext(CreditsContext);
}

function fmtUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

function CreditsSlot({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState<OpenRouterCredits | null>(null);
  const [error, setError] = useState(false);

  // The state lives in the PROVIDER rather than in the button, so a refresh
  // from a consumer re-fetches under the existing number instead of remounting
  // the button. The remount version of this was simpler and wrong to look at:
  // it blinked the balance back to "…" and then to a value, every time a job
  // finished, which reads as the chip breaking rather than the chip updating.
  const refresh = useCallback(() => {
    void getOpenRouterCredits().then((res) => {
      if (res.ok) {
        setCredits(res.credits);
        setError(false);
      } else {
        setError(true);
      }
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // useMemo so a consumer's effect that depends on `refresh` does not re-run on
  // every render of this bar.
  const api = useMemo(() => ({ refresh }), [refresh]);

  return (
    <CreditsContext.Provider value={api}>
      <CreditsChip credits={credits} error={error} onRefresh={refresh} />
      {children}
    </CreditsContext.Provider>
  );
}

function CreditsChip({
  credits,
  error,
  onRefresh,
}: {
  credits: OpenRouterCredits | null;
  error: boolean;
  onRefresh: () => void;
}) {
  // Error and "not yet" are different states and must not look alike: one is
  // worth pressing, the other is worth waiting out.
  if (error) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        title="Couldn't reach OpenRouter — click to retry"
      >
        OpenRouter · unavailable ↻
      </Button>
    );
  }

  if (!credits) {
    return (
      <span className="type-caption text-faint" aria-live="polite">
        OpenRouter · …
      </span>
    );
  }

  // Below a dollar the next generation may simply fail, which is not a caption,
  // it is a warning — so it wears the house's danger coat rather than a private
  // red. Above that a ghost button already reads as "a fact you can press".
  const broke = credits.remaining <= 1;
  return (
    <Button
      variant={broke ? 'danger' : 'ghost'}
      size="sm"
      onClick={onRefresh}
      className="tabular-nums"
      title={`OpenRouter credits — ${fmtUSD(credits.totalUsage)} used of ${fmtUSD(credits.totalCredits)}. Click to refresh.`}
    >
      OpenRouter · {fmtUSD(credits.remaining)} left
    </Button>
  );
}

/* ── The section tabs, and why the pathname sits behind a boundary ─────────
 *
 * `usePathname` is the only request-time read in this bar, and under Cache
 * Components it needs a <Suspense> around it on any route with a dynamic param
 * — which is four of the six admin routes. Without one, Next raises
 * `blocking-route` for the whole segment and the page cannot begin rendering
 * until the pathname is known: the exact cost this bar exists to avoid.
 *
 * So the tabs are drawn twice from one component. The fallback renders both of
 * them with nothing marked, which is the honest static answer — the shell knows
 * there are two sections but not which one you are in — and the marked version
 * replaces it as soon as the pathname resolves. Identical geometry either way,
 * so nothing moves when it lands; the only thing that changes is which pill is
 * lit.
 */
function SectionTabs({ active }: { active: string | null }) {
  return (
    <nav aria-label="Admin sections" className="flex items-center gap-1.5">
      {SECTIONS.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          // SelectPill has no `selected` prop by design — aria-current IS the
          // state, and the coat in globals.css paints itself from it.
          aria-current={active === s.href ? 'page' : undefined}
          className={selectPillClasses({ className: 'px-3 py-1 no-underline' })}
        >
          <span className="hidden sm:inline">{s.label}</span>
          <span className="sm:hidden">{s.short}</span>
        </Link>
      ))}
    </nav>
  );
}

function ActiveSectionTabs() {
  const pathname = usePathname();
  // The section, not the exact route: /admin/daily-gold/2026-09-03 and
  // /admin/daily-gold/almanac/09-03 are both "in Daily Gold", and a tab that
  // unlit itself the moment you opened a day would be answering a question
  // nobody asked.
  const active =
    SECTIONS.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`))?.href ?? null;
  return <SectionTabs active={active} />;
}

export default function AdminChrome({
  account,
  children,
}: {
  /** The identity cluster — suspended by the layout, because reading the
   *  session is request-time work and the nav must not wait on it. */
  account: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{
        ['--admin-chrome-h' as string]: ADMIN_CHROME_H,
        ['--admin-chrome-z' as string]: ADMIN_CHROME_Z,
      }}
    >
      <header
        className="sticky top-0 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-fine bg-surface-raised px-4 sm:px-6"
        // zIndex from the constant rather than a `z-50` utility, so the one
        // shell that must sit above it reads the same source.
        style={{ minHeight: ADMIN_CHROME_H, zIndex: ADMIN_CHROME_Z }}
      >
        {/* Home. The seal and the wordmark together, because the seal alone is
            decoration and the wordmark alone is a heading — the pair is the
            only thing on this bar that reads as "the top". */}
        <Link
          href="/admin"
          aria-label="Admin home"
          // No aria-current here, deliberately. Marking it would mean a second
          // pathname read, and the brand is the home affordance rather than a
          // member of the nav set — the tabs are what carry "which section am I
          // in", and they say it inside the boundary below.
          className="-mx-1 flex items-center gap-2 rounded-md px-1 py-1 no-underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          <MMonogram size={22} />
          <span className="type-label-editorial text-accent-readable">
            {/* Not MaisonBrandName: that component's gold-shimmer half is the
                wordmark at rest on a page, and at 10px inside a working bar the
                animation is noise. The editorial label is the right register
                for a room's name. */}
            Maison d&apos;Or&eacute; &middot; Admin
          </span>
        </Link>

        <div className="h-6 w-px shrink-0 bg-fine" aria-hidden />

        <Suspense fallback={<SectionTabs active={null} />}>
          <ActiveSectionTabs />
        </Suspense>

        {/* ml-auto rather than justify-between: with the bar wrapping on a
            narrow desk, space-between would fling the account to the far edge
            of its own row. */}
        <div className="ml-auto flex items-center gap-3 py-1.5">
          <CreditsSlot>{account}</CreditsSlot>
        </div>
      </header>

      {/* min-h-0 so a child that wants to own its own scrolling can. */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
