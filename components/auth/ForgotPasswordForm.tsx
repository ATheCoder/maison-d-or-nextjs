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

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <p style={eyebrowStyle}>Maison d&apos;Oré</p>
        <h1 style={titleStyle}>
          {sent ? 'Check your email' : 'Forgot your password?'}
        </h1>
        <hr style={ruleStyle} />

        {sent ? (
          <>
            <p style={bodyStyle}>
              If an account exists for that address, a link to set a new password is on its way.
              It expires in an hour.
            </p>
            <p style={{ ...footerStyle, margin: 0 }}>
              <a href="/login" className="mdo-auth-link">Back to log in</a>
            </p>
          </>
        ) : (
          <>
            <p style={bodyStyle}>
              Tell us the address you signed up with and we&apos;ll send you a link to choose a new one.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.6rem' }}>
                <label htmlFor="email" style={labelStyle}>Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  className="mdo-auth-field"
                />
              </div>

              {error && <p style={errorStyle}>{error}</p>}

              <button type="submit" disabled={pending} className="mdo-auth-submit">
                {pending ? 'One moment…' : 'Send the link'}
              </button>
            </form>

            <p style={footerStyle}>
              Remembered it? <a href="/login" className="mdo-auth-link">Log in</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
