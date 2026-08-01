'use client';
/**
 * The /family management surface (auth-plan phase 2): rename the family,
 * see guardians, create/revoke co-guardian invites. Invite links are shown
 * once at creation (only the hash is stored) with a copy button.
 */
import { useState } from 'react';
import {
  getFamilyOverview,
  renameFamily,
  createInvite,
  revokeInvite,
  createChildProfile,
  updateChildProfile,
  deleteChildProfile,
  setChildPin,
  removeChildPin,
  setGuardianPin,
  setFamilyTimezone,
  type FamilyOverview,
} from '@/app/(dg)/family/actions';
import { AVATARS, type AvatarKey } from '@/lib/avatars';
import { ageOnDay, birthDateBounds, formatBirthDate, normalizeBirthDate } from '@/lib/child-birth-date';
import SignOutButton from '@/components/auth/SignOutButton';
import { authClient } from '@/lib/auth-client';

const C = {
  gold: '#C9A96E',
  ivory: '#F5F0E7',
  ink: '#241A0C',
  brown: '#5C4A2A',
  muted: '#8B7355',
};

/**
 * Every zone the runtime knows, with UTC guaranteed present: a family that has
 * never chosen one is stored as 'UTC', and a select must always be able to show
 * the value it already holds. Asking Intl beats shipping a list that would rot.
 */
const TIME_ZONES: string[] = (() => {
  const supported = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [];
  return Array.from(new Set(['UTC', ...supported]));
})();

const card: React.CSSProperties = {
  background: 'rgba(255,248,238,0.8)',
  border: '1px solid rgba(201,169,110,0.25)',
  borderRadius: 14,
  padding: '1.5rem',
  marginBottom: '1.25rem',
};

const h2: React.CSSProperties = {
  fontFamily: '"Playfair Display", Georgia, serif',
  fontSize: '1.1rem',
  fontWeight: 600,
  color: C.ink,
  margin: '0 0 1rem',
};

const input: React.CSSProperties = {
  padding: '0.6rem 0.8rem',
  borderRadius: 10,
  border: '1px solid rgba(201,169,110,0.45)',
  background: '#FFFDF9',
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.85rem',
  color: C.ink,
  outline: 'none',
};

