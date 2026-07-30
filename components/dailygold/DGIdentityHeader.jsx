'use client';
/**
 * DGIdentityHeader (mobile, <768px)
 *
 * The sticky compact identity header from the navigation redesign spec §4.4:
 * avatar + "Hi, {name}" + reader switcher, with the "My World" shelf as a
 * chip row — so identity and the child's own space stay reachable without
 * scrolling back up. Replaces the scroll-away ChildGreetingStrip. Hidden at
 * ≥768px by the shell stylesheet (`.dg-idheader`), where the rail's identity
 * block takes over.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import { DG_SHELF, DGIcon } from '@/components/dailygold/dgNavConfig';
import ChildSwitcherOverlay from '@/components/dailygold/ChildSwitcherOverlay';
import { AVATARS } from '@/lib/avatars';

export default function DGIdentityHeader({ child }) {
  const router = useRouter();
  const { theme } = useTheme();
  const { track } = useInstrumentation();
  const [showSwitcher, setShowSwitcher] = useState(false);

  if (!child) return null;
  const avatar = AVATARS[child.avatar] || AVATARS.sun;

  return (
    <div
      className="dg-idheader"
      style={{
        background: theme.bgOverlay,
        borderBottom: `1px solid ${theme.accentGold}26`,
      }}
    >
      {/* Identity + switcher */}
      <div style={{ position: 'relative', minWidth: 0 }}>
        <button
          onClick={() => setShowSwitcher(v => !v)}
          aria-haspopup="menu"
          aria-expanded={showSwitcher}
          aria-label={`Reading as ${child.name}. Switch reader`}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.25rem 0.25rem 0',
            minWidth: 0,
          }}
        >
          <span aria-hidden="true" style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: avatar.bg, border: `1.5px solid ${theme.accentGold}80`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem',
          }}>
            {avatar.emoji}
          </span>
          <span style={{
            fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '0.95rem',
            color: theme.textMuted, whiteSpace: 'nowrap',
          }}>
            Hi,{' '}
            <span style={{ fontWeight: 600, color: theme.textHeadline }}>{child.name}</span>
          </span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
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

      {/* My World chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {DG_SHELF.map(item => (
          <button
            key={item.key}
            /* Chips are the shelf in miniature — same event as the rail's My
               World items, distinguished only by where the child tapped. */
            onClick={() => {
              track('shelf_open', { contentId: item.path, label: item.label, source: 'header' });
              router.push(item.path);
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              minHeight: 44, padding: '0.35rem 0.85rem', flexShrink: 0,
              background: `${theme.accentGold}14`,
              border: `1px solid ${theme.accentGold}59`,
              borderRadius: 999, cursor: 'pointer',
            }}
          >
            <DGIcon name={item.icon} size={15} color={theme.accentGold} />
            <span style={{
              fontFamily: theme.fontBody, fontSize: '0.75rem', letterSpacing: '0.06em',
              color: theme.textBody, whiteSpace: 'nowrap',
            }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
