import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';
import { Card, Eyebrow } from '@/components/ds';
import { CONTROL_HEIGHT, CONTROL_RADIUS } from '@/components/ds/geometry';

/**
 * Suspense fallback for /welcome — the wizard's card, waiting to be filled in.
 *
 * Shell, card and brand line are the shared ones from components/ds, which is
 * also where the wizard gets them, so the outline cannot drift from the thing
 * it is holding a place for. The field and button heights come from
 * ds/geometry for the same reason. What is still copied by hand is the
 * wizard's own furniture — the step dots, and the rhythm of heading / lede /
 * two fields — because those live inside the client component and have no
 * shared form.
 *
 * No photograph, unlike the wizard itself: a placeholder has no business
 * pulling a background image down the same wire the thing it stands in for is
 * waiting on. The flat wash underneath is what shows while that photo decodes
 * anyway. Same reasoning, same decision, as AuthCardFallback.
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
      className="front-door"
      style={{ animation: 'mdoSkelFade 0.3s ease-out' }}
    >
      <Card
        tone="raised"
        elevation="card"
        radius="lg"
        padding="none"
        className="front-door-card w-full max-w-120 px-8 py-10"
      >
        {/* Static brand line, same as the wizard's — not pending data, and its
            height is part of why the card does not jump. */}
        <Eyebrow rule={false} className="mb-5 text-center">Maison d&apos;Oré</Eyebrow>

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
                background: i === 0
                  ? 'var(--accent)'
                  : 'color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            />
          ))}
        </div>

        {/* Heading (type-display-section, lh 1.3 ≈ 35px), then the two-line
            lede that sits under it on every step — the wizard has no rule or
            divider here. */}
        <SkeletonBar w="70%" h={35} style={{ margin: '0 auto 0.6rem' }} />
        <SkeletonBar w="88%" h={17} style={{ margin: '0 auto 6px' }} />
        <SkeletonBar w="60%" h={17} style={{ margin: '0 auto 1.75rem' }} />

        {/* Field one: the label over the shared control. */}
        <div style={{ marginBottom: '1.1rem' }}>
          <SkeletonBar w={130} h={8} radius={2} style={{ marginBottom: '0.45rem' }} />
          <SkeletonBar h={CONTROL_HEIGHT} radius={CONTROL_RADIUS} />
        </div>

        {/* Field two: the timezone select, plus its two-line hint. */}
        <div style={{ marginBottom: '1.5rem' }}>
          <SkeletonBar w={130} h={8} radius={2} style={{ marginBottom: '0.45rem' }} />
          <SkeletonBar h={CONTROL_HEIGHT} radius={CONTROL_RADIUS} />
          <SkeletonBar w="96%" h={12} style={{ margin: '0.45rem 0 0' }} />
          <SkeletonBar w="70%" h={12} style={{ margin: '5px 0 0' }} />
        </div>

        {/* Continue, in the gold tint of the wizard's solid button. */}
        <SkeletonBar
          h={CONTROL_HEIGHT}
          radius={CONTROL_RADIUS}
          style={{ background: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}
        />
      </Card>
    </SkeletonStatus>
  );
}
