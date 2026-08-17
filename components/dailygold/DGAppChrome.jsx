// @ts-nocheck — untyped .jsx from before checkJs was on; 5 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import DGPageShell from '@/components/dailygold/DGPageShell';
import { DGInstrumentationProvider } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import { ReaderProvider } from '@/components/dailygold/ReaderContext';
import { ThemeProvider } from '@/components/theme/ThemeContext';

/**
 * The persistent chrome for the whole (dg) group: theme, instrumentation, and
 * the frame (rail, mobile identity header, tab bar, shell padding) that every
 * destination shares — the edition reader, /family, /parent-observatory,
 * /passport and /treasury alike.
 *
 * This is rendered from app/(dg)/layout.tsx rather than from any page, and that
 * placement is the whole point. Next.js re-renders the *page* segment on every
 * navigation — including a change of `?date=` — under a cache key that carries
 * the search params, so the page subtree is torn down and rebuilt each time a
 * reader turns to another day. A layout is not re-rendered during a client-side
 * transition, so everything here stays mounted and only the content column
 * swaps. Now that the edition lives in the group, that holds across the whole
 * rail: pressing Treasury from the paper no longer rebuilds the chrome.
 *
 * It also has to sit *above* the page for the rail's own events to exist at
 * all: DGNavigationRail and DGMobileTabBar record nav_select / shelf_open
 * through the instrumentation context, so the provider must be an ancestor of
 * the rail, not a sibling inside the page.
 *
 * DEPARTURE, deliberate: docs/daily-gold-analytics-plan.md §4 recommends
 * mounting the provider per reading route rather than in a shared shell, so
 * each route passes its own child/editionDate and a route change flushes the
 * buffer by unmounting. Mounting it here is what puts the rail under it — the
 * plan's shape leaves nav_select unrecorded everywhere, which is the status quo
 * this merge exists to end. The two properties that shape bought are kept
 * explicitly instead: the provider flushes on pathname change, and the events
 * that describe a reading sitting are gated on being on a reading surface (see
 * `onReadingSurface` in DGInstrumentationProvider). /stories/[slug] still mounts
 * its own provider, as the plan requires, because it is outside this group.
 *
 * Nothing here may depend on the day being read. The one exception is the
 * provider's `editionDate` stamp, which comes from the URL via
 * `useSearchParams` — a client component, unlike a server layout, does re-read
 * the query on navigation, so the stamp follows the reader from day to day
 * without the layout itself re-rendering.
 *
 * The same argument is why the reader lives here now (ReaderProvider): the
 * identity and the saved keys are constant across the whole group, so resolving
 * them per page meant re-reading the session and the saved_item rows on every
 * crossing between the paper and the rooms — and left each page segment
 * carrying one child's answers, which is a segment the router may not keep.
 */

class DGErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  componentDidCatch(error, info) { console.error('DG CRASH:', error, info); }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div role="alert" style={{ padding: 40, background: 'var(--surface-page)', minHeight: '100vh' }}>
        <h2 className="type-display-section" style={{ color: 'var(--danger-readable)' }}>Daily Gold Error</h2>
        <pre style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
          {this.state.error?.toString()}
        </pre>
      </div>
    );
    return this.props.children;
  }
}

/**
 * @param {{
 *   child?: { id: string, name: string, avatar: string } | null,
 *   viewer?: { name: string, role: 'admin' | 'guardian' } | null,
 *   initialTheme?: string | null,
 *   today: string,
 *   savedKeys?: string[] | null,
 *   signedOut?: boolean,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function DGAppChrome({ child = null, viewer = null, initialTheme = null, today, savedKeys = null, signedOut = false, children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The reader's own page, as opposed to the rooms around it. Carries the
  // paper's backdrop and its always-on identity header (see DGPageShell), and
  // is the only place an edition date means anything.
  const onPaper = pathname.startsWith('/daily-gold-edition');
  // The bare route is the paper of the moment; every earlier day names itself.
  // Null elsewhere: a nav_select from the Treasury has no edition to belong to,
  // and stamping it with today's would invent one.
  const editionDate = onPaper ? (searchParams.get('date') || today) : null;

  return (
    <DGErrorBoundary>
      {/* The reader's saved palette, read from their profile server-side, so
          the paper opens in the colours they chose rather than fading into
          them. */}
      <ThemeProvider childId={child?.id} initialTheme={initialTheme}>
        {/* Keyed on the reader so a profile switch remounts everything below —
            the chrome, the page under it, and the instrumentation with it. The
            key belongs on the provider rather than on the frame alone: an
            unmount is what flushes the departing reader's buffer, so a provider
            that survived the switch would post one child's events into the next
            child's session. */}
        <DGInstrumentationProvider
          key={child?.id || 'no-child'}
          childId={child?.id ?? null}
          editionDate={editionDate}
        >
          {/* Inside the keyed provider, so a profile switch remounts it and the
              departing child's saved keys cannot outlive them. */}
          <ReaderProvider child={child} signedOut={signedOut} savedKeys={savedKeys}>
            <DGPageShell child={child} viewer={viewer} paper={onPaper}>{children}</DGPageShell>
          </ReaderProvider>
        </DGInstrumentationProvider>
      </ThemeProvider>
    </DGErrorBoundary>
  );
}
