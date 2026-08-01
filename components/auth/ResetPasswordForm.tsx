'use client';
/**
 * Step two of account recovery: the page the emailed link lands on.
 *
 * The token arrives as `?token=…` because Better Auth's callback endpoint
 * validated it first and forwarded here; a dead or tampered link arrives as
 * `?error=INVALID_TOKEN` instead, which is why both are read before anything
 * else is rendered.
 */
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

const C = {
  gold: '#C9A96E',
  ivory: '#F5F0E7',
  ink: '#241A0C',
  brown: '#5C4A2A',
  muted: '#8B7355',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  borderRadius: 10,
  border: `1px solid rgba(201,169,110,0.45)`,
  background: '#FFFDF9',
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.9rem',
  color: C.ink,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.62rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: C.muted,
  margin: '0 0 0.35rem',
};

const bodyStyle: React.CSSProperties = {
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.85rem',
  lineHeight: 1.7,
  color: C.brown,
  textAlign: 'center',
  margin: '0 0 1.5rem',
};

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const linkError = searchParams.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const linkIsDead = !token || !!linkError;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending || !token) return;
    setError(null);
    if (password !== confirm) {
      setError('Those two passwords do not match.');
      return;
    }
    setPending(true);

    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);

    if (result.error) {
      setError(result.error.message || 'That link is no longer valid. Please request a new one.');
      return;
    }
    // Resetting does not sign the guardian in — send them through the front
    // door with their new password.
    setDone(true);
    router.push('/login');
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.ivory,
      backgroundImage: 'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(100,75,45,0.04) 0%, transparent 45%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'rgba(255,248,238,0.85)',
        borderRadius: 18,
        border: `1px solid rgba(201,169,110,0.3)`,
        boxShadow: '0 8px 40px rgba(100,80,40,0.12)',
        padding: '2.5rem 2rem',
      }}>
        <p style={{
          fontFamily: 'Lato, sans-serif',
          fontSize: '0.6rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: C.gold,
          textAlign: 'center',
          margin: '0 0 0.5rem',
        }}>
          Maison d&apos;Oré
        </p>
        <h1 style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '1.7rem',
          fontWeight: 600,
          color: C.ink,
          textAlign: 'center',
          margin: '0 0 1.25rem',
        }}>
          {linkIsDead ? 'This link has expired' : done ? 'Password changed' : 'Choose a new password'}
        </h1>

        {linkIsDead ? (
          <>
            <p style={bodyStyle}>
              Reset links last an hour and work once. Ask for a fresh one and it will be with you in a moment.
            </p>
            <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.8rem', color: C.muted, textAlign: 'center', margin: 0 }}>
              <a href="/forgot-password" style={{ color: C.gold }}>Send a new link</a>
            </p>
          </>
        ) : done ? (
          <p style={bodyStyle}>Taking you to the log-in page…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="password" style={labelStyle}>New password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="confirm" style={labelStyle}>Repeat it</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{
                fontFamily: 'Lato, sans-serif',
                fontSize: '0.8rem',
                color: '#A4442E',
                margin: '0 0 1rem',
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: 12,
                border: 'none',
                background: pending ? 'rgba(201,169,110,0.5)' : C.gold,
                color: '#FFF',
                fontFamily: 'Lato, sans-serif',
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: pending ? 'default' : 'pointer',
              }}
            >
              {pending ? 'One moment…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
