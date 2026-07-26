'use client';
/**
 * DGNavigationRail (desktop, ≥768px)
 *
 * One of the two renderers of dgNavConfig (the other is DGMobileTabBar).
 * Top to bottom: monogram, identity block ("Hi, {name}" + reader switcher),
 * global destinations, then the child's own "My World" shelf.
 *
 * Layout contract: the rail's width is the shared `--dg-rail-w` CSS variable
 * set by DailyGoldEditionPage's shell stylesheet, which also pads the page
 * content by the same variable — the two can never drift apart. At 768–1023px
 * the shell collapses the rail to icons (labels hidden via `.dg-rail-label`);
 * below 768px the rail is hidden entirely.
 */
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import { DG_DESTINATIONS, DG_SHELF, DGIcon } from '@/components/dailygold/dgNavConfig';
import ChildSwitcherOverlay from '@/components/dailygold/ChildSwitcherOverlay';
import { AVATARS } from '@/lib/avatars';

export default function DGNavigationRail({ child = null, onShelfAction }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const avatar = child ? (AVATARS[child.avatar] || AVATARS.sun) : null;

  const isActive = (item) =>
    pathname === item.path || (item.key === 'today' && (pathname || '').includes('daily-gold'));

  return (
    <nav className="dg-rail" aria-label="Daily Gold navigation">
      {/* Monogram */}
      <div aria-hidden="true" style={{
        width: 44, height: 44, borderRadius: '50%', alignSelf: 'center',
        background: `linear-gradient(135deg, ${theme.accentGold}30 0%, ${theme.accentGold}10 100%)`,
        border: `1px solid ${theme.accentGold}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: theme.fontHeadline, fontSize: '1.15rem', color: theme.textHeadline,
        flexShrink: 0,
      }}>
        M
      </div>

      {/* Identity block — persistent chrome, not scroll-away content */}
      {child && (
        <div style={{ position: 'relative', marginTop: '1.5rem' }}>
          <button
            className="dg-rail-item dg-rail-id"
            onClick={() => setShowSwitcher(v => !v)}
            aria-haspopup="menu"
            aria-expanded={showSwitcher}
            aria-label={`Reading as ${child.name}. Switch reader`}
          >
            <span aria-hidden="true" style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: avatar.bg, border: `1.5px solid ${theme.accentGold}80`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
            }}>
              {avatar.emoji}
            </span>
            <span className="dg-rail-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
              <span style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', color: theme.textMuted, letterSpacing: '0.08em' }}>
                Hi,
              </span>
              <span style={{
                fontFamily: theme.fontHeadline, fontStyle: 'italic', fontWeight: 600,
                fontSize: '0.95rem', color: theme.textHeadline,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110,
              }}>
                {child.name}
              </span>
            </span>
            <svg className="dg-rail-label" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <path d="M2 3.5l3 3 3-3" stroke={theme.textMuted} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showSwitcher && (
            <ChildSwitcherOverlay
              currentChildId={child.id}
              onSwitched={() => { setShowSwitcher(false); router.refresh(); }}
              onClose={() => setShowSwitcher(false)}
            />
          )}
        </div>
      )}

      {/* Global destinations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: '1.5rem' }}>
        {DG_DESTINATIONS.map(item => {
          const active = isActive(item);
          return (
            <button
              key={item.key}
              className={`dg-rail-item${active ? ' dg-rail-active' : ''}`}
              onClick={() => router.push(item.path)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
            >
              <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                <DGIcon name={item.icon} size={20} color={active ? theme.accentGold : theme.textMuted} />
              </span>
              <span className="dg-rail-label" style={{
                fontFamily: theme.fontBody, fontSize: '0.8rem', letterSpacing: '0.06em',
                color: active ? theme.textHeadline : theme.textMuted,
                fontWeight: active ? 700 : 400,
              }}>
                {item.label}
              </span>
              {active && <span aria-hidden="true" style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: theme.accentGold, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* My World — the child's own shelf, a peer of global nav */}
      {child && (
        <>
          <div aria-hidden="true" style={{ height: 1, background: `${theme.accentGold}26`, margin: '1.25rem 0.5rem' }} />
          <p className="dg-rail-label" style={{
            fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.2em',
            textTransform: 'uppercase', color: theme.accentGold, margin: '0 0 0.5rem 0.9rem',
          }}>
            My World
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {DG_SHELF.map(item => (
              <button
                key={item.key}
                className="dg-rail-item"
                onClick={() => onShelfAction && onShelfAction(item.key)}
                aria-label={item.label}
                title={item.label}
              >
                <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                  <DGIcon name={item.icon} size={20} color={theme.accentGold} />
                </span>
                <span className="dg-rail-label" style={{
                  fontFamily: theme.fontBody, fontSize: '0.8rem', letterSpacing: '0.06em',
                  color: theme.textBody,
                }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}
