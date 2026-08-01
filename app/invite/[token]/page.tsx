import { getInviteByToken } from '@/app/(dg)/family/actions';
import { getSession } from '@/lib/dal';
import InviteAcceptButton from '@/components/auth/InviteAcceptButton';

export const metadata = { title: 'Family invite — Maison d\'Oré' };
export const dynamic = 'force-dynamic';

const shell: React.CSSProperties = {
  minHeight: '100vh',
  background: '#F5F0E7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
  fontFamily: 'Lato, sans-serif',
};

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 440,
  background: 'rgba(255,248,238,0.85)',
  borderRadius: 18,
  border: '1px solid rgba(201,169,110,0.3)',
  boxShadow: '0 8px 40px rgba(100,80,40,0.12)',
  padding: '2.5rem 2rem',
  textAlign: 'center' as const,
};

const linkButton: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.75rem 1.6rem',
  borderRadius: 12,
  background: '#C9A96E',
  color: '#FFF',
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  textDecoration: 'none',
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, session] = await Promise.all([getInviteByToken(token), getSession()]);

  if (!invite) {
    return (
      <div style={shell}>
        <div style={card}>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.5rem', fontWeight: 600, color: '#241A0C', margin: '0 0 0.75rem' }}>
            This invite is no longer valid
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#8B7355', margin: 0 }}>
            The link may have expired or been revoked. Ask the person who invited you to send a new one.
          </p>
        </div>
      </div>
    );
  }

  const next = encodeURIComponent(`/invite/${token}`);

  return (
    <div style={shell}>
      <div style={card}>
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A96E', margin: '0 0 0.5rem' }}>
          Maison d&apos;Oré — Family invite
        </p>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.6rem', fontWeight: 600, color: '#241A0C', margin: '0 0 0.75rem' }}>
          You&apos;re invited to join {invite.familyName}
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#5C4A2A', margin: '0 0 1.75rem' }}>
          This invitation was sent to <strong>{invite.email}</strong>.
        </p>

        {session ? (
          <InviteAcceptButton token={token} />
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <a href={`/login?next=${next}`} style={linkButton}>Log in</a>
            <a href={`/signup?next=${next}`} style={{ ...linkButton, background: 'transparent', color: '#8B7355', border: '1px solid rgba(201,169,110,0.5)' }}>
              Sign up
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
