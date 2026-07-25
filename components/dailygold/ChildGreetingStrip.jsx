'use client';
/**
 * ChildGreetingStrip
 * Warm personal greeting "Hi, [Name]" + child switcher overlay + quick personal links.
 *
 * The switcher is the profile picker inline: it lists the family's own child
 * profiles and switches by changing the session server-side (auth-plan §4), so
 * a PIN-protected profile asks for its PIN here exactly as it does on
 * /profiles. Nothing about the reader is held on the client — a successful
 * switch refreshes the route and the new child arrives as a prop.
 */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getProfilesForPicker, enterChildProfile, enterChildProfileAsGuardian } from '@/app/profiles/actions';
import { AVATARS } from '@/lib/avatars';

const GOLD = '#C8A96B';
const TEXT = '#5C4A36';
const TEXT_MUTED = '#9B7B5C';
const BG = 'rgba(240,228,204,0.85)';

function QuickLink({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: hovered ? `rgba(201,169,107,0.22)` : `rgba(201,169,107,0.10)`,
        border: `1px solid rgba(201,169,107,${hovered ? '0.6' : '0.35'})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s ease',
        boxShadow: hovered ? '0 2px 8px rgba(201,169,107,0.2)' : 'none',
      }}>
        {icon}
      </div>
      <span style={{
        fontFamily: 'Lato, sans-serif', fontSize: '0.5rem',
        color: hovered ? GOLD : TEXT_MUTED, letterSpacing: '0.06em',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
        transition: 'color 0.18s ease',
      }}>
        {label}
      </span>
    </button>
  );
}

function ChildSwitcherOverlay({ currentChildId, onSwitched, onClose }) {
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

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: '110%', left: 0, zIndex: 500,
        background: '#FFFDF7',
        border: `1px solid rgba(201,169,107,0.3)`,
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(44,36,22,0.14)',
        minWidth: 200,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '0.65rem 1rem 0.4rem', borderBottom: '1px solid rgba(201,169,107,0.15)' }}>
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: TEXT_MUTED, margin: 0 }}>
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
            onChange={e => setPin(asGuardian ? e.target.value : e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') submitPin(); if (e.key === 'Escape') setPinFor(null); }}
            style={{
              width: '100%', padding: '0.5rem 0.65rem',
              fontFamily: 'Lato, sans-serif', fontSize: '0.8rem',
              letterSpacing: asGuardian ? 'normal' : '0.3em', textAlign: asGuardian ? 'left' : 'center',
              color: TEXT, background: '#FFFDF7',
              border: `1px solid rgba(201,169,107,0.4)`, borderRadius: 8,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', color: '#B4553C', margin: '0.45rem 0 0' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: '0.6rem' }}>
            <button
              onClick={submitPin}
              disabled={pending || pin.length < (asGuardian ? 1 : 4)}
              style={{
                flex: 1, padding: '0.4rem', borderRadius: 8, cursor: 'pointer',
                fontFamily: 'Lato, sans-serif', fontSize: '0.65rem', letterSpacing: '0.08em',
                color: '#FFFDF7', background: GOLD, border: 'none',
                opacity: pending || pin.length < (asGuardian ? 1 : 4) ? 0.5 : 1,
              }}
            >
              {pending ? '…' : 'Open'}
            </button>
            <button
              onClick={() => { setPinFor(null); setPin(''); setAsGuardian(false); setError(null); }}
              style={{
                padding: '0.4rem 0.7rem', borderRadius: 8, cursor: 'pointer',
                fontFamily: 'Lato, sans-serif', fontSize: '0.65rem',
                color: TEXT_MUTED, background: 'transparent', border: `1px solid rgba(201,169,107,0.3)`,
              }}
            >
              Back
            </button>
          </div>
          {!asGuardian && (
            <button
              onClick={() => { setAsGuardian(true); setPin(''); setError(null); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0 0',
                fontFamily: 'Lato, sans-serif', fontSize: '0.58rem', color: TEXT_MUTED,
                textDecoration: 'underline', display: 'block',
              }}
            >
              Forgot it? Ask a grown-up
            </button>
          )}
        </div>
      ) : loading ? (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${GOLD}40`, borderTopColor: GOLD, animation: 'dgSpin 0.7s linear infinite', margin: '0 auto' }} />
        </div>
      ) : (
        <>
          {children.map(kid => {
            const avatar = AVATARS[kid.avatar] || AVATARS.sun;
            return (
              <button
                key={kid.id}
                onClick={() => pick(kid)}
                disabled={pending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '0.6rem 1rem',
                  background: kid.id === currentChildId ? `rgba(201,169,107,0.1)` : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid rgba(201,169,107,0.08)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => { if (kid.id !== currentChildId) e.currentTarget.style.background = 'rgba(201,169,107,0.06)'; }}
                onMouseLeave={e => { if (kid.id !== currentChildId) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: avatar.bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem',
                  border: `1.5px solid rgba(201,169,107,${kid.id === currentChildId ? '0.7' : '0.3'})`,
                }}>
                  {avatar.emoji}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '0.78rem', fontWeight: kid.id === currentChildId ? 700 : 400, color: TEXT, margin: 0 }}>
                    {kid.displayName}
                  </p>
                  {kid.age > 0 && (
                    <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.55rem', color: TEXT_MUTED, margin: 0 }}>
                      Age {kid.age}
                    </p>
                  )}
                </div>
                {kid.id === currentChildId ? (
                  <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
                ) : kid.hasPin ? (
                  <span style={{ marginLeft: 'auto', fontSize: '0.62rem', opacity: 0.55 }}>🔒</span>
                ) : null}
              </button>
            );
          })}
          {error && (
            <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', color: '#B4553C', margin: 0, padding: '0.5rem 1rem' }}>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function ChildGreetingStrip({ child, onShowFlags, navigate }) {
  const router = useRouter();
  const [showSwitcher, setShowSwitcher] = useState(false);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.5rem clamp(1rem, 3vw, 2rem) 0.75rem',
    }}>
      <style>{`@keyframes dgSpin { to { transform: rotate(360deg); } }`}</style>

      {/* LEFT: Greeting + quick links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Greeting with tappable name */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              fontSize: '0.95rem',
              color: TEXT_MUTED,
              fontWeight: 400,
            }}>Hi,</span>
            <button
              onClick={() => setShowSwitcher(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: '"Playfair Display", serif',
                fontStyle: 'italic',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#8B6A3A',
                letterSpacing: '0.01em',
                display: 'flex', alignItems: 'baseline', gap: 4,
              }}
            >
              {child.name}
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ marginBottom: 1 }}>
                <path d="M2 3.5l3 3 3-3" stroke="rgba(139,106,58,0.6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p style={{
            fontFamily: 'Lato, sans-serif', fontSize: '0.5rem', color: 'rgba(155,123,92,0.55)',
            margin: '1px 0 0', letterSpacing: '0.08em', pointerEvents: 'none',
          }}>
            tap to switch reader
          </p>
          {showSwitcher && (
            <ChildSwitcherOverlay
              currentChildId={child.id}
              onSwitched={() => { setShowSwitcher(false); router.refresh(); }}
              onClose={() => setShowSwitcher(false)}
            />
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <QuickLink
            label="My Flags"
            onClick={onShowFlags}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            }
          />
          <QuickLink
            label="My Book"
            onClick={() => navigate && navigate('/assessments/goldprint')}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
            }
          />
          <QuickLink
            label="My Recipes"
            onClick={() => {}}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2l1.5 14.5a2 2 0 002 1.5h11a2 2 0 002-1.5L21 2"/>
                <path d="M12 2v4"/><path d="M8 2v3"/><path d="M16 2v3"/>
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}