'use client';
/**
 * Shared login / signup form (docs/auth-plan.md §6). Signup always creates a
 * guardian — the role field is server-controlled and not part of this form.
 * Errors stay generic on login so accounts can't be enumerated.
 */
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  photoShellStyle,
  cardStyle,
  glassCardStyle,
  eyebrowStyle,
  titleStyle,
  flourishStyle,
  leadStyle,
  bodyStyle,
  ruleStyle,
  labelStyle,
  errorStyle,
  footerStyle,
} from '@/components/maison/guardianSurface';

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
    <div style={photoShellStyle}>
      <div style={{ ...cardStyle, ...glassCardStyle }}>
        {/* Signup opens the way the homepage hero does — the script greeting,
            then the wordmark itself as the heading. Printing the eyebrow too
            would put the name of the house on the card twice, so on this one
            page the title stands in for it. Login, which is a return rather
            than an arrival, keeps the ordinary eyebrow. */}
        {isSignup ? (
          <p style={flourishStyle}>Welcome to</p>
        ) : (
          <p style={eyebrowStyle}>Maison d&apos;Oré</p>
        )}
        <h1 style={{
          ...titleStyle,
          // Signup carries a tagline underneath, so the heading closes up and
          // the block as a whole keeps the same air above the form.
          margin: isSignup ? '0 0 0.7rem' : '0 0 1.6rem',
        }}>
          {isSignup ? <>Maison d&apos;Oré</> : 'Welcome back'}
        </h1>
        {isSignup && (
          <>
            <p style={leadStyle}>For the things worth making time for.</p>
            <p style={bodyStyle}>
              Recipes, places, ideas and little rituals for making more of everyday life.
            </p>
          </>
        )}
        <hr style={ruleStyle} />

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
                className="mdo-guardian-field"
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
              className="mdo-guardian-field"
            />
          </div>
          <div style={{ marginBottom: '1.6rem' }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              className="mdo-guardian-field"
            />
            {!isSignup && (
              // Quiet on purpose: the way out for the one guardian who needs
              // it, not a second call to action competing with Log in.
              <p style={{ margin: '0.55rem 0 0', textAlign: 'right' }}>
                <a href="/forgot-password" className="mdo-guardian-quiet">Forgot password?</a>
              </p>
            )}
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" disabled={pending} className="mdo-guardian-submit">
            {pending ? 'One moment…' : isSignup ? 'Create an account' : 'Log in'}
          </button>
        </form>

        <p style={footerStyle}>
          {isSignup ? (
            <>Already part of Maison d&apos;Oré? <a href="/login" className="mdo-guardian-link">Log in</a></>
          ) : (
            <>New to Maison d&apos;Oré? <a href="/signup" className="mdo-guardian-link">Create an account</a></>
          )}
        </p>
      </div>
    </div>
  );
}
