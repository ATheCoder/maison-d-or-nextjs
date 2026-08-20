// @ts-nocheck — untyped .jsx from before checkJs was on; 11 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
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
 *
 * With no active reader but a signed-in grown-up it wears the account instead:
 * role caption + name, opening the same menu (readers to enter, sign out).
 * Renders nothing only for signed-out visitors.
 */
import { useState } from 'react';
import { Button } from '@/components/ds';
import { useRouter } from 'next/navigation';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import { DG_SHELF, DGIcon } from '@/components/dailygold/dgNavConfig';
import ChildSwitcherOverlay from '@/components/dailygold/ChildSwitcherOverlay';
import SwitchCurtain, { useProfileSwitch } from '@/components/dailygold/ProfileSwitchCurtain';
import { AVATARS } from '@/lib/avatars';

export default function DGIdentityHeader({ child = null, viewer = null }) {
  const router = useRouter();
  const { track } = useInstrumentation();
  const [showSwitcher, setShowSwitcher] = useState(false);
  // Same landing rule as the rail — it lives in useProfileSwitch, along with
  // the curtain that covers the wait.
  const { switching, handleSwitched: landSwitch } = useProfileSwitch(!!child);

  if (!child && !viewer) return null;
  const avatar = child ? (AVATARS[child.avatar] || AVATARS.sun) : { emoji: '🗝️', bg: 'var(--surface-tint)' };

  const handleSwitched = (kind, profile) => {
    setShowSwitcher(false);
    landSwitch(kind, profile);
  };

  return (
    <div
      className="dg-idheader"
      style={{
        background: 'var(--surface-overlay)',
        borderBottom: '1px solid var(--border-fine)',
      }}
    >
      <SwitchCurtain switching={switching} />
      {/* Identity + switcher */}
      <div style={{ position: 'relative', minWidth: 0 }}>
        <Button variant="bare"
          onClick={() => setShowSwitcher(v => !v)}
          aria-haspopup="menu"
          aria-expanded={showSwitcher}
          aria-label={child
            ? `Reading as ${child.name}. Switch reader`
            : `Signed in as ${viewer.name} (${viewer.role === 'admin' ? 'admin' : 'parent'}). Account menu`}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.25rem 0.25rem 0',
            minWidth: 0,
          }}
        >
          <span aria-hidden="true" style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: avatar.bg, border: '1.5px solid color-mix(in srgb, var(--accent) 50%, transparent)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem',
          }}>
            {avatar.emoji}
          </span>
          <span className="type-caption font-display italic" style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
          }}>
            {child ? 'Hi, ' : `${viewer.role === 'admin' ? 'Admin' : 'Parent'} · `}
            <span style={{ color: 'var(--accent-readable)' }}>{child ? child.name : viewer.name}</span>
          </span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M2 3.5l3 3 3-3" style={{ stroke: 'var(--text-secondary)' }} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        {showSwitcher && (
          <ChildSwitcherOverlay
            currentChildId={child?.id ?? null}
            viewer={viewer}
            onSwitched={handleSwitched}
            onClose={() => setShowSwitcher(false)}
          />
        )}
      </div>

      {/* My World chips — the reader's own space; grown-ups have no shelf */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {child && DG_SHELF.map(item => (
          <Button variant="bare"
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
              background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
              border: '1px solid var(--border-accent)',
              borderRadius: 999, cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex', color: 'var(--accent)' }}>
              <DGIcon name={item.icon} size={15} />
            </span>
            <span className="type-body-ui" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
