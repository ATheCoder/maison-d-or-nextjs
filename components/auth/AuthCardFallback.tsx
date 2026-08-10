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
 * So the geometry here is the shared one from authCardStyles (which AuthForm,
 * ForgotPasswordForm and ResetPasswordForm all dress themselves from): same
 * full-height centred shell, same 400px card with the gold rule along its top
 * and the same corners, same rhythm of eyebrow / title / hairline / two
 * fields / button / footer link. The real form lands into the same shape the
 * placeholder was holding, so nothing jumps.
 *
 * Two deliberate departures. The brand eyebrow is real text, not a bar: it is
 * static on every one of these pages, it costs nothing to render, and reading
 * "Maison d'Oré" while the form loads is the difference between a page that is
 * arriving and a page that is broken. And the shell keeps the plain ivory wash
 * rather than AuthForm's drawing-room photograph — ivory is what shows under
 * that photo until it decodes anyway (AuthForm picked it for exactly that
 * reason), and a placeholder has no business pulling a background image down
 * the same wire the form is waiting on.
 *
 * Server component on purpose — no 'use client', no hooks. A client boundary
 * here would ship a component whose entire job is to be replaced.
 */
import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';
import { shellStyle, cardStyle, eyebrowStyle, ruleStyle } from './authCardStyles';

/**
 * Label bar + field bar, at the spacing the real field groups use — and at the
 * field's own 10px corner, so the form lands into the shape being held for it.
 */
function FieldGroup({ gap }: { gap: string }) {
  return (
    <div style={{ marginBottom: gap }}>
      <SkeletonBar w={80} h={8} radius={2} style={{ marginBottom: '0.45rem' }} />
      <SkeletonBar h={42} radius={10} />
    </div>
  );
}

export default function AuthCardFallback() {
  return (
    <div
      className="mdo-anim"
      style={{ ...shellStyle, animation: 'mdoSkelFade 0.3s ease-out' }}
    >
      <div style={cardStyle}>
        <SkeletonStatus label="Loading">
          <p style={eyebrowStyle}>Maison d&apos;Oré</p>

          <SkeletonBar w="55%" h={22} radius={2} style={{ margin: '0 auto 1.6rem' }} />
          <hr style={ruleStyle} />

          <FieldGroup gap="1rem" />
          <FieldGroup gap="1.6rem" />

          <SkeletonBar h={46} radius={12} style={{ background: 'rgba(201,169,110,0.4)' }} />

          <SkeletonBar w={140} h={9} radius={2} style={{ margin: '1.6rem auto 0' }} />
        </SkeletonStatus>
      </div>
    </div>
  );
}
