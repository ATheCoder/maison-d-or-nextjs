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
  type FamilyOverview,
} from '@/app/family/actions';
import SignOutButton from '@/components/auth/SignOutButton';

const C = {
  gold: '#C9A96E',
  ivory: '#F5F0E7',
  ink: '#241A0C',
  brown: '#5C4A2A',
  muted: '#8B7355',
};

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

export default function FamilyManager({ initialOverview }: { initialOverview: FamilyOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [nameDraft, setNameDraft] = useState(initialOverview.name);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newInvite, setNewInvite] = useState<{ url: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const refresh = async () => setOverview(await getFamilyOverview());

  async function handleRename() {
    if (nameDraft.trim() === overview.name) return;
    const res = await renameFamily(nameDraft);
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
          <SignOutButton />
        </div>

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
