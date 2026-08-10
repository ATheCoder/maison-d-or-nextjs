import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';
import {
  shellStyle,
  wideCardStyle,
  eyebrowStyle,
  C,
  FIELD_HEIGHT,
  FIELD_RADIUS,
  BUTTON_HEIGHT,
  BUTTON_RADIUS,
} from '@/components/maison/guardianSurface';

/**
 * Suspense fallback for /welcome — the wizard's card, waiting to be filled in.
 *
 * Shell, card and brand line are the shared ones from guardianSurface, which is
 * also where the wizard gets them, so the outline cannot drift from the thing
 * it is holding a place for. The field and button heights come from the same
 * module for the same reason. What is still copied by hand is the wizard's own
 * furniture — the step dots, and the rhythm of heading / lede / two fields —
 * because those live inside the client component and have no shared form.
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
        ...shellStyle,
        fontFamily: 'var(--font-sans)',
        animation: 'mdoSkelFade 0.3s ease-out',
      }}
    >
      <div style={wideCardStyle}>
        {/* Static brand line, same as the wizard's — not pending data, and its
            height is part of why the card does not jump. */}
        <p style={{ ...eyebrowStyle, margin: '0 0 1.25rem' }}>Maison d&apos;Oré</p>

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
                background: i === 0 ? C.gold : 'rgba(201,169,110,0.3)',
              }}
            />
          ))}
        </div>

        {/* Heading (up to 1.7rem Playfair, lh 1.3 ≈ 35px), then the two-line
            lede that sits under it on every step — the wizard has no rule or
            divider here. */}
        <SkeletonBar w="70%" h={35} style={{ margin: '0 auto 0.6rem' }} />
        <SkeletonBar w="88%" h={17} style={{ margin: '0 auto 6px' }} />
        <SkeletonBar w="60%" h={17} style={{ margin: '0 auto 1.75rem' }} />

        {/* Field one: label (0.58rem) over the shared field. */}
        <div style={{ marginBottom: '1.1rem' }}>
          <SkeletonBar w={130} h={8} radius={2} style={{ marginBottom: '0.45rem' }} />
          <SkeletonBar h={FIELD_HEIGHT} radius={FIELD_RADIUS} />
        </div>

        {/* Field two: the timezone select, plus its two-line hint. */}
        <div style={{ marginBottom: '1.5rem' }}>
          <SkeletonBar w={130} h={8} radius={2} style={{ marginBottom: '0.45rem' }} />
          <SkeletonBar h={FIELD_HEIGHT} radius={FIELD_RADIUS} />
          <SkeletonBar w="96%" h={12} style={{ margin: '0.45rem 0 0' }} />
          <SkeletonBar w="70%" h={12} style={{ margin: '5px 0 0' }} />
        </div>

        {/* Continue, in the ghost's gold tint of the wizard's solid-gold
            button. */}
        <SkeletonBar h={BUTTON_HEIGHT} radius={BUTTON_RADIUS} style={{ background: 'rgba(201,169,110,0.4)' }} />
      </div>
    </SkeletonStatus>
  );
}
