import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';

/**
 * Suspense fallback for /profiles — the picker's own geometry, drawn empty.
 *
 * Shell, eyebrow, tile row and the 108px circles are copied literals from
 * ProfilePicker, not imports: the picker is a client component and its styles
 * are its own business, the way the rest of this repo does it. What matters is
 * that the numbers agree — same padding, same 2rem gap, same 640 row, same
 * circle-plus-caption column — so the real faces land exactly where their
 * ghosts stood and nothing shifts under the cursor.
 *
 * Four tiles is the honest guess: most families have one or two readers plus
 * the parent tile, and a row that is slightly too long settles inward rather
 * than reflowing.
 *
 * One consequence worth naming: the page can `redirect('/welcome')` when the
 * family has no readers at all, and a redirecting render has zero children —
 * so that family now watches this skeleton for the length of the round trip
 * before being sent on. That is a soft redirect rather than an instant one,
 * and it is acceptable here: /profiles is private, the redirect is only ever
 * reached after requireGuardian(), and a moment of the house's own stationery
 * beats a blank frame.
 */
export default function Loading() {
  return (
    <SkeletonStatus
      label="Finding your family's readers"
      style={{
        minHeight: '100vh',
        background: '#F5F0E7',
        backgroundImage: 'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        animation: 'mdoSkelFade 0.3s ease-out',
      }}
    >
      {/* The brand line is not a placeholder — it says the same word on every
          render, so a shimmering bar here would be a lie about pending data. */}
      <p style={{
        fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', letterSpacing: '0.3em',
        textTransform: 'uppercase', color: '#C9A96E', margin: '0 0 0.5rem',
      }}>
        Maison d&apos;Oré
      </p>

      {/* Stands in for the 1.9rem Playfair "Who's reading today?" */}
      <SkeletonBar w={260} h={30} style={{ margin: '0 0 2.5rem' }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', maxWidth: 640 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            {/* The faces warm up in turn rather than all at once — four circles
                pulsing in lockstep reads as a stutter, staggered reads as a
                queue being worked through. */}
            <div
              className="mdo-anim"
              style={{
                animation: 'mdoSkelBreathe 2.6s ease-in-out infinite alternate',
                animationDelay: `${i * 0.25}s`,
              }}
            >
              <SkeletonBar
                w={108}
                h={108}
                radius="50%"
                style={{ border: '3px solid rgba(201,169,110,0.35)', margin: '0 auto' }}
              />
            </div>
            <SkeletonBar w={64} h={10} style={{ margin: '0.7rem auto 0' }} />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
