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
import { Button, Card, Eyebrow, Field, Heading, Prose, Rule, TextLink } from '@/components/ds';

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
    <div className="front-door">
      <Card
        tone="raised"
        elevation="card"
        radius="lg"
        padding="none"
        className="w-full max-w-100 front-door-card px-9 py-11"
      >
        <Eyebrow rule={false} className="text-center">Maison d&apos;Oré</Eyebrow>
        <Heading level={1} variant="section" className="mt-4 mb-6 text-center">
          {linkIsDead ? 'This link has expired' : done ? 'Password changed' : 'Choose a new password'}
        </Heading>
        <Rule variant="accent" className="mb-7" />

        {linkIsDead ? (
          <>
            <Prose variant="caption" measure={false} className="text-center">
              Reset links last an hour and work once. Ask for a fresh one and it will be with you in a moment.
            </Prose>
            <Prose variant="caption" measure={false} className="mt-6 text-center">
              <TextLink href="/forgot-password">Send a new link</TextLink>
            </Prose>
          </>
        ) : done ? (
          <Prose variant="caption" measure={false} className="text-center">Taking you to the log-in page…</Prose>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field
              id="password"
              label="New password"
              type="password"
              className="mb-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
            <Field
              id="confirm"
              label="Repeat it"
              type="password"
              className="mb-6"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />

            {error && (
              <Prose variant="caption" tone="none" measure={false} role="alert" className="mb-4 text-danger-readable">
                {error}
              </Prose>
            )}

            <Button type="submit" loading={pending} className="w-full">
              {pending ? 'One moment…' : 'Save new password'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
