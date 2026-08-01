'use client';
/**
 * Shared login / signup form (docs/auth-plan.md §6). Signup always creates a
 * guardian — the role field is server-controlled and not part of this form.
 * Errors stay generic on login so accounts can't be enumerated.
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

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  // An invite link carries the address it was sent to (`?email=`), so the
  // invitee does not have to re-type the one address their invite is bound to.
  // Prefill only — the field stays editable, because the person following the
  // link may well want a different account, and acceptInvite checks the address
  // properly on the server either way.
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignup = mode === 'signup';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);

    const result = isSignup
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setPending(false);
      setError(
        isSignup
          ? result.error.message || 'Could not create the account.'
          : 'Invalid email or password.',
      );
      return;
    }

    // Admins land on /admin, returning guardians on the profile picker, and
    // `next` wins for both — it is how a protected page a visitor was bounced
    // off gets handed back to them.
    //
    // Signup is the exception. A brand-new family has no readers, so every
    // destination in the app is an empty room until the /welcome wizard has run;
    // honouring `next` there would strand the account on a page that cannot
    // work yet (the signed-out edition's own CTA carries exactly such a `next`).
    // The one `next` worth keeping is an invite, because accepting one *is* the
    // setup — it moves the account into a family that already has readers, and
    // /welcome would only bounce it back out again.
    //
    // Push only — a router.refresh() here would re-fetch /login while the push
    // is in flight and hang the navigation. Every landing route reads the
    // session, so it is dynamic and never served from the client cache.
    const role = 'user' in result.data ? (result.data.user as { role?: string }).role : undefined;
    const next = searchParams.get('next');
    if (isSignup && role !== 'admin') {
      router.push(next?.startsWith('/invite/') ? next : '/welcome');
      return;
    }
    router.push(next || (role === 'admin' ? '/admin' : '/profiles'));
  }

  return (
    <div style={{
      minHeight: '100vh',
      // Ivory stays as the paint under the photo: it is what shows if the
      // image 404s, and it matches the wall closely enough that the failure
      // is invisible rather than a white flash.
      background: C.ivory,
      // Vignette sits above the photo, settling the gilt frames at the edges
      // so they frame the card instead of pulling the eye outward.
      backgroundImage: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(120,95,55,0.10) 100%), url('/auth/maison-drawing-room.webp')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        // The wall behind the card reads ~#F3E7D0; this composites brighter
        // than that, so the card lifts off the photo instead of dissolving
        // into it. The shadow does the rest of the separating.
        background: 'rgba(255,250,242,0.82)',
        backdropFilter: 'blur(10px) saturate(1.08)',
        WebkitBackdropFilter: 'blur(10px) saturate(1.08)',
        borderRadius: 18,
        border: `1px solid rgba(201,169,110,0.42)`,
        boxShadow: '0 24px 60px rgba(92,72,38,0.20), 0 2px 10px rgba(92,72,38,0.08), inset 0 1px 0 rgba(255,255,255,0.55)',
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
          margin: '0 0 1.75rem',
        }}>
          {isSignup ? 'Create your family account' : 'Welcome back'}
        </h1>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="name" style={labelStyle}>Your name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                autoComplete="name"
                style={inputStyle}
              />
            </div>
          )}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              style={inputStyle}
            />
            {!isSignup && (
              // Quiet on purpose: the way out for the one guardian who needs
              // it, not a second call to action competing with Log in.
              <p style={{ margin: '0.5rem 0 0', textAlign: 'right' }}>
                <a
                  href="/forgot-password"
                  style={{
                    fontFamily: 'Lato, sans-serif',
                    fontSize: '0.72rem',
                    color: C.muted,
                    textDecoration: 'underline',
                  }}
                >
                  Forgot password?
                </a>
              </p>
            )}
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
            {pending ? 'One moment…' : isSignup ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <p style={{
          fontFamily: 'Lato, sans-serif',
          fontSize: '0.8rem',
          color: C.brown,
          textAlign: 'center',
          margin: '1.5rem 0 0',
        }}>
          {isSignup ? (
            <>Already have an account? <a href="/login" style={{ color: C.gold }}>Log in</a></>
          ) : (
            <>New to Maison d&apos;Oré? <a href="/signup" style={{ color: C.gold }}>Create an account</a></>
          )}
        </p>
      </div>
    </div>
  );
}
