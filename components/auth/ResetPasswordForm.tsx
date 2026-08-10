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
import {
  shellStyle,
  cardStyle,
  eyebrowStyle,
  titleStyle,
  bodyStyle,
  ruleStyle,
  labelStyle,
  errorStyle,
  footerStyle,
} from './authCardStyles';

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
    <div style={shellStyle}>
      <div style={cardStyle}>
        <p style={eyebrowStyle}>Maison d&apos;Oré</p>
        <h1 style={titleStyle}>
          {linkIsDead ? 'This link has expired' : done ? 'Password changed' : 'Choose a new password'}
        </h1>
        <hr style={ruleStyle} />

        {linkIsDead ? (
          <>
            <p style={bodyStyle}>
              Reset links last an hour and work once. Ask for a fresh one and it will be with you in a moment.
            </p>
            <p style={{ ...footerStyle, margin: 0 }}>
              <a href="/forgot-password" className="mdo-auth-link">Send a new link</a>
            </p>
          </>
        ) : done ? (
          <p style={{ ...bodyStyle, margin: 0 }}>Taking you to the log-in page…</p>
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
                className="mdo-auth-field"
              />
            </div>
            <div style={{ marginBottom: '1.6rem' }}>
              <label htmlFor="confirm" style={labelStyle}>Repeat it</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="mdo-auth-field"
              />
            </div>

            {error && <p style={errorStyle}>{error}</p>}

            <button type="submit" disabled={pending} className="mdo-auth-submit">
              {pending ? 'One moment…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
