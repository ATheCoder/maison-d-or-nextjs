// @ts-nocheck — untyped .jsx from before checkJs was on; 24 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * ChildSwitcherOverlay — the inline identity menu.
 *
 * Extracted from ChildGreetingStrip so both navigation renderers (desktop rail
 * identity block, mobile identity header) share one switcher. It lists the
 * family's child profiles and switches by changing the session server-side
 * (auth-plan §4), so a PIN-protected profile asks for its PIN here exactly as
 * it does on /profiles. Nothing about the reader is held on the client — a
 * successful switch refreshes the route and the new child arrives as a prop.
 *
 * The menu now serves the grown-ups too:
 * - In child mode it carries "Switch to parent", the grown-up gate inline —
 *   the guardian PIN or password clears child mode via passGrownUpGate, same
 *   credential and same server action as /gate.
 * - Signed in as a parent or admin (no active reader) it carries "Sign out".
 *   Sign-out is deliberately absent in child mode: a reader switches readers
 *   or fetches a grown-up; ending the account's session is not theirs to do.
 * - Admins have no family, so the profile list is never fetched for them
 *   (getProfilesForPicker requires a guardian and would redirect) — their
 *   menu is the sign-out row alone.
 *
 * `onSwitched(kind, profile?)` reports what happened — 'child' (a reader was
 * entered, with the picker row that was pressed) or 'parent' (child mode was
 * cleared) — so the mount site can decide where to land and raise the right
 * curtain over the wait.
 */
import { useState, useEffect, useRef } from 'react';
import { Avatar, Button, Field } from '@/components/ds';
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
import { getProfilesForPicker, enterChildProfile, enterChildProfileAsGuardian, passGrownUpGate } from '@/app/profiles/actions';
import { authClient } from '@/lib/auth-client';

