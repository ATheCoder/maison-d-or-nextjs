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
  const [email, setEmail] = useState('');
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

    // Admins land on /admin, guardians on the profile picker. `next` wins
    // when present (e.g. an invite link).
    // Push only — a router.refresh() here would re-fetch /login while the push
    // is in flight and hang the navigation. Every landing route reads the
    // session, so it is dynamic and never served from the client cache.
    const role = 'user' in result.data ? (result.data.user as { role?: string }).role : undefined;
    const next = searchParams.get('next');
    router.push(next || (role === 'admin' ? '/admin' : '/profiles'));
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
