import TreasurySkeleton from '@/components/treasury/TreasurySkeleton';

/**
 * The Suspense fallback for /treasury alone, sitting under the group-wide
 * app/(dg)/loading.tsx and taking precedence for this segment.
 *
 * The group fallback is a flowing document of light cards, which is a fair
 * guess for every other destination — but the treasury is a viewport-locked
 * museum stage with no document scroll at all, and watching cards collapse
 * into a centred entrance hall reads as the wrong page having loaded first.
 * This one is shaped like the entrance itself.
 */
export default function Loading() {
  return <TreasurySkeleton />;
}
