'use client';
import { authClient } from '@/lib/auth-client';

export default function SignOutButton() {
  return (
    <button
      // A full-page navigation, not router.push + router.refresh(): the pair
      // races (refresh re-fetches the current route while the push is in
      // flight and can hang it), but a plain push would leave the previous
      // account's rendered pages in the client cache, reachable with Back.
      // Leaving an identity is the one moment worth discarding all of it.
      onClick={async () => {
        await authClient.signOut();
        window.location.assign('/login');
      }}
      style={{
        padding: '0.5rem 1.1rem',
        borderRadius: 10,
        border: '1px solid rgba(201,169,110,0.5)',
        background: 'transparent',
        color: '#8B7355',
        fontFamily: 'Lato, sans-serif',
        fontSize: '0.75rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      Sign out
    </button>
  );
}
