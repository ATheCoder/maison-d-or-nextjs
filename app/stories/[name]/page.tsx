import { Suspense } from 'react';
import { getPersonBySlug } from '@/app/(dg)/daily-gold-edition/queries';
import StorybookView from '@/components/dailygold/StorybookView';
import BookOpeningCurtain from '@/components/dailygold/BookOpeningCurtain';
import { getActiveChild } from '@/lib/dal';

/**
 * A Golden Story for one remarkable person, read from the remarkable_person
 * table by slug (e.g. /stories/leonardo). People migrated without full art
 * (Tier 2) render with text-only plates — <GoldenStory> shows its parchment
 * placeholder wherever an image_url is null.
 *
 * Under Cache Components both reads here are runtime data — `params` because
 * there is no generateStaticParams, and the session because it is the session
 * — so the route needs a boundary. Its fallback is the curtain, and that is the
 * whole design of this file.
 *
 * StoryOpeningCurtain's docblock forbids this route a `loading.tsx`, because a
 * committed fallback drops `useLinkStatus().pending` and cuts the cover
 * mid-swing, breaking the `resume` handoff into StorybookView. That constraint
 * is honoured rather than worked around: the fallback *is* BookOpeningCurtain,
 * with `resume` set, so the cover the shelf started keeps swinging on the
 * destination and the seam stays invisible. Three curtains now hand off in a
 * row — the link's, this boundary's, and StorybookView's while the plates load
 * — and all three are the same animation at the same offset.
 *
 * The prize for the boundary is that the story read is cacheable: getPersonBySlug
 * is `'use cache'` + `cacheTag('person:<slug>')`, so a published story is
 * computed once and served from cache to every visitor until an admin edits it.
 *
 * What is deliberately NOT done here is prerendering the story itself. That
 * would need generateStaticParams plus the session read gone from the server
 * render, and the session read cannot leave: StorybookView mounts
 * DGInstrumentationProvider with `childId` above everything it draws, so a
 * late-arriving identity means a late-arriving provider. Restructuring that
 * ownership is a bigger change than this migration, and the payoff is small —
 * the cached read is where the speed actually comes from.
 */
async function Story({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // No redirect: a signed-out or parent-mode visitor still reads the story.
  // The earn path takes only a boolean — the earn action re-resolves the child
  // from the session itself (spec R6.9). The opaque profile id crosses too, as
  // the analytics carryover's routing hint: it tells the reader's browser whose
  // unsent events are in localStorage, is never put in a payload, and ingest
  // re-resolves identity from the session all the same
  // (docs/daily-gold-analytics-plan.md §1/§4). A deliberate, documented
  // widening of R6.9 — no name, no family, nothing readable leaves the server.
  const [story, child] = await Promise.all([getPersonBySlug(name), getActiveChild()]);

  return <StorybookView story={story} canEarn={!!child} childId={child?.id ?? null} />;
}

export default function StoryPage({ params }: { params: Promise<{ name: string }> }) {
  return (
    // No name and no cover art to draw with: this curtain stands in for the
    // one the shelf was already showing, and the reader is looking at a book
    // that is mid-open, not at a label. The person's own cover arrives with
    // StorybookView's curtain a beat later.
    <Suspense fallback={<BookOpeningCurtain name={null} resume />}>
      <Story params={params} />
    </Suspense>
  );
}
