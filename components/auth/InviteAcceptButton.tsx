'use client';
import { useState } from 'react';
import { acceptInviteAndGoToFamily } from '@/app/(dg)/family/actions';

export default function InviteAcceptButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div>
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          // Redirects to /family on success; only returns on failure.
          const res = await acceptInviteAndGoToFamily(token);
          if (res && !res.ok) { setError(res.error ?? 'Could not accept the invite.'); setPending(false); }
        }}
        style={{
          padding: '0.8rem 2rem',
          borderRadius: 12,
          border: 'none',
          background: pending ? 'rgba(201,169,110,0.5)' : '#C9A96E',
          color: '#FFF',
          fontFamily: 'Lato, sans-serif',
          fontSize: '0.85rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: pending ? 'default' : 'pointer',
        }}
      >
        {pending ? 'Joining…' : 'Join this family'}
      </button>
      {error && (
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.8rem', color: '#A4442E', margin: '0.9rem 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}
