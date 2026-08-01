import DGContentSkeleton from '@/components/dailygold/DGContentSkeleton';

/**
 * The Suspense fallback for every destination in the group.
 *
 * Next.js nests loading.tsx *inside* layout.tsx and around page.tsx, so this
 * replaces only what lives in the shell's <main>. The rail and the mobile tab
 * bar are layout — they stay mounted, stay interactive, and keep the pressed
 * item highlighted while the next page streams in. Without it the router has
 * nothing to show and simply holds the old page on screen until the whole
 * force-dynamic render lands, which is what made a rail press feel like a
 * page load.
 */
export default function Loading() {
  return <DGContentSkeleton />;
}
