'use client';
/**
 * ChildSwitcherOverlay — the inline reader switcher.
 *
 * Extracted from ChildGreetingStrip so both navigation renderers (desktop rail
 * identity block, mobile identity header) share one switcher. It lists the
 * family's child profiles and switches by changing the session server-side
 * (auth-plan §4), so a PIN-protected profile asks for its PIN here exactly as
 * it does on /profiles. Nothing about the reader is held on the client — a
 * successful switch refreshes the route and the new child arrives as a prop.
 */
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import { getProfilesForPicker, enterChildProfile, enterChildProfileAsGuardian } from '@/app/profiles/actions';
import { AVATARS } from '@/lib/avatars';

const ERROR_RED = '#B4553C';

export default function ChildSwitcherOverlay({ currentChildId, onSwitched, onClose, align = 'left' }) {
  const { theme } = useTheme();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  // The profile awaiting a PIN, if the child tapped a locked one.
  const [pinFor, setPinFor] = useState(null);
  const [pin, setPin] = useState('');
  // Guardian override: the parent PIN or password opens any profile.
  const [asGuardian, setAsGuardian] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    getProfilesForPicker()
      .then(({ profiles }) => setChildren(profiles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function pick(kid) {
    if (kid.id === currentChildId) { onClose(); return; }
    if (kid.hasPin) { setPinFor(kid); setPin(''); setError(null); return; }
    setPending(true);
    const res = await enterChildProfile(kid.id);
    setPending(false);
    if (res.ok) onSwitched();
    else setError(res.error);
  }

  async function submitPin() {
    if (!pinFor || pending) return;
    setPending(true);
    setError(null);
    const res = asGuardian
      ? await enterChildProfileAsGuardian(pinFor.id, pin)
      : await enterChildProfile(pinFor.id, pin);
    setPending(false);
    if (res.ok) { onSwitched(); return; }
    setPin('');
    setError(res.error);
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

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Switch reader"
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
          {pinFor ? (asGuardian ? 'Ask a grown-up' : `${pinFor.displayName}'s PIN`) : 'Switch Reader'}
        </p>
      </div>
      {pinFor ? (
        <div style={{ padding: '0.85rem 1rem 1rem' }}>
          <input
            type="password"
            inputMode={asGuardian ? 'text' : 'numeric'}
            autoFocus
            value={pin}
            maxLength={asGuardian ? undefined : 4}
            placeholder={asGuardian ? 'Parent PIN or password' : '••••'}
            aria-label={asGuardian ? 'Parent PIN or password' : `${pinFor.displayName}'s PIN`}
            onChange={e => setPin(asGuardian ? e.target.value : e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') submitPin(); if (e.key === 'Escape') { e.stopPropagation(); setPinFor(null); } }}
            style={{
              width: '100%', padding: '0.6rem 0.65rem',
              fontFamily: theme.fontBody, fontSize: '0.9rem',
              letterSpacing: asGuardian ? 'normal' : '0.3em', textAlign: asGuardian ? 'left' : 'center',
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
              onClick={submitPin}
              disabled={pending || pin.length < (asGuardian ? 1 : 4)}
              style={{
                flex: 1, padding: '0.6rem', borderRadius: 8, cursor: 'pointer', minHeight: 40,
                fontFamily: theme.fontBody, fontSize: '0.75rem', letterSpacing: '0.08em',
                color: theme.bgCard, background: gold, border: 'none',
                opacity: pending || pin.length < (asGuardian ? 1 : 4) ? 0.5 : 1,
              }}
            >
              {pending ? '…' : 'Open'}
            </button>
            <button
              onClick={() => { setPinFor(null); setPin(''); setAsGuardian(false); setError(null); }}
              style={{
                padding: '0.6rem 0.8rem', borderRadius: 8, cursor: 'pointer', minHeight: 40,
                fontFamily: theme.fontBody, fontSize: '0.75rem',
                color: theme.textMuted, background: 'transparent', border: `1px solid ${gold}4D`,
              }}
            >
              Back
            </button>
          </div>
          {!asGuardian && (
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
        </>
      )}
    </div>
  );
}
