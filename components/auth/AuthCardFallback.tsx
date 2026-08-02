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
 * So the geometry here is copied from AuthForm (and matches ForgotPasswordForm
 * and ResetPasswordForm, which share it): same full-height centred shell, same
 * 400px card with the gold hairline and the 18px corners, same rhythm of
 * eyebrow / title / two fields / button / footer link. The real form lands into
 * the same shape the placeholder was holding, so nothing jumps.
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

const C = {
  gold: '#C9A96E',
  ivory: '#F5F0E7',
};

/** Label bar + field bar, at the spacing AuthForm's own field groups use. */
function FieldGroup({ gap }: { gap: string }) {
  return (
    <div style={{ marginBottom: gap }}>
      <SkeletonBar w={90} h={9} style={{ marginBottom: '0.35rem' }} />
      <SkeletonBar h={42} radius={10} />
    </div>
  );
}

export default function AuthCardFallback() {
  return (
    <div
      className="mdo-anim"
      style={{
        minHeight: '100vh',
        background: C.ivory,
        backgroundImage:
          'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(100,75,45,0.04) 0%, transparent 45%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        animation: 'mdoSkelFade 0.3s ease-out',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'rgba(255,248,238,0.85)',
        borderRadius: 18,
        border: `1px solid rgba(201,169,110,0.3)`,
        boxShadow: '0 8px 40px rgba(100,80,40,0.12)',
        padding: '2.5rem 2rem',
      }}>
        <SkeletonStatus label="Loading">
          <p style={{
            fontFamily: 'Lato, sans-serif',
            fontSize: '0.6rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: C.gold,
            textAlign: 'center',
            margin: '0 0 0.5rem',
          }}>
            Maison d&apos;Oré
          </p>

          <SkeletonBar w="55%" h={24} style={{ margin: '0 auto 1.75rem' }} />

          <FieldGroup gap="1rem" />
          <FieldGroup gap="1.5rem" />

          <SkeletonBar h={44} radius={12} style={{ background: 'rgba(201,169,110,0.4)' }} />

          <SkeletonBar w={140} h={10} style={{ margin: '1.5rem auto 0' }} />
        </SkeletonStatus>
      </div>
    </div>
  );
}
