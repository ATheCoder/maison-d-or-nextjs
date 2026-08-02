import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';

/**
 * Suspense fallback for /welcome — the wizard's card, waiting to be filled in.
 *
 * Shell and card literals are copied from WelcomeWizard rather than imported:
 * the wizard is a client component and its style objects are private to it.
 * The numbers that matter are the ones that decide where things sit — the
 * 480 card, its 2.5rem/2rem padding, the 18px radius, the step dots' 6px
 * height — so the real wizard lands on top of its own outline.
 *
 * The page can `redirect('/profiles')` when the family already has a reader.
 * That render has no children of its own, so a returning guardian sees this
 * card for the length of the round trip before being sent on. Acceptable: the
 * destination already exists, the redirect is the self-healing half of the
 * /welcome ↔ /profiles rule, and the fade keeps it from reading as a flash.
 */
export default function Loading() {
  return (
    <SkeletonStatus
      label="Preparing your welcome"
      style={{
        minHeight: '100vh',
        background: '#F5F0E7',
        backgroundImage: 'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(100,75,45,0.04) 0%, transparent 45%)',
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
        maxWidth: 480,
        background: 'rgba(255,248,238,0.85)',
        borderRadius: 18,
        border: '1px solid rgba(201,169,110,0.3)',
        boxShadow: '0 8px 40px rgba(100,80,40,0.12)',
        padding: '2.5rem 2rem',
      }}>
        {/* Static brand line, same as the wizard's — not pending data, and its
            height is part of why the card does not jump. */}
        <p style={{
          fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase',
          color: '#C9A96E', textAlign: 'center', margin: '0 0 1.25rem',
        }}>
          Maison d&apos;Oré
        </p>

        {/* StepDots as the wizard draws them: the current dot is a 22px lozenge,
            the waiting ones are 6px rounds. Three dots is the full-wizard
            guess; an invited co-parent gets two, and that one-dot pop is
            accepted over drawing the wrong shape for everyone else. */}
        <div aria-hidden="true" style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '0 0 1.5rem' }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: i === 0 ? 22 : 6,
                height: 6,
                borderRadius: 3,
                background: i === 0 ? '#C9A96E' : 'rgba(201,169,110,0.3)',
              }}
            />
          ))}
        </div>

        {/* Heading (1.6rem Playfair ≈ 31px), then the two-line lede that sits
            under it on every step — the wizard has no rule or divider here. */}
        <SkeletonBar w="70%" h={31} style={{ margin: '0 auto 0.6rem' }} />
        <SkeletonBar w="88%" h={17} style={{ margin: '0 auto 6px' }} />
        <SkeletonBar w="60%" h={17} style={{ margin: '0 auto 1.75rem' }} />

        {/* Field one: label (0.62rem, lh 1.75 ≈ 17px) over a 50px input. */}
        <div style={{ marginBottom: '1.1rem' }}>
          <SkeletonBar w={130} h={17} style={{ marginBottom: '0.35rem' }} />
          <SkeletonBar h={50} radius={10} />
        </div>

        {/* Field two: the timezone select, plus its two-line hint. */}
        <div style={{ marginBottom: '1.5rem' }}>
          <SkeletonBar w={130} h={17} style={{ marginBottom: '0.35rem' }} />
          <SkeletonBar h={50} radius={10} />
          <SkeletonBar w="96%" h={12} style={{ margin: '0.45rem 0 0' }} />
          <SkeletonBar w="70%" h={12} style={{ margin: '5px 0 0' }} />
        </div>

        {/* Continue: 0.8rem×2 padding + 0.85rem text ≈ 49px, in the ghost's
            gold tint of the wizard's solid-gold button. */}
        <SkeletonBar h={49} radius={12} style={{ background: 'rgba(201,169,110,0.4)' }} />
      </div>
    </SkeletonStatus>
  );
}
