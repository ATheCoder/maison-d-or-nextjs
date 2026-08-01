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
          {sent ? 'Check your email' : 'Forgot your password?'}
        </h1>

        {sent ? (
          <>
            <p style={{
              fontFamily: 'Lato, sans-serif',
              fontSize: '0.85rem',
              lineHeight: 1.7,
              color: C.brown,
              textAlign: 'center',
              margin: '0 0 1.5rem',
            }}>
              If an account exists for that address, a link to set a new password is on its way.
              It expires in an hour.
            </p>
            <p style={{
              fontFamily: 'Lato, sans-serif',
              fontSize: '0.8rem',
              color: C.muted,
              textAlign: 'center',
              margin: 0,
            }}>
              <a href="/login" style={{ color: C.gold }}>Back to log in</a>
            </p>
          </>
        ) : (
          <>
            <p style={{
              fontFamily: 'Lato, sans-serif',
              fontSize: '0.85rem',
              lineHeight: 1.7,
              color: C.brown,
              textAlign: 'center',
              margin: '0 0 1.5rem',
            }}>
              Tell us the address you signed up with and we&apos;ll send you a link to choose a new one.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="email" style={labelStyle}>Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
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
                {pending ? 'One moment…' : 'Send the link'}
              </button>
            </form>

            <p style={{
              fontFamily: 'Lato, sans-serif',
              fontSize: '0.8rem',
              color: C.brown,
              textAlign: 'center',
              margin: '1.5rem 0 0',
            }}>
              Remembered it? <a href="/login" style={{ color: C.gold }}>Log in</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
