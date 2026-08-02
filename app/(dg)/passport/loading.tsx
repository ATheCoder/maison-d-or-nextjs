import PassportSkeleton from '@/components/dailygold/PassportSkeleton';

/**
 * The Suspense fallback for /passport alone, under the group-wide
 * app/(dg)/loading.tsx.
 *
 * The group fallback opens with an eyebrow and a left-aligned title over a
 * band of three cards; the passport has neither — it is a centred header
 * over a mosaic of two hundred medallions, and it follows the child's theme
 * where the group ghost's shape does not follow the page's. This one is the
 * flag wall itself, drawn empty.
 */
export default function Loading() {
  return <PassportSkeleton />;
}
