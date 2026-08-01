'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import DGNavigationRail from '@/components/dailygold/DGNavigationRail';
import DGMobileTabBar from '@/components/dailygold/DGMobileTabBar';
import DGIdentityHeader from '@/components/dailygold/DGIdentityHeader';
import { NAV_SHELL_CSS } from '@/components/dailygold/DGPageShell';
import { DGInstrumentationProvider } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import { ThemeProvider, useTheme } from '@/components/theme/ThemeContext';

/**
 * The edition reader's persistent chrome: theme, instrumentation, the desktop
 * rail, the mobile identity header and tab bar, and the shell padding that
 * keeps the reading column clear of both.
 *
 * This is rendered from app/daily-gold-edition/layout.tsx rather than from the
 * page, and that placement is the whole point. Next.js re-renders the *page*
 * segment on every navigation — including a change of `?date=` — under a cache
 * key that carries the search params, so the page subtree is torn down and
 * rebuilt each time a reader turns to another day. A layout is not re-rendered
 * during a client-side transition, so everything here stays mounted and only
 * the reading column swaps. Before this split the rail was inside the page and
 * every wax seal, and every press of Today, rebuilt it from scratch — which is
 * what read as the whole page reloading.
 *
 * It also has to sit *above* the page for the rail's own events to exist at
 * all: DGNavigationRail records nav_select / shelf_open through the
 * instrumentation context, so the provider must be an ancestor of the rail,
 * not a sibling inside the page.
 *
 * Nothing here may depend on the day being read. The one exception is the
 * provider's `editionDate` stamp, which comes from the URL via
 * `useSearchParams` — a client component, unlike a server layout, does re-read
 * the query on navigation, so the stamp follows the reader from day to day
 * without the layout itself re-rendering.
 */

class DGErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  componentDidCatch(error, info) { console.error('DG CRASH:', error, info); }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div role="alert" style={{ padding: 40, background: '#F5F0E7', minHeight: '100vh' }}>
        <h2 style={{ color: '#C46D46' }}>Daily Gold Error</h2>
        <pre style={{ fontSize: 12, color: '#4A3B2A', whiteSpace: 'pre-wrap' }}>
          {this.state.error?.toString()}
        </pre>
      </div>
    );
    return this.props.children;
  }
}

/**
 * The frame itself. Split out from the export because it reads the palette,
 * which only exists below <ThemeProvider>.
 *
 * The layout system is NAV_SHELL_CSS, owned by DGPageShell so the reader and
 * the other rail destinations (/passport, /treasury, …) can never drift apart;
 * the page adds its own section-band grid on top. The background gradients are
 * the reader's own — they belong to the frame rather than the day, so they are
 * painted once and survive every page turn.
 */
function DGChromeFrame({ child, viewer, children }) {
  const { theme } = useTheme();

  return (
    <div
      className="dg-root"
      style={{
        '--dg-gold': theme.accentGold,
        backgroundColor: theme.bgPrimary,
        backgroundImage: 'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(100,75,45,0.04) 0%, transparent 45%)',
        fontFamily: theme.fontBody,
        color: theme.textBody,
      }}
    >
      <style>{NAV_SHELL_CSS}</style>

      <DGNavigationRail child={child} viewer={viewer} />
      <DGMobileTabBar child={child} />

      <main className="dg-shell">
        {/* Chrome, not reading: the identity header names the reader (or the
            signed-in grown-up), not the day, so it stays out of the page and
            out of the tracked regions. */}
        <DGIdentityHeader child={child} viewer={viewer} />
        {children}
      </main>
    </div>
  );
}

/**
 * @param {{
 *   child?: { id: string, name: string, avatar: string } | null,
 *   viewer?: { name: string, role: 'admin' | 'guardian' } | null,
 *   today: string,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function DailyGoldEditionChrome({ child = null, viewer = null, today, children }) {
  const searchParams = useSearchParams();
  // The bare route is the paper of the moment; every earlier day names itself.
  const editionDate = searchParams.get('date') || today;

  return (
    <DGErrorBoundary>
      <ThemeProvider childId={child?.id}>
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
          <DGChromeFrame child={child} viewer={viewer}>{children}</DGChromeFrame>
        </DGInstrumentationProvider>
      </ThemeProvider>
    </DGErrorBoundary>
  );
}
