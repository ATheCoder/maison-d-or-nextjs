'use client';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push('/login');
        router.refresh();
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
