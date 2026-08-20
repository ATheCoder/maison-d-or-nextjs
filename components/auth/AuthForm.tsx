'use client';
/**
 * Shared login / signup form (docs/auth-plan.md §6). Signup always creates a
 * guardian — the role field is server-controlled and not part of this form.
 * Errors stay generic on login so accounts can't be enumerated.
 *
 * Dressed in components/ds, like everything else in the house. It used to be
 * dressed in components/maison/guardianSurface — a second set of primitives
 * with its own palette, field and button, kept deliberately theme-immune by
 * writing every colour out as a hex literal. The immunity now comes from
 * data-theme="parchment" on the route group's layout, so the tokens can be
 * the tokens and there is one design system again.
 */
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button, Card, Eyebrow, Field, Heading, Prose, Rule, TextLink } from '@/components/ds';

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
    <div className="front-door front-door-photo">
      <Card
        tone="glass"
        elevation="modal"
        radius="lg"
        padding="none"
        className="w-full max-w-100 front-door-card px-9 py-11"
      >
        {/* Signup used to open with a Great Vibes flourish — "Welcome to", in
            script, over the wordmark — echoing the homepage hero. It is gone:
            §2.1 admits no third face, and that one line was the only thing on
            the migrated front door still asking for the legacy font stack.
            Both doors now open on the same eyebrow, which is what they always
            should have done — the difference between arriving and returning is
            the heading's words, not a different typeface. */}
        <Eyebrow rule={false} className="text-center">Maison d&apos;Oré</Eyebrow>
        <Heading
          level={1}
          variant="section"
          className="mt-4 text-center"
          // Signup carries a tagline underneath, so the heading closes up and
          // the block as a whole keeps the same air above the form.
          style={{ marginBottom: isSignup ? '0.7rem' : '1.6rem' }}
        >
          {isSignup ? <>Maison d&apos;Oré</> : 'Welcome back'}
        </Heading>
        {isSignup && (
          <>
            <Prose measure={false} className="text-center font-display italic">
              For the things worth making time for.
            </Prose>
            <Prose variant="caption" measure={false} className="mt-3 mb-7 text-center">
              Recipes, places, ideas and little rituals for making more of everyday life.
            </Prose>
          </>
        )}
        <Rule variant="accent" className="mb-7" />

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <Field
              id="name"
              label="Your name"
              className="mb-4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
            />
          )}
          <Field
            id="email"
            label="Email"
            type="email"
            className="mb-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Field
            id="password"
            label="Password"
            type="password"
            className="mb-6"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />
          {!isSignup && (
            // Quiet on purpose: the way out for the one guardian who needs
            // it, not a second call to action competing with Log in.
            <p className="-mt-4 mb-6 text-right">
              <TextLink href="/forgot-password" className="type-caption">Forgot password?</TextLink>
            </p>
          )}

          {/* role="alert" because this arrives in answer to a submit the
              person just made; the field-level errors get theirs from Field. */}
          {error && (
            <Prose variant="caption" tone="none" measure={false} role="alert" className="mb-4 text-danger-readable">
              {error}
            </Prose>
          )}

          <Button type="submit" loading={pending} className="w-full">
            {pending ? 'One moment…' : isSignup ? 'Create an account' : 'Log in'}
          </Button>
        </form>

        <Prose variant="caption" measure={false} className="mt-6 text-center">
          {isSignup ? (
            <>Already part of Maison d&apos;Oré? <TextLink href="/login">Log in</TextLink></>
          ) : (
            <>New to Maison d&apos;Oré? <TextLink href="/signup">Create an account</TextLink></>
          )}
        </Prose>
      </Card>
    </div>
  );
}
