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
 * have arrived somewhere expected while the token is still being checked. The
 * wax seal is pressed and released for as long as the verification runs;
 * whether the invitation turns out to be valid is the page's news to break.
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
      {/* Local to this file — the seal is the only thing in the app that does
          this. `.mdo-anim` hands it to the shared reduced-motion block, which
          leaves the seal simply pressed and still. */}
      <style>{`
        @keyframes mdoSealPress {
          0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(100,80,40,0.18); }
          50% { transform: scale(0.94); box-shadow: 0 1px 4px rgba(100,80,40,0.10); }
        }
      `}</style>

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

        <div
          className="mdo-anim"
          aria-hidden="true"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #FAF7F2, #EDE0CC 55%, #D8CCBA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#C9A96E', fontSize: '1rem',
            margin: '0 auto 0.9rem',
            boxShadow: '0 2px 8px rgba(100,80,40,0.18)',
            animation: 'mdoSealPress 1.6s ease-in-out infinite',
          }}
        >
          ✦
        </div>

        <SkeletonBar w="80%" h={24} style={{ margin: '0 auto 0.75rem' }} />
        <SkeletonBar w="55%" h={12} style={{ margin: '0 auto 1.75rem' }} />

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <SkeletonBar w={110} h={40} radius={12} />
          <SkeletonBar w={110} h={40} radius={12} />
        </div>
      </div>
    </SkeletonStatus>
  );
}
