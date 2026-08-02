'use client';
/**
 * The grown-up gate (auth-plan §4): a child-mode session must present the
 * guardian PIN or password before parent surfaces open. Passing the gate
 * clears child mode server-side, then continues to `next`.
 *
 * A guardian who has no gate PIN can only ever have typed their full password
 * here — on a tablet, standing next to a child, on every trip through the gate.
 * So the gate offers to fix that at the one moment it is obviously worth
 * fixing, and only then: `hasPin` comes back from the pass itself, so a guardian
 * who already has a PIN never sees any of this, and Skip is a real answer.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { passGrownUpGate } from '@/app/profiles/actions';
import { setGuardianPin } from '@/app/(dg)/family/actions';
import StudyOpeningCurtain from '@/components/auth/StudyOpeningCurtain';

const shell: React.CSSProperties = {
  minHeight: '100vh', background: '#F5F0E7',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '2rem 1rem', fontFamily: 'Lato, sans-serif',
};

const card: React.CSSProperties = {
  width: '100%', maxWidth: 360, textAlign: 'center',
  background: 'rgba(255,248,238,0.85)', borderRadius: 18,
  border: '1px solid rgba(201,169,110,0.3)',
  boxShadow: '0 8px 40px rgba(100,80,40,0.12)',
  padding: '2.5rem 2rem',
};

const field: React.CSSProperties = {
  width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10, boxSizing: 'border-box',
  border: '1px solid rgba(201,169,110,0.45)', background: '#FFFDF9',
  fontSize: '0.9rem', textAlign: 'center', outline: 'none',
};

export default function GateForm({ next }: { next: string }) {
  const router = useRouter();
  const [credential, setCredential] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Set once the gate has been passed by a guardian with no PIN of their own.
  // Holding the password they just proved is what lets setGuardianPin — which
  // requires it — run without asking a second time.
  const [pinOffer, setPinOffer] = useState<{ password: string } | null>(null);
  const [newPin, setNewPin] = useState('');
  // The gate has been passed and the push to `next` is in flight. Raised only
  // after the credential comes back correct — a wrong PIN must not flash the
  // study at someone who isn't going in — and never lowered: the form unmounts
  // at the navigation commit and takes the curtain with it, handing the wait
  // to the destination's own loading skeleton (same contract as ProfilePicker's
  // sunrise).
  const [leaving, setLeaving] = useState(false);

  async function submit() {
    if (pending || !credential) return;
    setPending(true);
    setError(null);
    const res = await passGrownUpGate(credential);
    if (!res.ok) {
      setPending(false);
      setCredential('');
      setError(res.error);
      return;
    }
    if (!res.hasPin) {
      // A guardian with no PIN can only have passed with their password.
      setPending(false);
      setPinOffer({ password: credential });
      setCredential('');
      return;
    }
    // Push only — a router.refresh() here would re-fetch /gate while the push
    // is in flight and hang the navigation. It buys nothing either: passing
    // the gate purges the whole client router cache (setActiveProfile in
    // app/profiles/actions.ts), so the push re-renders everything, layouts
    // included, with child mode cleared.
    setLeaving(true);
    router.push(next);
  }

  async function savePin() {
    if (pending || !pinOffer || newPin.length !== 4) return;
    setPending(true);
    setError(null);
    const res = await setGuardianPin(newPin, pinOffer.password);
    if (!res.ok) {
      setPending(false);
      setNewPin('');
      setError(res.error ?? 'That PIN could not be saved.');
      return;
    }
    setLeaving(true);
    router.push(next);
  }

  // The gate is already passed at this point: child mode is cleared and `next`
  // is one press away either way. Nothing here is a condition of entry.
  if (pinOffer) {
    return (
      <div style={shell}>
        <div style={card}>
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🔑</div>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.3rem', fontWeight: 600, color: '#241A0C', margin: '0 0 0.5rem' }}>
            A shorter way in?
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#8B7355', margin: '0 0 1.4rem', lineHeight: 1.6 }}>
            Set a 4-digit PIN and you can pass this gate without typing your password
            in front of anyone. You can change or remove it any time on your family page.
          </p>

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="4 digits"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && savePin()}
            autoFocus
            style={field}
          />

          {error && <p style={{ fontSize: '0.78rem', color: '#A4442E', margin: '0.8rem 0 0' }}>{error}</p>}

          <button
            onClick={savePin}
            disabled={pending || newPin.length !== 4}
            style={{
              width: '100%', marginTop: '1.1rem', padding: '0.75rem', borderRadius: 12, border: 'none',
              background: pending || newPin.length !== 4 ? 'rgba(201,169,110,0.4)' : '#C9A96E',
              color: '#FFF', fontSize: '0.8rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: pending || newPin.length !== 4 ? 'default' : 'pointer',
            }}
          >
            {pending ? '…' : 'Save PIN'}
          </button>

          <button
            onClick={() => { setLeaving(true); router.push(next); }}
            disabled={pending || leaving}
            style={{
              display: 'inline-block', marginTop: '1rem', fontSize: '0.75rem', color: '#8B7355',
              background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer',
            }}
          >
            Skip
          </button>
        </div>
        {leaving && <StudyOpeningCurtain />}
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🗝️</div>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.4rem', fontWeight: 600, color: '#241A0C', margin: '0 0 0.5rem' }}>
          Grown-ups only
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#8B7355', margin: '0 0 1.5rem' }}>
          Enter your parent PIN or password to continue.
        </p>

        <input
          type="password"
          placeholder="Parent PIN or password"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoFocus
          style={field}
        />

        {error && <p style={{ fontSize: '0.78rem', color: '#A4442E', margin: '0.8rem 0 0' }}>{error}</p>}

        <button
          onClick={submit}
          disabled={pending || !credential}
          style={{
            width: '100%', marginTop: '1.1rem', padding: '0.75rem', borderRadius: 12, border: 'none',
            background: pending || !credential ? 'rgba(201,169,110,0.4)' : '#C9A96E',
            color: '#FFF', fontSize: '0.8rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {pending ? '…' : 'Continue'}
        </button>

        <a href="/profiles" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.72rem', color: '#8B7355' }}>
          Back to profiles
        </a>
      </div>
      {leaving && <StudyOpeningCurtain />}
    </div>
  );
}
