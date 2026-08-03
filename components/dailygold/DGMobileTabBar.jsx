'use client';
/**
 * DGMobileTabBar (mobile, <768px)
 *
 * The second renderer of dgNavConfig: the same global destinations as the
 * desktop rail (never a different route set), plus the "My World" shelf items
 * as action tabs so the child's own space is always one tap away. Hidden at
 * ≥768px by the shell stylesheet (`.dg-tabbar`), which also reserves bottom
 * space for it via `--dg-tabbar-h` (including the iOS safe-area inset).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import { dgDestinationsFor, DG_SHELF, DGIcon, isNavItemActive } from '@/components/dailygold/dgNavConfig';

export default function DGMobileTabBar({ child = null }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  // No-ops on /passport and /treasury, which mount no provider.
  const { track } = useInstrumentation();

  // The two lists become one row of tabs, so which list a tab came from is
  // recorded here, at the merge — the only place that still knows. A tap on
  // "Treasury" is the child opening their own shelf, not choosing a
  // destination of the app, and the roll-up counts them apart.
  const tabs = [
    // Child mode hides the grown-up rooms; dgDestinationsFor owns that rule.
    ...dgDestinationsFor(child).map(tab => ({ ...tab, event: 'nav_select' })),
    // Shelf items only make sense with an active reader.
    ...(child ? DG_SHELF.map(tab => ({ ...tab, event: 'shelf_open' })) : []),
  ];

  const isActive = (tab) => isNavItemActive(tab, pathname);

  return (
    <nav
      className="dg-tabbar"
      aria-label="Daily Gold navigation"
      style={{
        background: theme.bgCard,
        borderTop: `1px solid ${theme.accentGold}20`,
        boxShadow: '0 -4px 20px rgba(44,36,22,0.08)',
      }}
    >
      {/* <Link>, not buttons, for the same reason as the rail: viewport
          prefetch keeps each destination's own loading.tsx boundary warm, so a
          tap gets that page's skeleton rather than the generic group fallback. */}
      {tabs.map(tab => {
        const active = isActive(tab);
        return (
          <Link
            key={tab.key}
            href={tab.path}
            prefetch={tab.prefetchFull ? true : undefined}
            onNavigate={() => {
              track(tab.event, { contentId: tab.path, label: tab.label, source: 'tabbar' });
            }}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1, minHeight: 48, textDecoration: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '0.4rem 0.25rem', transition: 'all 0.2s ease',
            }}
          >
            <DGIcon name={tab.icon} size={22} color={active ? theme.accentGold : theme.textMuted} />
            {/* Size and wrapping live in NAV_SHELL_CSS (.dg-tab-label), which
                owns every breakpoint tier; only the palette-driven bits stay
                inline. Six tabs do not fit at 0.7rem on a 320px phone. */}
            <span
              className="dg-tab-label"
              style={{
                fontFamily: theme.fontBody,
                color: active ? theme.accentGold : theme.textMuted,
                fontWeight: active ? 700 : 400,
              }}
            >
              {tab.label}
            </span>
            <span aria-hidden="true" style={{
              width: 4, height: 4, borderRadius: '50%',
              background: active ? theme.accentGold : 'transparent',
            }} />
          </Link>
        );
      })}
    </nav>
  );
}
