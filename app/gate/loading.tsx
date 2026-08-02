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
        {/* The gate's own key, breathing — a shimmer bar here would say "a
            picture is loading", which is not what is happening. Drawn exactly
            as GateForm draws it (2rem glyph, no ring): the body's 1.75
            line-height makes this a 56px line box, and the real key lands on
            top of it without the card moving. */}
        <div
          className="mdo-anim"
          aria-hidden="true"
          style={{
            fontSize: '2rem', lineHeight: 1.75, opacity: 0.7,
            marginBottom: '0.4rem',
            animation: 'mdoSkelBreathe 2.4s ease-in-out infinite alternate',
          }}
        >
          🗝️
        </div>

        {/* "Grown-ups only" (1.4rem Playfair, lh 1.2 ≈ 27px) and the one-line
            prompt under it (0.82rem, lh 1.75 ≈ 23px) — bars sized to the full
            line boxes so the column below them starts at the same y. */}
        <SkeletonBar w="55%" h={27} style={{ margin: '0 auto 0.5rem' }} />
        <SkeletonBar w="80%" h={23} style={{ margin: '0 auto 1.5rem' }} />

        {/* field: 0.7rem×2 padding + 0.9rem text at lh 1.75 + 2px border ≈ 50px */}
        <SkeletonBar h={50} radius={10} />

        {/* Continue: 0.75rem×2 padding + 0.8rem text at lh 1.75 ≈ 46px; the
            tint is the button's own disabled gold. */}
        <SkeletonBar h={46} radius={12} style={{ marginTop: '1.1rem', background: 'rgba(201,169,110,0.4)' }} />

        {/* The "Back to profiles" link — small, but it is 36px of card, and
            without a ghost the whole centred card jumps up when it arrives. */}
        <SkeletonBar w={96} h={12} style={{ margin: '1.4rem auto 0' }} />
      </div>
    </SkeletonStatus>
  );
}
