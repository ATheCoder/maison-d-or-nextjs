'use client';
/**
 * Step one of account recovery (auth-plan §9.4): ask for an address, say
 * nothing about whether it exists.
 *
 * The success panel is shown for every accepted request — Better Auth answers
 * an unknown address with the same 200 and a padded delay, and this screen must
 * not undo that by rendering a different state for "no such account".
 */
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button, Card, Eyebrow, Field, Heading, Prose, Rule, TextLink } from '@/components/ds';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);

    // `redirectTo` is where the emailed link lands after the token is checked;
    // Better Auth's callback rejects a missing one, so it is not optional.
    const result = await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
    setPending(false);

    if (result.error) {
      // Not "no such account" — that comes back as a success. Only transport
      // or configuration failures reach here, so the copy stays neutral.
      setError('We could not send the email just now. Please try again in a moment.');
      return;
    }
    setSent(true);
  }

  // No photograph here: the drawing room is for the doors a visitor arrives
  // through. Recovery is a detour, and it stands on the flat wash.
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
          {sent ? 'Check your email' : 'Forgot your password?'}
        </Heading>
        <Rule variant="accent" className="mb-7" />

        {sent ? (
          <>
            <Prose variant="caption" measure={false} className="text-center">
              If an account exists for that address, a link to set a new password is on its way.
              It expires in an hour.
            </Prose>
            <Prose variant="caption" measure={false} className="mt-6 text-center">
              <TextLink href="/login">Back to log in</TextLink>
            </Prose>
          </>
        ) : (
          <>
            <Prose variant="caption" measure={false} className="mb-7 text-center">
              Tell us the address you signed up with and we&apos;ll send you a link to choose a new one.
            </Prose>

            <form onSubmit={handleSubmit}>
              <Field
                id="email"
                label="Email"
                type="email"
                className="mb-6"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />

              {error && (
                <Prose variant="caption" tone="none" measure={false} role="alert" className="mb-4 text-danger-readable">
                  {error}
                </Prose>
              )}

              <Button type="submit" loading={pending} className="w-full">
                {pending ? 'One moment…' : 'Send the link'}
              </Button>
            </form>

            <Prose variant="caption" measure={false} className="mt-6 text-center">
              Remembered it? <TextLink href="/login">Log in</TextLink>
            </Prose>
          </>
        )}
      </Card>
    </div>
  );
}
