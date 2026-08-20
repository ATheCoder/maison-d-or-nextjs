// @ts-nocheck — untyped .jsx from before checkJs was on; 5 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * The signed-out visitor's answer (onboarding plan WP-D).
 *
 * /daily-gold-edition is public, so a stranger can read the whole paper. What
 * they cannot do is keep any of it: saves and flags both resolve the child from
 * the session, and with no session there is nothing to resolve. Before this,
 * that showed as nothing at all — hearts were simply absent (the page passes
 * `savedKeys: null`) and flag earns returned a silent no-op. A tap that does
 * nothing reads as a broken page, not as a closed door.
 *
 * So this: one context, mounted by the edition only when there is no session,
 * that turns those dead ends into the same small invitation. Components ask
 * `signedOut` before doing the work, and call `invite()` instead — no server
 * round trip to discover what the page already knows.
 *
 * Outside the provider the hook returns an inert value, so /treasury,
 * /passport and the design-sync previews mount these components unchanged and
 * behave exactly as they did.
 */
import { createContext, useContext, useMemo, useState } from 'react';
import { Button } from '@/components/ds';

const SignupInviteContext = createContext(null);

/** Where every invitation leads — back here once the account exists. */
export const SIGNUP_HREF = '/signup?next=/daily-gold-edition';
// The returning family's door. No `next` round trip here on purpose: after
// login the picker asks "who's reading?", and the reader arrives back at the
// edition in child mode — landing a guardian straight on the edition would
// show the readerless, heartless view instead.
export const LOGIN_HREF = '/login';

const INERT = { signedOut: false, invite: () => {} };

/** @returns {{ signedOut: boolean, invite: (kind?: 'save' | 'flag') => void }} */
export function useSignupInvite() {
  return useContext(SignupInviteContext) ?? INERT;
}

const MESSAGES = {
  save: 'Treasures are kept in your family’s own collection.',
  flag: 'Flags are collected in your reader’s passport.',
};

function InviteToast({ message, onClose }) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
        transform: 'translateX(-50%)',
        // Above DGModal (2000): most hearts on the page are reached *inside* a
        // card's modal, so a toast below it would answer the tap invisibly.
        zIndex: 2500,
        maxWidth: 'min(92vw, 420px)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.9rem',
        padding: '0.85rem 1rem',
        borderRadius: 14,
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-accent)',
        boxShadow: 'var(--shadow-modal)',
        animation: 'dgFadeIn 0.3s ease-out',
      }}
    >
      <span className="type-body-ui" style={{ color: 'var(--text-primary)', flex: 1 }}>
        {message}
      </span>
      {/* The same correction as the CTA bar's pill (DGVisitorBanners): this
          was btn-primary hand-copied into inline styles, down to a raw
          --palette-* ink. It is a link — it navigates — so it keeps the <a>
          and wears the coat rather than an imitation of one. */}
      <Button variant="primary" href={SIGNUP_HREF} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
        Sign up
      </Button>
      <Button
        variant="bare"
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          flexShrink: 0, background: 'none', border: 'none',
          color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1, padding: '0.2rem',
        }}
      >
        ×
      </Button>
    </div>
  );
}

/** @param {{ signedOut?: boolean, children?: import('react').ReactNode }} props */
export function SignupInviteProvider({ signedOut = false, children }) {
  const [reason, setReason] = useState(null);

  const value = useMemo(() => ({
    signedOut,
    // Guarded here as well as at each call site: a component that forgets to
    // check can never pop a signup prompt at a signed-in reader.
    invite: (kind) => { if (signedOut) setReason(kind === 'flag' ? 'flag' : 'save'); },
  }), [signedOut]);

  return (
    <SignupInviteContext.Provider value={value}>
      {children}
      {reason && <InviteToast message={MESSAGES[reason]} onClose={() => setReason(null)} />}
    </SignupInviteContext.Provider>
  );
}
