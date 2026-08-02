import DGContentSkeleton from '@/components/dailygold/DGContentSkeleton';

/**
 * The group-wide Suspense fallback — today only a safety net: every current
 * destination (family, parent-observatory, passport, treasury) carries its
 * own page-shaped loading.tsx, which takes precedence over this one. This
 * generic frame is what a *future* route in the group gets for free until it
 * grows a skeleton of its own.
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