const buttonGold: React.CSSProperties = {
  padding: '0.6rem 1.2rem',
  borderRadius: 10,
  border: 'none',
  background: C.gold,
  color: '#FFF',
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

function ChildrenSection({ overview, refresh }: { overview: FamilyOverview; refresh: () => Promise<void> }) {
  const bounds = birthDateBounds();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatar, setAvatar] = useState<AvatarKey>('sun');
  const [pinEditFor, setPinEditFor] = useState<string | null>(null);
  const [pinDraft, setPinDraft] = useState('');
  const [dobEditFor, setDobEditFor] = useState<string | null>(null);
  const [dobDraft, setDobDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // The client half of the same rule the action enforces — it decides whether
  // Add is offered, never whether the write is allowed.
  const born = normalizeBirthDate(birthDate);
  const canAdd = name.trim() !== '' && born.ok;

  // Guardian gate PIN
  const [gatePin, setGatePin] = useState('');
  const [gatePassword, setGatePassword] = useState('');
  const [gateMsg, setGateMsg] = useState<string | null>(null);

  async function addChild() {
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await createChildProfile({ displayName: name, birthDate, avatar });
    setPending(false);
    if (!res.ok) { setError(res.error ?? null); return; }
    setName('');
    setBirthDate('');
    await refresh();
  }

  /**
   * Correct a birthday after the fact. Profiles created before birthdays were
   * collected were backfilled to 1 January of the year on file, so this is the
   * one door that fixes them — it sends the name and avatar back unchanged,
   * because updateChildProfile validates the whole profile at once.
   */
  async function saveBirthday(child: FamilyOverview['children'][number]) {
    const res = await updateChildProfile(child.id, {
      displayName: child.displayName,
      birthDate: dobDraft,
      avatar: child.avatar,
    });
    if (!res.ok) { setError(res.error ?? null); return; }
    setError(null);
    setDobEditFor(null);
    setDobDraft('');
    await refresh();
  }

  async function savePin(profileId: string) {
    const res = await setChildPin(profileId, pinDraft);
    if (!res.ok) { setError(res.error ?? null); return; }
    setError(null);
    setPinEditFor(null);
    setPinDraft('');
    await refresh();
  }

  async function saveGatePin() {
    setGateMsg(null);
    const res = await setGuardianPin(gatePin, gatePassword);
    setGateMsg(res.ok ? 'Parent PIN saved.' : res.error ?? null);
    if (res.ok) { setGatePin(''); setGatePassword(''); await refresh(); }
  }

  return (
    <>
      <section style={card}>
        <h2 style={h2}>Children</h2>

        {overview.children.map((c) => {
          const a = AVATARS[c.avatar as AvatarKey] ?? AVATARS.sun;
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderBottom: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                {a.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.88rem', color: C.ink }}>{c.displayName}</span>
                <span style={{ fontSize: '0.72rem', color: C.muted, marginLeft: 8 }}>
                  age {ageOnDay(c.birthDate) ?? '—'} · born {formatBirthDate(c.birthDate) ?? 'unknown'}
                  {c.hasPin ? ' · PIN set 🔒' : ''}
                </span>
              </div>
              {dobEditFor === c.id ? (
                <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="date" value={dobDraft} min={bounds.min} max={bounds.max}
                    onChange={(e) => setDobDraft(e.target.value)}
                    style={{ ...input, width: 150 }}
                    autoFocus
                  />
                  <button onClick={() => saveBirthday(c)} style={{ ...buttonGold, padding: '0.45rem 0.8rem' }}>Save</button>
                  <button onClick={() => { setDobEditFor(null); setDobDraft(''); }} style={smallLink}>Cancel</button>
                </span>
              ) : pinEditFor === c.id ? (
                <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="password" inputMode="numeric" maxLength={4} placeholder="4 digits"
                    value={pinDraft}
                    onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))}
                    style={{ ...input, width: 90, textAlign: 'center' }}
                    autoFocus
                  />
                  <button onClick={() => savePin(c.id)} style={{ ...buttonGold, padding: '0.45rem 0.8rem' }}>Save</button>
                  <button onClick={() => { setPinEditFor(null); setPinDraft(''); }} style={smallLink}>Cancel</button>
                </span>
              ) : (
                <span style={{ display: 'flex', gap: '0.7rem' }}>
                  <button onClick={() => { setDobEditFor(c.id); setDobDraft(c.birthDate); }} style={smallLink}>
                    Birthday
                  </button>
                  <button onClick={() => { setPinEditFor(c.id); setPinDraft(''); }} style={smallLink}>
                    {c.hasPin ? 'Change PIN' : 'Set PIN'}
                  </button>
                  {c.hasPin && (
                    <button onClick={async () => { await removeChildPin(c.id); await refresh(); }} style={smallLink}>
                      Remove PIN
                    </button>
                  )}
                  <button
                    onClick={async () => { if (confirm(`Delete ${c.displayName}'s profile?`)) { await deleteChildProfile(c.id); await refresh(); } }}
                    style={{ ...smallLink, color: '#A4442E' }}
                  >
                    Delete
                  </button>
                </span>
              )}
            </div>
          );
        })}

        {/* Add child */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <input placeholder="Child's name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} style={{ ...input, flex: 1 }} />
            <input
              type="date" value={birthDate} min={bounds.min} max={bounds.max}
              onChange={(e) => setBirthDate(e.target.value)}
              style={{ ...input, width: 150 }}
              aria-label="Date of birth"
              title="Date of birth"
            />
            <button
              onClick={addChild}
              disabled={pending || !canAdd}
              style={{ ...buttonGold, opacity: pending || !canAdd ? 0.5 : 1, cursor: pending || !canAdd ? 'default' : 'pointer' }}
            >
              Add
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {(Object.keys(AVATARS) as AvatarKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setAvatar(k)}
                style={{
                  width: 36, height: 36, borderRadius: '50%', fontSize: '1.05rem', cursor: 'pointer',
                  background: AVATARS[k].bg,
                  border: avatar === k ? `2.5px solid ${C.gold}` : '2.5px solid transparent',
                }}
              >
                {AVATARS[k].emoji}
              </button>
            ))}
          </div>
          {birthDate !== '' && !born.ok && (
            <p style={{ fontSize: '0.78rem', color: '#A4442E', margin: '0.6rem 0 0' }}>{born.error}</p>
          )}
          {error && <p style={{ fontSize: '0.78rem', color: '#A4442E', margin: '0.6rem 0 0' }}>{error}</p>}
        </div>
      </section>

      {/* Guardian gate PIN */}
      <section style={card}>
        <h2 style={h2}>Your parent PIN</h2>
        <p style={{ fontSize: '0.78rem', color: C.muted, margin: '0 0 0.8rem' }}>
          {overview.guardianHasPin
            ? 'Used at the grown-ups gate and to unlock child profiles. Enter your password to change it.'
            : 'A quick 4-digit code for the grown-ups gate, instead of typing your password on a shared device.'}
        </p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <input
            type="password" inputMode="numeric" maxLength={4} placeholder="New PIN"
            value={gatePin} onChange={(e) => setGatePin(e.target.value.replace(/\D/g, ''))}
            style={{ ...input, width: 100, textAlign: 'center' }}
          />
          <input
            type="password" placeholder="Your password"
            value={gatePassword} onChange={(e) => setGatePassword(e.target.value)}
            style={{ ...input, flex: 1 }}
          />
          <button onClick={saveGatePin} style={buttonGold}>Save</button>
        </div>
        {gateMsg && (
          <p style={{ fontSize: '0.78rem', color: gateMsg === 'Parent PIN saved.' ? '#5C7A4A' : '#A4442E', margin: '0.6rem 0 0' }}>
            {gateMsg}
          </p>
        )}
      </section>
    </>
  );
}

