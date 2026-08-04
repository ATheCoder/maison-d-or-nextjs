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
import { useTheme } from '@/components/theme/ThemeContext';
import { getProfilesForPicker, enterChildProfile, enterChildProfileAsGuardian, passGrownUpGate } from '@/app/profiles/actions';
import { authClient } from '@/lib/auth-client';
import { AVATARS } from '@/lib/avatars';

const ERROR_RED = '#B4553C';

export default function ChildSwitcherOverlay({ currentChildId = null, viewer = null, onSwitched, onClose, align = 'left' }) {
  const { theme } = useTheme();
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

  const gold = theme.accentGold;
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
    borderTop: `1px solid ${gold}26`,
    fontFamily: theme.fontBody, fontSize: '0.8rem', letterSpacing: '0.04em',
    color: theme.textBody, textAlign: 'left',
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={inChildMode ? 'Switch reader' : 'Account menu'}
      style={{
        position: 'absolute', top: 'calc(100% + 8px)', zIndex: 1100,
        ...(align === 'right' ? { right: 0 } : { left: 0 }),
        background: theme.bgCard,
        border: `1px solid ${gold}4D`,
        borderRadius: 14,
        boxShadow: theme.shadowDeep,
        minWidth: 220,
        maxWidth: 'min(320px, calc(100vw - 2rem))',
        overflow: 'hidden',
      }}
    >
      <style>{`@keyframes dgSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ padding: '0.65rem 1rem 0.4rem', borderBottom: `1px solid ${gold}26` }}>
        <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.textMuted, margin: 0 }}>
          {heading}
        </p>
      </div>
      {showCredentialForm ? (
        <div style={{ padding: '0.85rem 1rem 1rem' }}>
          <input
            type="password"
            inputMode={guardianCredential ? 'text' : 'numeric'}
            autoFocus
            value={pin}
            maxLength={guardianCredential ? undefined : 4}
            placeholder={guardianCredential ? 'Parent PIN or password' : '••••'}
            aria-label={guardianCredential ? 'Parent PIN or password' : `${pinFor.displayName}'s PIN`}
            onChange={e => setPin(guardianCredential ? e.target.value : e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') submitCredential(); if (e.key === 'Escape') { e.stopPropagation(); closeCredentialForm(); } }}
            style={{
              width: '100%', padding: '0.6rem 0.65rem',
              fontFamily: theme.fontBody, fontSize: '0.9rem',
              letterSpacing: guardianCredential ? 'normal' : '0.3em', textAlign: guardianCredential ? 'left' : 'center',
              color: theme.textBody, background: theme.bgCard,
              border: `1px solid ${gold}66`, borderRadius: 8,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {error && (
            <p role="alert" style={{ fontFamily: theme.fontBody, fontSize: '0.72rem', color: ERROR_RED, margin: '0.45rem 0 0' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: '0.6rem' }}>
            <button
              onClick={submitCredential}
              disabled={pending || pin.length < (guardianCredential ? 1 : 4)}
              style={{
                flex: 1, padding: '0.6rem', borderRadius: 8, cursor: 'pointer', minHeight: 40,
                fontFamily: theme.fontBody, fontSize: '0.75rem', letterSpacing: '0.08em',
                color: theme.bgCard, background: gold, border: 'none',
                opacity: pending || pin.length < (guardianCredential ? 1 : 4) ? 0.5 : 1,
              }}
            >
              {pending ? '…' : 'Open'}
            </button>
            <button
              onClick={closeCredentialForm}
              style={{
                padding: '0.6rem 0.8rem', borderRadius: 8, cursor: 'pointer', minHeight: 40,
                fontFamily: theme.fontBody, fontSize: '0.75rem',
                color: theme.textMuted, background: 'transparent', border: `1px solid ${gold}4D`,
              }}
            >
              Back
            </button>
          </div>
          {pinFor && !asGuardian && (
            <button
              onClick={() => { setAsGuardian(true); setPin(''); setError(null); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.6rem 0 0',
                fontFamily: theme.fontBody, fontSize: '0.7rem', color: theme.textMuted,
                textDecoration: 'underline', display: 'block',
              }}
            >
              Forgot it? Ask a grown-up
            </button>
          )}
        </div>
      ) : loading ? (
        <div style={{ padding: '1rem', textAlign: 'center' }} role="status" aria-label="Loading readers">
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${gold}40`, borderTopColor: gold, animation: 'dgSpin 0.7s linear infinite', margin: '0 auto' }} />
        </div>
      ) : (
        <>
          {children.map(kid => {
            const avatar = AVATARS[kid.avatar] || AVATARS.sun;
            const isCurrent = kid.id === currentChildId;
            return (
              <button
                key={kid.id}
                role="menuitem"
                onClick={() => pick(kid)}
                disabled={pending}
                aria-current={isCurrent ? 'true' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '0.6rem 1rem', minHeight: 48,
                  background: isCurrent ? `${gold}1A` : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: `1px solid ${gold}14`,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = `${gold}0F`; }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
              >
                <div aria-hidden="true" style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: avatar.bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem',
                  border: `1.5px solid ${gold}${isCurrent ? 'B3' : '4D'}`,
                }}>
                  {avatar.emoji}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontFamily: theme.fontHeadline, fontSize: '0.85rem', fontWeight: isCurrent ? 700 : 400, color: theme.textBody, margin: 0 }}>
                    {kid.displayName}
                  </p>
                  {kid.age > 0 && (
                    <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', color: theme.textMuted, margin: 0 }}>
                      Age {kid.age}
                    </p>
                  )}
                </div>
                {isCurrent ? (
                  <div aria-hidden="true" style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: gold, flexShrink: 0 }} />
                ) : kid.hasPin ? (
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.55 }} role="img" aria-label="PIN protected">🔒</span>
                ) : null}
              </button>
            );
          })}
          {error && (
            <p role="alert" style={{ fontFamily: theme.fontBody, fontSize: '0.72rem', color: ERROR_RED, margin: 0, padding: '0.5rem 1rem' }}>
              {error}
            </p>
          )}
          {inChildMode && (
            <button
              role="menuitem"
              onClick={() => { setParentGate(true); setPin(''); setError(null); }}
              disabled={pending}
              style={actionRowStyle}
            >
              <span aria-hidden="true" style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: '#E4DCCE',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', border: `1.5px solid ${gold}4D`,
              }}>
                🗝️
              </span>
              <span>Switch to parent</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.55 }} role="img" aria-label="Requires the parent PIN or password">🔒</span>
            </button>
          )}
          {!inChildMode && viewer && (
            <button
              role="menuitem"
              onClick={signOut}
              disabled={pending}
              style={{ ...actionRowStyle, color: theme.textMuted }}
            >
              {pending ? 'Signing out…' : 'Sign out'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
