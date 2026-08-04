// @ts-nocheck — untyped .jsx from before checkJs was on; 12 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * DGNavigationRail (desktop, ≥768px)
 *
 * One of the two renderers of dgNavConfig (the other is DGMobileTabBar).
 * Top to bottom: monogram, identity block, global destinations, then the
 * child's own "My World" shelf. The identity block wears whichever identity
 * the session holds: the active reader ("Hi, {name}" + reader switcher), or
 * the signed-in grown-up (role caption + account menu with sign-out).
 *
 * Layout contract: the rail's width is the shared `--dg-rail-w` CSS variable
 * set by DailyGoldEditionPage's shell stylesheet, which also pads the page
 * content by the same variable — the two can never drift apart. At 768–1023px
 * the shell collapses the rail to icons (labels hidden via `.dg-rail-label`);
 * below 768px the rail is hidden entirely.
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import { dgDestinationsFor, DG_SHELF, DGIcon, isNavItemActive } from '@/components/dailygold/dgNavConfig';
import ChildSwitcherOverlay from '@/components/dailygold/ChildSwitcherOverlay';
import SwitchCurtain, { useProfileSwitch } from '@/components/dailygold/ProfileSwitchCurtain';
import { AVATARS } from '@/lib/avatars';

export default function DGNavigationRail({ child = null, viewer = null }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  // The rail also hangs on /passport and /treasury, which mount no provider —
  // there this is the no-op API and nothing is recorded. No conditional needed.
  const { track } = useInstrumentation();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const avatar = child ? (AVATARS[child.avatar] || AVATARS.sun) : null;
  const destinations = dgDestinationsFor(child);

  const isActive = (item) => isNavItemActive(item, pathname);

  // The landing rule and the curtain that covers it live in useProfileSwitch;
  // this only closes the menu before handing the switch over.
  const { switching, handleSwitched: landSwitch } = useProfileSwitch(!!child);
  const handleSwitched = (kind, profile) => {
    setShowSwitcher(false);
    landSwitch(kind, profile);
  };

  return (
    <nav className="dg-rail" aria-label="Daily Gold navigation">
      <SwitchCurtain switching={switching} />
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
              viewer={viewer}
              onSwitched={handleSwitched}
              onClose={() => setShowSwitcher(false)}
            />
          )}
        </div>
      )}

      {/* Grown-up identity block — a parent or admin with no active reader.
          Same slot, same menu affordance; the caption names the role so the
          account holder always knows which hat they are wearing. */}
      {!child && viewer && (
        <div style={{ position: 'relative', marginTop: '1.5rem' }}>
          <button
            className="dg-rail-item dg-rail-id"
            onClick={() => setShowSwitcher(v => !v)}
            aria-haspopup="menu"
            aria-expanded={showSwitcher}
            aria-label={`Signed in as ${viewer.name} (${viewer.role === 'admin' ? 'admin' : 'parent'}). Account menu`}
          >
            <span aria-hidden="true" style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: '#E4DCCE', border: `1.5px solid ${theme.accentGold}80`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
            }}>
              🗝️
            </span>
            <span className="dg-rail-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
              <span style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', color: theme.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {viewer.role === 'admin' ? 'Admin' : 'Parent'}
              </span>
              <span style={{
                fontFamily: theme.fontHeadline, fontStyle: 'italic', fontWeight: 600,
                fontSize: '0.95rem', color: theme.textHeadline,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110,
              }}>
                {viewer.name}
              </span>
            </span>
            <svg className="dg-rail-label" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <path d="M2 3.5l3 3 3-3" stroke={theme.textMuted} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showSwitcher && (
            <ChildSwitcherOverlay
              viewer={viewer}
              onSwitched={handleSwitched}
              onClose={() => setShowSwitcher(false)}
            />
          )}
        </div>
      )}

      {/* Global destinations.

          <Link>, not buttons: the rail sits in the viewport, so every
          destination's partial route — down to its own loading.tsx boundary —
          is prefetched on arrival. That boundary being warm is what lets a
          press show the page-shaped skeleton (family's, treasury's) instead of
          the generic group fallback. Default prefetch stops at the boundary
          for dynamic routes, so this costs no full server renders — except for
          the one destination that asks for the whole route (`prefetchFull` in
          dgNavConfig, and the reason it may). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: '1.5rem' }}>
        {destinations.map(item => {
          const active = isActive(item);
          return (
            <Link
              key={item.key}
              href={item.path}
              prefetch={item.prefetchFull ? true : undefined}
              className={`dg-rail-item${active ? ' dg-rail-active' : ''}`}
              /* onNavigate, not onClick: it fires only for the client-side
                 navigation this event describes — a cmd-click into a new tab
                 is not this session going anywhere. */
              onNavigate={() => {
                track('nav_select', { contentId: item.path, label: item.label, source: 'rail' });
              }}
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
              {active && <span className="dg-rail-dot" aria-hidden="true" style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: theme.accentGold, flexShrink: 0 }} />}
            </Link>
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
            {DG_SHELF.map(item => {
              const active = isActive(item);
              return (
                <Link
                  key={item.key}
                  href={item.path}
                  className={`dg-rail-item${active ? ' dg-rail-active' : ''}`}
                  /* The shelf is the child's own space, not a destination of the
                     app — its own event, from the same source. */
                  onNavigate={() => {
                    track('shelf_open', { contentId: item.path, label: item.label, source: 'rail' });
                  }}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                    <DGIcon name={item.icon} size={20} color={theme.accentGold} />
                  </span>
                  <span className="dg-rail-label" style={{
                    fontFamily: theme.fontBody, fontSize: '0.8rem', letterSpacing: '0.06em',
                    color: active ? theme.textHeadline : theme.textBody,
                    fontWeight: active ? 700 : 400,
                  }}>
                    {item.label}
                  </span>
                  {active && <span className="dg-rail-dot" aria-hidden="true" style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: theme.accentGold, flexShrink: 0 }} />}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </nav>
  );
}