const smallLink: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#8B7355',
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.72rem',
  cursor: 'pointer',
  textDecoration: 'underline',
  padding: 0,
};

/**
 * The verify-your-email nag (auth-plan §9.4). Deliberately a note and not a
 * gate: nothing in the app waits on a confirmed address, so this asks once,
 * closes on request, and never comes back in this session. The reason it is
 * worth asking at all is password recovery — an unconfirmed address is a
 * family whose history no one can get back into.
 */
function VerifyEmailNote({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  if (dismissed) return null;

  async function resend() {
    if (state === 'sending') return;
    setState('sending');
    const res = await authClient.sendVerificationEmail({ email, callbackURL: '/family' });
    setState(res.error ? 'failed' : 'sent');
  }

  return (
    <div style={{
      background: 'rgba(201,169,110,0.12)',
      border: '1px dashed rgba(201,169,110,0.5)',
      borderRadius: 12,
      padding: '0.9rem 1rem',
      marginBottom: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.9rem',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '1.1rem' }}>✉️</span>
      <p style={{ flex: 1, minWidth: 200, fontSize: '0.8rem', lineHeight: 1.6, color: C.brown, margin: 0 }}>
        {state === 'sent'
          ? <>A fresh confirmation link is on its way to <strong>{email}</strong>.</>
          : state === 'failed'
            ? 'We could not send that just now — please try again in a moment.'
            : <>Confirm <strong>{email}</strong> so you can recover your account if you ever forget your password.</>}
      </p>
      {state !== 'sent' && (
        <button onClick={resend} style={{ ...buttonGold, padding: '0.45rem 0.9rem' }}>
          {state === 'sending' ? 'Sending…' : 'Resend'}
        </button>
      )}
      <button onClick={() => setDismissed(true)} style={smallLink} aria-label="Dismiss">Not now</button>
    </div>
  );
}

export default function FamilyManager({ initialOverview }: { initialOverview: FamilyOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [nameDraft, setNameDraft] = useState(initialOverview.name);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newInvite, setNewInvite] = useState<{ url: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // The caller's own address, as the overview already reports it — the resend
  // endpoint needs an address, and this is the one the session belongs to.
  const selfEmail = overview.members.find((m) => m.isSelf)?.email ?? '';

  const refresh = async () => setOverview(await getFamilyOverview());

  async function handleRename() {
    if (nameDraft.trim() === overview.name) return;
    const res = await renameFamily(nameDraft);
    if (!res.ok) setError(res.error ?? null);
    else { setError(null); await refresh(); }
  }

  async function handleTimezone(zone: string) {
    if (zone === overview.timezone) return;
    const res = await setFamilyTimezone(zone);
    if (!res.ok) setError(res.error ?? null);
    else { setError(null); await refresh(); }
  }

  async function handleInvite() {
    if (pending) return;
    setPending(true);
    setError(null);
    setNewInvite(null);
    setCopied(false);
    const res = await createInvite(inviteEmail);
    setPending(false);
    if (!res.ok) { setError(res.error); return; }
    setNewInvite({ url: res.url, email: res.email });
    setInviteEmail('');
    await refresh();
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.ivory,
      padding: '3rem clamp(1.5rem, 5vw, 4rem)',
      fontFamily: 'Lato, sans-serif',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.gold, margin: '0 0 0.4rem' }}>
              Maison d&apos;Oré — Your family
            </p>
            <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.9rem', fontWeight: 600, color: C.ink, margin: 0 }}>
              {overview.name}
            </h1>
          </div>
          <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <a href="/profiles" style={{ fontSize: '0.75rem', color: C.muted, textDecoration: 'underline' }}>Profiles</a>
            <SignOutButton />
          </span>
        </div>

        {!overview.emailVerified && selfEmail && <VerifyEmailNote email={selfEmail} />}

        {/* Family name */}
        <section style={card}>
          <h2 style={h2}>Family name</h2>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={80}
              style={{ ...input, flex: 1 }}
            />
            <button onClick={handleRename} style={buttonGold}>Save</button>
          </div>
        </section>

        {/* Timezone */}
        <section style={card}>
          <h2 style={h2}>Timezone</h2>
          <p style={{ fontSize: '0.8rem', color: C.muted, margin: '0 0 0.9rem', lineHeight: 1.6 }}>
            Where your days begin and end. Today&apos;s reading is counted in this zone on the
            Parent Observatory and on your child&apos;s own For Parents card.
          </p>
          <select
            value={overview.timezone}
            onChange={(e) => handleTimezone(e.target.value)}
            style={{ ...input, width: '100%', maxWidth: 340 }}
          >
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </section>

        {/* Children */}
        <ChildrenSection overview={overview} refresh={refresh} />

        {/* Guardians */}
        <section style={card}>
          <h2 style={h2}>Parents & guardians</h2>
          {overview.members.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(201,169,110,0.15)' }}>
              <span style={{ fontSize: '0.88rem', color: C.ink }}>
                {m.name}{m.isSelf ? ' (you)' : ''}
              </span>
              <span style={{ fontSize: '0.8rem', color: C.muted }}>{m.email}</span>
            </div>
          ))}
        </section>

        {/* Invites */}
        <section style={card}>
          <h2 style={h2}>Invite a co-guardian</h2>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.9rem' }}>
            <input
              type="email"
              placeholder="their@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ ...input, flex: 1 }}
            />
            <button onClick={handleInvite} disabled={pending} style={{ ...buttonGold, opacity: pending ? 0.6 : 1 }}>
              {pending ? '…' : 'Invite'}
            </button>
          </div>

          {error && <p style={{ fontSize: '0.8rem', color: '#A4442E', margin: '0 0 0.75rem' }}>{error}</p>}

          {newInvite && (
            <div style={{
              background: 'rgba(201,169,110,0.12)',
              border: '1px dashed rgba(201,169,110,0.5)',
              borderRadius: 10,
              padding: '0.9rem 1rem',
              marginBottom: '0.9rem',
            }}>
              <p style={{ fontSize: '0.78rem', color: C.brown, margin: '0 0 0.5rem' }}>
                Share this link with <strong>{newInvite.email}</strong> — it is shown only once and expires in 7 days:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code style={{ fontSize: '0.72rem', color: C.ink, wordBreak: 'break-all', flex: 1 }}>{newInvite.url}</code>
                <button
                  onClick={async () => { await navigator.clipboard.writeText(newInvite.url); setCopied(true); }}
                  style={{ ...buttonGold, padding: '0.4rem 0.8rem' }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {overview.invites.length > 0 && (
            <>
              <p style={{ fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, margin: '0 0 0.4rem' }}>
                Pending invites
              </p>
              {overview.invites.map((inv) => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px solid rgba(201,169,110,0.15)' }}>
                  <span style={{ fontSize: '0.85rem', color: C.ink }}>{inv.email}</span>
                  <span style={{ fontSize: '0.72rem', color: C.muted }}>
                    expires {new Date(inv.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    <button
                      onClick={async () => { await revokeInvite(inv.id); await refresh(); }}
                      style={{ marginLeft: 12, background: 'none', border: 'none', color: '#A4442E', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Revoke
                    </button>
                  </span>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
