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
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import { DG_DESTINATIONS, DG_SHELF, DGIcon } from '@/components/dailygold/dgNavConfig';

export default function DGMobileTabBar({ child = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  const tabs = [
    ...DG_DESTINATIONS,
    // Shelf items only make sense with an active reader.
    ...(child ? DG_SHELF : []),
  ];

  const isActive = (tab) =>
    pathname === tab.path || (tab.key === 'today' && (pathname || '').includes('daily-gold'));

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
      {tabs.map(tab => {
        const active = isActive(tab);
        return (
          <button
            key={tab.key}
            onClick={() => router.push(tab.path)}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1, minHeight: 48, border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '0.4rem 0.25rem', transition: 'all 0.2s ease',
            }}
          >
            <DGIcon name={tab.icon} size={22} color={active ? theme.accentGold : theme.textMuted} />
            <span style={{
              fontFamily: theme.fontBody,
              fontSize: '0.7rem',
              color: active ? theme.accentGold : theme.textMuted,
              fontWeight: active ? 700 : 400,
              letterSpacing: '0.02em',
            }}>
              {tab.label}
            </span>
            <span aria-hidden="true" style={{
              width: 4, height: 4, borderRadius: '50%',
              background: active ? theme.accentGold : 'transparent',
            }} />
          </button>
        );
      })}
    </nav>
  );
}
