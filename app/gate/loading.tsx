import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';

/**
 * Suspense fallback for /gate — GateForm's shell and card, drawn empty.
 *
 * Literals copied from GateForm rather than imported from it: the form is a
 * client component and its `shell`/`card`/`field` consts are private to it.
 * Same 360 card, same padding, same centred column, so the key and the prompt
 * land where their outlines were.
 *
 * This is a light route — requireGuardian() and a searchParams read, nothing
 * more — so in practice this usually flashes for well under 300ms. That is
 * exactly why it exists in this shape: with no fallback the router holds the
 * previous screen and a gate press feels unacknowledged, and with a hard-edged
 * one the flash reads as a glitch. The 0.3s fade makes the brief version soft
 * and the occasional slow version explicable.
 */
export default function Loading() {
  return (
    <SkeletonStatus
      label="Opening the grown-up gate"
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
        width: '100%', maxWidth: 360, textAlign: 'center',
        background: 'rgba(255,248,238,0.85)', borderRadius: 18,
        border: '1px solid rgba(201,169,110,0.3)',
        boxShadow: '0 8px 40px rgba(100,80,40,0.12)',
        padding: '2.5rem 2rem',
      }}>
        {/* The gate's own key, ringed in gold and breathing — a shimmer bar here
            would say "a picture is loading", which is not what is happening. */}
        <div
          className="mdo-anim"
          aria-hidden="true"
          style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '2px solid rgba(201,169,110,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', opacity: 0.7,
            margin: '0 auto 0.4rem',
            animation: 'mdoSkelBreathe 2.4s ease-in-out infinite alternate',
          }}
        >
          🗝️
        </div>

        <SkeletonBar w="60%" h={20} style={{ margin: '0 auto 1.5rem' }} />

        <SkeletonBar h={42} radius={10} />

        <SkeletonBar h={42} radius={12} style={{ marginTop: '1.1rem', background: 'rgba(201,169,110,0.4)' }} />
      </div>
    </SkeletonStatus>
  );
}
