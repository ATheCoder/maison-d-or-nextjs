'use client';
/**
 * Netflix-style profile picker (auth-plan §4). Child tiles enter child mode
 * (PIN pad when the profile is protected, with a guardian-override fallback);
 * the Parent tile heads to the family area — requireFamily routes it through
 * the grown-up gate when the session is in child mode.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  enterChildProfile,
  enterChildProfileAsGuardian,
  exitChildProfile,
  type PickerProfile,
} from '@/app/profiles/actions';
import { AVATARS, type AvatarKey } from '@/lib/avatars';
import SignOutButton from '@/components/auth/SignOutButton';

const C = { gold: '#C9A96E', ivory: '#F5F0E7', ink: '#241A0C', brown: '#5C4A2A', muted: '#8B7355' };

function Tile({ label, emoji, bg, locked, onClick }: {
  label: string; emoji: string; bg: string; locked?: boolean; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
    >
      <div style={{
        width: 108, height: 108, borderRadius: '50%',
        background: bg,
        border: `3px solid ${hover ? C.gold : 'rgba(201,169,110,0.35)'}`,
        boxShadow: hover ? '0 6px 24px rgba(100,80,40,0.25)' : '0 2px 12px rgba(100,80,40,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '3rem',
        position: 'relative',
        transform: hover ? 'translateY(-4px)' : 'none',
        transition: 'all 0.2s ease',
        margin: '0 auto',
      }}>
        {emoji}
        {locked && (
          <span style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 30, height: 30, borderRadius: '50%',
            background: '#FFFDF9', border: '1.5px solid rgba(201,169,110,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
          }}>🔒</span>
        )}
      </div>
      <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.9rem', color: C.ink, margin: '0.7rem 0 0' }}>
        {label}
      </p>
    </button>
  );
}

export default function ProfilePicker({ profiles, userName, inChildMode = false }: { profiles: PickerProfile[]; userName: string; inChildMode?: boolean }) {
  const router = useRouter();
  const [pinFor, setPinFor] = useState<PickerProfile | null>(null);
  const [pin, setPin] = useState('');
  const [overrideMode, setOverrideMode] = useState(false);
  const [credential, setCredential] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [pending, setPending] = useState(false);

  function resetModal() {
    setPinFor(null); setPin(''); setOverrideMode(false); setCredential(''); setError(null); setLocked(false);
  }

  // Never follow the push with router.refresh(): refresh() re-fetches the
  // *current* route, so firing it alongside an in-flight push leaves the
  // navigation pending forever and the picker frozen. It buys nothing either —
  // /daily-gold-edition is dynamic (never client-cached), and the session
  // cookie the action just set invalidates the client cache by itself.
  async function pickProfile(p: PickerProfile) {
    setError(null);
    if (p.hasPin) { setPinFor(p); return; }
    const res = await enterChildProfile(p.id);
    if (res.ok) { router.push('/daily-gold-edition'); }
    else setError(res.error);
  }

  async function submitPin() {
    if (!pinFor || pending) return;
    setPending(true);
    setError(null);
    const res = overrideMode
      ? await enterChildProfileAsGuardian(pinFor.id, credential)
      : await enterChildProfile(pinFor.id, pin);
    setPending(false);
    if (res.ok) { router.push('/daily-gold-edition'); return; }
    setPin('');
    setError(res.error);
    if ('locked' in res && res.locked) setLocked(true);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.ivory,
      backgroundImage: 'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '3rem 1.5rem',
    }}>
      <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.gold, margin: '0 0 0.5rem' }}>
        Maison d&apos;Oré
      </p>
      <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.9rem', fontWeight: 600, color: C.ink, margin: '0 0 2.5rem' }}>
        Who&apos;s reading today?
      </h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', maxWidth: 640 }}>
        {profiles.map((p) => {
          const a = AVATARS[p.avatar as AvatarKey] ?? AVATARS.sun;
          return (
            <Tile
              key={p.id}
              label={p.displayName}
              emoji={a.emoji}
              bg={a.bg}
              locked={p.hasPin}
              onClick={() => pickProfile(p)}
            />
          );
        })}
        <Tile label={userName} emoji="🗝️" bg="#E4DCCE" onClick={() => router.push('/family')} />
      </div>

      {profiles.length === 0 && (
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.85rem', color: C.muted, marginTop: '2rem' }}>
          No child profiles yet — open <strong>{userName}</strong>&apos;s tile to add one.
        </p>
      )}

      {error && !pinFor && (
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.8rem', color: '#A4442E', marginTop: '1.5rem' }}>{error}</p>
      )}

      <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {inChildMode && (
          <button
            onClick={async () => { await exitChildProfile(); router.refresh(); }}
            style={{
              padding: '0.5rem 1.1rem', borderRadius: 10,
              border: '1px solid rgba(201,169,110,0.5)', background: 'rgba(201,169,110,0.15)',
              color: C.brown, fontFamily: 'Lato, sans-serif', fontSize: '0.75rem',
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Exit child mode
          </button>
        )}
        <SignOutButton />
      </div>

      {/* PIN modal */}
      {pinFor && (
        <div
          onClick={resetModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(36,26,12,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340,
              background: '#FFFDF9', borderRadius: 18,
              border: '1px solid rgba(201,169,110,0.35)',
              padding: '2rem 1.75rem', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>
              {(AVATARS[pinFor.avatar as AvatarKey] ?? AVATARS.sun).emoji}
            </div>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.15rem', fontWeight: 600, color: C.ink, margin: '0 0 1.1rem' }}>
              {overrideMode ? `Parent unlock for ${pinFor.displayName}` : `${pinFor.displayName}'s PIN`}
            </h2>

            {overrideMode ? (
              <input
                type="password"
                placeholder="Parent PIN or password"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitPin()}
                autoFocus
                style={{
                  width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10, boxSizing: 'border-box',
                  border: '1px solid rgba(201,169,110,0.45)', fontFamily: 'Lato, sans-serif',
                  fontSize: '0.9rem', textAlign: 'center', outline: 'none',
                }}
              />
            ) : (
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="• • • •"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && submitPin()}
                autoFocus
                disabled={locked}
                style={{
                  width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10, boxSizing: 'border-box',
                  border: '1px solid rgba(201,169,110,0.45)', fontFamily: 'Lato, sans-serif',
                  fontSize: '1.4rem', letterSpacing: '0.6em', textAlign: 'center', outline: 'none',
                }}
              />
            )}

            {error && <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.78rem', color: '#A4442E', margin: '0.8rem 0 0' }}>{error}</p>}

            <button
              onClick={submitPin}
              disabled={pending || (!overrideMode && (locked || pin.length < 4))}
              style={{
                width: '100%', marginTop: '1.1rem', padding: '0.75rem', borderRadius: 12, border: 'none',
                background: pending || (!overrideMode && (locked || pin.length < 4)) ? 'rgba(201,169,110,0.4)' : C.gold,
                color: '#FFF', fontFamily: 'Lato, sans-serif', fontSize: '0.8rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              {pending ? '…' : overrideMode ? 'Unlock' : 'Enter'}
            </button>

            <button
              onClick={() => { setOverrideMode(!overrideMode); setError(null); setPin(''); setCredential(''); }}
              style={{ marginTop: '0.9rem', background: 'none', border: 'none', color: C.muted, fontFamily: 'Lato, sans-serif', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {overrideMode ? 'Back to child PIN' : "I'm a parent — unlock without the PIN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
