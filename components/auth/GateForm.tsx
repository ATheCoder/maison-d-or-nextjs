'use client';
/**
 * The grown-up gate (auth-plan §4): a child-mode session must present the
 * guardian PIN or password before parent surfaces open. Passing the gate
 * clears child mode server-side, then continues to `next`.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { passGrownUpGate } from '@/app/profiles/actions';

export default function GateForm({ next }: { next: string }) {
  const router = useRouter();
  const [credential, setCredential] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (pending || !credential) return;
    setPending(true);
    setError(null);
    const res = await passGrownUpGate(credential);
    if (!res.ok) {
      setPending(false);
      setCredential('');
      setError(res.error ?? 'That PIN or password is incorrect.');
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F5F0E7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem', fontFamily: 'Lato, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 360, textAlign: 'center',
        background: 'rgba(255,248,238,0.85)', borderRadius: 18,
        border: '1px solid rgba(201,169,110,0.3)',
        boxShadow: '0 8px 40px rgba(100,80,40,0.12)',
        padding: '2.5rem 2rem',
      }}>
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
          style={{
            width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10, boxSizing: 'border-box',
            border: '1px solid rgba(201,169,110,0.45)', background: '#FFFDF9',
            fontSize: '0.9rem', textAlign: 'center', outline: 'none',
          }}
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
    </div>
  );
}
