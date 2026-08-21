import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';

/**
 * Suspense fallback for the whole admin desk — /admin and every segment under
 * it (the Daily Gold desk, a day, an almanac month-day, the people library, a
 * person).
 *
 * One file rather than six, and deliberately so. Every admin page opens with
 * `await requireAdmin()`, which reads the session; under Cache Components a
 * session read outside <Suspense> is a `blocking-route` error, and a
 * `loading.tsx` at a segment covers that segment and everything nested beneath
 * it. So this single boundary unblocks all six. /admin/daily-gold also reads
 * the clock at the top of its module, which is the same class of request-time
 * access and is covered by the same boundary.
 *
 * Generic on purpose. Admin sits behind an admin session, so it can never have
 * a meaningful static shell and gains nothing from six hand-shaped skeletons —
 * what it needs is the parchment ground and the masthead geometry, so the desk
 * lands where its outline was instead of arriving on a white page. The reader-
 * facing routes are where a skeleton is worth shaping to its page.
 */
export default function Loading() {
  return (
    <SkeletonStatus
      label="Opening the admin desk"
      // The ground is the theme's, not a hex: the admin layout scopes
      // data-theme="parchment" above this, so bg-surface-page here IS the
      // parchment the desk lands on, and it follows the token if it ever moves.
      className="mdo-anim min-h-dvh bg-surface-page px-6 py-12 font-sans sm:px-10 lg:px-16"
      style={{ animation: 'mdoSkelFade 0.3s ease-out' }}
    >
      {/* The masthead every admin screen wears: the editorial-label eyebrow and
          the display-section title under it, sized to their line boxes so the
          real heading arrives without shifting the page. */}
      <SkeletonBar w={220} h={12} style={{ marginBottom: '0.6rem' }} />
      <SkeletonBar w="42%" h={34} style={{ marginBottom: '2.5rem' }} />

      {/* Body: three cards' worth of ground. The desks below differ far too much
          to draw faithfully from here — this is the shape they share. */}
      <div className="grid max-w-[900px] gap-4">
        <SkeletonBar h={96} radius={16} />
        <SkeletonBar h={96} radius={16} />
        <SkeletonBar h={96} radius={16} />
      </div>
    </SkeletonStatus>
  );
}
