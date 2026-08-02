import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';

/**
 * Suspense fallback for /invite/[token] — the invitation card before the
 * token has been looked up.
 *
 * Shell, card and the two button ghosts are copied literals from the page's
 * own `shell`/`card`/`linkButton` consts, per repo convention: a loading state
 * is shaped like the page it stands in for, and that shape belongs to the page.
 *
 * The one thing this screen can honestly say up front is what it is — the
 * eyebrow is the same static line the page renders, so an invitee knows they
 * have arrived somewhere expected while the token is still being checked.
 * Whether the invitation turns out to be valid is the page's news to break.
 *
 * The ghosts model the logged-out happy path (two-line title, one sub line,
 * the Log in / Sign up pair) because that is who follows an invite link. A
 * signed-in visitor gets a single accept button instead, and an expired token
 * gets neither — those hand-offs shift, and that is accepted: no one shape
 * can match all three, so the skeleton matches the common one.
 */
export default function Loading() {
  return (
    <SkeletonStatus
      label="Unsealing your invitation"
      style={{
        minHeight: '100vh',
        background: '#F5F0E7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        fontFamily: 'Lato, sans-serif',
        animation: 'mdoSkelFade 0.3s ease-out',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'rgba(255,248,238,0.85)',
        borderRadius: 18,
        border: '1px solid rgba(201,169,110,0.3)',
        boxShadow: '0 8px 40px rgba(100,80,40,0.12)',
        padding: '2.5rem 2rem',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase',
          color: '#C9A96E', margin: '0 0 0.5rem',
        }}>
          Maison d&apos;Oré — Family invite
        </p>

        {/* "You're invited to join {family}" — 1.6rem Playfair wraps to two
            ~31px lines for almost any family name at this card width. */}
        <SkeletonBar w="85%" h={28} style={{ margin: '0 auto 6px' }} />
        <SkeletonBar w="55%" h={28} style={{ margin: '0 auto 0.75rem' }} />

        {/* "This invitation was sent to …" — one 0.85rem line, lh 1.75 ≈ 24px */}
        <SkeletonBar w="60%" h={24} style={{ margin: '0 auto 1.75rem' }} />

        {/* Log in (solid gold) and Sign up (outlined) — the flex row stretches
            both to the bordered one's ~50px, and the widths are what the two
            uppercase labels actually set. */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <SkeletonBar w={112} h={50} radius={12} style={{ background: 'rgba(201,169,110,0.4)' }} />
          <SkeletonBar w={124} h={50} radius={12} style={{ background: 'transparent', border: '1px solid rgba(201,169,110,0.5)' }} />
        </div>
      </div>
    </SkeletonStatus>
  );
}