export default function ChildSwitcherOverlay({ currentChildId = null, viewer = null, onSwitched, onClose, align = 'left', placement = 'bottom' }) {
  const isAdminViewer = viewer?.role === 'admin';
  const [children, setChildren] = useState([]);
  // Admins have no family, so there is nothing to load for them.
  const [loading, setLoading] = useState(!isAdminViewer);
  // The profile awaiting a PIN, if the child tapped a locked one.
  const [pinFor, setPinFor] = useState(null);
  const [pin, setPin] = useState('');
  // Guardian override: the parent PIN or password opens any profile.
  const [asGuardian, setAsGuardian] = useState(false);
  // The grown-up gate: leaving child mode for the parent account.
  const [parentGate, setParentGate] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const ref = useRef(null);

  const isAdmin = isAdminViewer;
  const inChildMode = currentChildId != null;
  // The credential form asks for the guardian credential (free-form) rather
  // than a child's 4-digit PIN in both of these.
  const guardianCredential = asGuardian || parentGate;

  useEffect(() => {
    // Admins have no family; asking would redirect them out of the page.
    if (isAdmin) return;
    getProfilesForPicker()
      .then(({ profiles }) => setChildren(profiles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  async function pick(kid) {
    if (kid.id === currentChildId) { onClose(); return; }
    if (kid.hasPin) { setPinFor(kid); setPin(''); setError(null); return; }
    setPending(true);
    const res = await enterChildProfile(kid.id);
    setPending(false);
    if (res.ok) onSwitched('child', kid);
    else setError(res.error);
  }

  async function submitCredential() {
    if ((!pinFor && !parentGate) || pending) return;
    setPending(true);
    setError(null);
    let res;
    if (parentGate) {
      res = await passGrownUpGate(pin);
    } else if (asGuardian) {
      res = await enterChildProfileAsGuardian(pinFor.id, pin);
    } else {
      res = await enterChildProfile(pinFor.id, pin);
    }
    setPending(false);
    if (res.ok) { onSwitched(parentGate ? 'parent' : 'child', parentGate ? null : pinFor); return; }
    setPin('');
    setError(res.error);
  }

  async function signOut() {
    if (pending) return;
    setPending(true);
    // A full-page navigation, not router.push + router.refresh(): leaving an
    // identity is the one moment worth discarding the whole client cache
    // (same rationale as SignOutButton).
    await authClient.signOut();
    window.location.assign('/login');
  }

  function closeCredentialForm() {
    setPinFor(null);
    setParentGate(false);
    setAsGuardian(false);
    setPin('');
    setError(null);
  }

  // Close on outside click or Escape.
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const showCredentialForm = pinFor != null || parentGate;

  const heading = pinFor
    ? (asGuardian ? 'Ask a grown-up' : `${pinFor.displayName}'s PIN`)
    : parentGate
      ? 'Parents only'
      : isAdmin
        ? 'Account'
        : 'Switch Reader';

  // A bordered menu row shared by the grown-up actions under the list.
  const actionRowStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '0.6rem 1rem', minHeight: 48,
    background: 'transparent', border: 'none', cursor: 'pointer',
    borderTop: '1px solid var(--border-fine)',
    color: 'var(--text-primary)', textAlign: 'left',
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={inChildMode ? 'Switch reader' : 'Account menu'}
      style={{
        position: 'absolute', zIndex: 1100,
        /* The rail's identity block sits at the FOOT of the rail, so its menu
           has to grow upward or it opens off the bottom of the screen. The
           mobile identity header, which is at the top, passes nothing. */
        ...(placement === 'top' ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
        ...(align === 'right' ? { right: 0 } : { left: 0 }),
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-fine)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-modal)',
        minWidth: 220,
        maxWidth: 'min(320px, calc(100vw - 2rem))',
        /* Scrolls rather than clips: a family with many readers opening
           upward would otherwise run off the top of the viewport, and there
           is no room above the first row to run into. */
        maxHeight: 'min(70vh, 520px)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <style>{`@keyframes dgSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ padding: '0.65rem 1rem 0.4rem', borderBottom: '1px solid var(--border-fine)' }}>
        <DGEyebrow tracking="wide" tone="secondary">
          {heading}
        </DGEyebrow>
      </div>
      {showCredentialForm ? (
        <div style={{ padding: '0.85rem 1rem 1rem' }}>
          {/* The label is hidden, not absent: the menu heading directly above
              already asks the question, but a real <label> survives translation
              and can be clicked, which the aria-label here before it could not.
              The error moved into Field's own message seat, which carries
              role="alert" and the aria-describedby wiring this hand-rolled
              pair never had. The bespoke border and radius are gone with it —
              the house field coat brings a focus halo, and this box previously
              set outline:none and offered nothing in its place. */}
          <Field
            label={guardianCredential ? 'Parent PIN or password' : `${pinFor.displayName}'s PIN`}
            labelHidden
            type="password"
            inputMode={guardianCredential ? 'text' : 'numeric'}
            autoFocus
            value={pin}
            maxLength={guardianCredential ? undefined : 4}
            placeholder={guardianCredential ? 'Parent PIN or password' : '••••'}
            error={error ?? undefined}
            onChange={e => setPin(guardianCredential ? e.target.value : e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') submitCredential(); if (e.key === 'Escape') { e.stopPropagation(); closeCredentialForm(); } }}
            style={{
              /* the wide 0.3em spacing is the PIN-dot layout, not typography */
              letterSpacing: guardianCredential ? 'normal' : '0.3em',
              textAlign: guardianCredential ? 'left' : 'center',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: '0.6rem' }}>
            {/* The house coats, not two hand-rolled ones. This pair used to
                be `bare` buttons painting their own fill: --accent under
                --surface-raised ink, which is a pairing no scope guarantees —
                on parchment and in the four atmospheres --surface-raised is
                the ivory, so "Open" was ivory text on gold — and an --accent
                30% hairline for the second. `primary` and `ghost` re-scope
                both halves per theme (espresso-on-ivory here, gold-bright on
                the dark grounds), bring the house corner (--radius-md, not
                the 8px this had) and the 44.5px control height, and `loading`
                is the ellipsis and the hand-dimmed opacity done properly: it
                keeps the full coat and says aria-busy. */}
            <Button
              onClick={submitCredential}
              disabled={pin.length < (guardianCredential ? 1 : 4)}
              loading={pending}
              style={{ flex: 1 }}
            >
              Open
            </Button>
            <Button variant="ghost" onClick={closeCredentialForm}>
              Back
            </Button>
          </div>
          {/* `link` at the caption size, rather than a bare button wearing an
              underline and no ink: the coat is accent-readable (the AA tier
              small functional text is meant to sit in) and the underline comes
              with it. `size="sm"` is what carries --type-caption here — the old
              `type-caption` class also set --text-secondary, so the link's
              colour would have depended on which utility Tailwind emitted
              last. */}
          {pinFor && !asGuardian && (
            <Button
              variant="link"
              size="sm"
              onClick={() => { setAsGuardian(true); setPin(''); setError(null); }}
              style={{ marginTop: '0.6rem' }}
            >
              Forgot it? Ask a grown-up
            </Button>
          )}
        </div>
      ) : loading ? (
        <div style={{ padding: '1rem', textAlign: 'center' }} role="status" aria-label="Loading readers">
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid color-mix(in srgb, var(--accent) 25%, transparent)', borderTopColor: 'var(--accent)', animation: 'dgSpin 0.7s linear infinite', margin: '0 auto' }} />
        </div>
      ) : (
        <>
          {children.map(kid => {
            const isCurrent = kid.id === currentChildId;
            return (
              <Button variant="bare"
                key={kid.id}
                role="menuitem"
                onClick={() => pick(kid)}
                disabled={pending}
                aria-current={isCurrent ? 'true' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '0.6rem 1rem', minHeight: 48,
                  background: isCurrent ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--border-fine)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 6%, transparent)'; }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* The ring used to be 30% here and 70% for the current
                    reader — three strengths of one hairline across the app,
                    which nobody was reading as information. Avatar's two
                    states say the same thing louder. */}
                <Avatar avatar={kid.avatar} size="sm" ring={!isCurrent} selected={isCurrent} />
                <div style={{ textAlign: 'left' }}>
                  {/* type-body-ui, which is the token the house sets a
                      roster row's name in (FamilyManager's children,
                      guardians and invites all wear exactly this pair). It
                      was `type-caption font-display` at weight 700/400 —
                      a sans token wearing the serif face, at two weights the
                      scale does not contain, to say "current". The row's
                      accent wash, Avatar's `selected` ring and the dot on the
                      right already say it three times over. */}
                  <p className="type-body-ui" style={{ color: 'var(--text-primary)', margin: 0 }}>
                    {kid.displayName}
                  </p>
                  {kid.age > 0 && (
                    <p className="type-caption" style={{ color: 'var(--text-faint)', margin: 0 }}>
                      Age {kid.age}
                    </p>
                  )}
                </div>
                {isCurrent ? (
                  <div aria-hidden="true" style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                ) : kid.hasPin ? (
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--type-label-editorial)', opacity: 0.55 }} role="img" aria-label="PIN protected">🔒</span>
                ) : null}
              </Button>
            );
          })}
          {error && (
            <p role="alert" className="type-caption" style={{ color: 'var(--danger-readable)', margin: 0, padding: '0.5rem 1rem' }}>
              {error}
            </p>
          )}
          {inChildMode && (
            <Button variant="bare"
              role="menuitem"
              onClick={() => { setParentGate(true); setPin(''); setError(null); }}
              disabled={pending}
              className="type-body-ui"
              style={actionRowStyle}
            >
              {/* Avatar with no emblem and no name IS the grown-up's key —
                  🗝️ on --surface-tint behind the house ring. This was a
                  hand-drawn copy of it at 30px with a 30% ring, one of the
                  seven the primitive's docstring names. */}
              <Avatar size="sm" ring />
              <span>Switch to parent</span>
              <span style={{ marginLeft: 'auto', fontSize: 'var(--type-label-editorial)', opacity: 0.55 }} role="img" aria-label="Requires the parent PIN or password">🔒</span>
            </Button>
          )}
          {!inChildMode && viewer && (
            <Button variant="bare"
              role="menuitem"
              onClick={signOut}
              disabled={pending}
              className="type-body-ui"
              style={{ ...actionRowStyle, color: 'var(--text-secondary)' }}
            >
              {pending ? 'Signing out…' : 'Sign out'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
