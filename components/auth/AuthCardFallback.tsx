/**
 * AuthCardFallback — what /login, /signup, /forgot-password and /reset-password
 * show while their client form is suspended.
 *
 * Every one of those forms reads the query string (`?email=`, `?next=`, the
 * reset token) with useSearchParams, which forces a prerender bailout, and the
 * <Suspense> boundary on each page is what keeps the build from failing over
 * it. Those boundaries were written without a fallback, so the bailout rendered
 * as an empty document. On a warm connection that is a flash nobody sees; on a
 * slow phone it is a blank white page where a login form should be, for as long
 * as the form's JavaScript takes to arrive — which is exactly the moment a
 * visitor decides the site is broken.
 *
 * So the geometry here is the shared one: the same `.front-door` shell and the
 * same ds Card the real forms build themselves from, and the field and button
 * heights come from components/ds/geometry, which measures them off the coats.
 * The real form lands into the same shape the placeholder was holding, so
 * nothing jumps. That module exists for this: before it, the skeleton and the
 * control it stood in for each carried their own idea of how tall a field was.
 *
 * Two deliberate departures. The brand eyebrow is real text, not a bar: it is
 * static on every one of these pages, it costs nothing to render, and reading
 * "Maison d'Oré" while the form loads is the difference between a page that is
 * arriving and a page that is broken. And the shell keeps the plain wash rather
 * than AuthForm's drawing-room photograph — that paint is what shows under the
 * photo until it decodes anyway, and a placeholder has no business pulling a
 * background image down the same wire the form is waiting on.
 *
 * Server component on purpose — no 'use client', no hooks. A client boundary
 * here would ship a component whose entire job is to be replaced.
 */
import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';
import { Card, Eyebrow, Rule } from '@/components/ds';
import { CONTROL_HEIGHT, CONTROL_RADIUS } from '@/components/ds/geometry';

/**
 * Label bar + field bar, at the spacing the real field groups use — and at the
 * control's own corner and height, taken from ds/geometry rather than typed out
 * here, so the form lands into the shape being held for it even after someone
 * changes the field.
 */
function FieldGroup({ gap }: { gap: string }) {
  return (
    <div style={{ marginBottom: gap }}>
      <SkeletonBar w={80} h={8} radius={2} style={{ marginBottom: '0.45rem' }} />
      <SkeletonBar h={CONTROL_HEIGHT} radius={CONTROL_RADIUS} />
    </div>
  );
}

export default function AuthCardFallback() {
  return (
    <div className="front-door mdo-anim" style={{ animation: 'mdoSkelFade 0.3s ease-out' }}>
      <Card
        tone="raised"
        elevation="card"
        radius="lg"
        padding="none"
        className="front-door-card w-full max-w-100 px-9 py-11"
      >
        <SkeletonStatus label="Loading">
          <Eyebrow rule={false} className="text-center">Maison d&apos;Oré</Eyebrow>

          <SkeletonBar w="55%" h={22} radius={2} style={{ margin: '1rem auto 1.6rem' }} />
          <Rule variant="accent" className="mb-7" />

          <FieldGroup gap="1rem" />
          <FieldGroup gap="1.5rem" />

          {/* The button, in the gold tint of the solid one it stands in for. */}
          <SkeletonBar
            h={CONTROL_HEIGHT}
            radius={CONTROL_RADIUS}
            style={{ background: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}
          />

          <SkeletonBar w={140} h={9} radius={2} style={{ margin: '1.6rem auto 0' }} />
        </SkeletonStatus>
      </Card>
    </div>
  );
}
