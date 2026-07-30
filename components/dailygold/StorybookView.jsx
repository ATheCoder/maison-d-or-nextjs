'use client';
/**
 * StorybookView — client chrome for a single Golden Story.
 * The person is fetched on the server (SSR, via Drizzle) and passed in;
 * this component only owns the interactive bits (back navigation, the
 * not-found fallback, the born_today flag earn) and renders the GoldenStory
 * itself.
 *
 * This is the single `born_today` earn site (spec R6.6a/R6.9): finishing a
 * person's story — reaching its last page — earns their country, whether the
 * book was reached from the edition or by deep link. `canEarn` is the
 * server's "there is an active child" boolean — signed-out and parent-mode
 * visitors still read the story, they just earn nothing. GoldenStory only
 * reports the finish; the earn itself lives here. Same-navigation revisits
 * are deduped by the server action's idempotence, not by client state.
 *
 * It also owns the second half of the opening curtain: the book is only
 * uncovered once every illustration in it has loaded, so no one lands on a
 * page of blank plates filling in one by one. See BookOpeningCurtain.
 *
 * The whole route is one analytics section ("story"), so it mounts its own
 * provider (docs/daily-gold-analytics-plan.md §4) — per-route, not in a shared
 * shell, so the story passes its own context. `childId` is the provider's
 * routing hint for the localStorage carryover and never reaches a payload.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import GoldenStory, { storyImageUrls } from '@/components/dailygold/GoldenStory';
import BookOpeningCurtain from '@/components/dailygold/BookOpeningCurtain';
import FlagSealCelebration from '@/components/dailygold/FlagSealCelebration';
import { useFlagEarn } from '@/components/dailygold/useFlagEarn';
import {
  DGInstrumentationProvider,
  useInstrumentation,
} from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import { MAX_DURATION_MS } from '@/lib/analytics-events';
import { resolvePerson } from '@/lib/countries';

// A plate that never resolves — a dead URL that hangs rather than 404s, a
// stalled connection — must not hold the book shut forever. Past this the
// reader gets the story with whatever has arrived, and the rest fills in.
const MAX_WAIT_MS = 12000;

/**
 * `content_close` has exactly one chance to be written: the reader is leaving,
 * and the provider directly above is being deleted in the same commit. React
 * runs a deleted subtree's *layout* cleanups (mutation phase) before any
 * passive cleanup, so a layout cleanup lands the close in the buffer while the
 * provider's own unmount flush is still ahead of it — a plain useEffect
 * cleanup would run after that flush and the event would go nowhere. Matched
 * to useEffect on the server, where neither fires and useLayoutEffect would
 * only warn.
 */
const useReadingSessionEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * The reading session itself: one `content_open` when the book is opened, its
 * attention-paused dwell, and one `content_close` when the reader leaves it.
 * It also owns `story_finished`, which is emitted for EVERY reader — earning
 * is a separate question, answered by the parent's handleFinished.
 *
 * It exists as its own component only because the provider is mounted inside
 * StorybookView: useInstrumentation() has to be called below it.
 */
function StoryReader({ story, onFinished }) {
  const { track, enabled, attention, subscribeAttention } = useInstrumentation();
  const slug = story?.slug || null;
  const title = story?.story_title || story?.name || null;

  useReadingSessionEffect(() => {
    // No provider, no child, or a story with no identity to report.
    if (!enabled || !slug) return undefined;

    // The clock lives in the closure, like TrackedSection's: a re-render of
    // the book must never restart the reader's dwell.
    let accrued = 0;
    let since = attention.current ? Date.now() : null;

    track('content_open', { contentType: 'story', contentId: slug, label: title });

    const unsubscribeAttention = subscribeAttention((attentive) => {
      if (attentive) {
        since = Date.now();
        return;
      }
      if (since !== null) {
        accrued += Date.now() - since;
        since = null;
      }
    });

    return () => {
      unsubscribeAttention();
      if (since !== null) {
        accrued += Date.now() - since;
        since = null;
      }
      track('content_close', {
        contentType: 'story',
        contentId: slug,
        durationMs: Math.min(Math.round(accrued), MAX_DURATION_MS),
      });
    };
  }, [enabled, slug, title, track, attention, subscribeAttention]);

  // GoldenStory's onFinished is already fire-once, but the finish is the one
  // event a parent reads as an achievement — latch it here too rather than
  // trust a collaborator's bookkeeping.
  const finishedRef = useRef(false);
  const handleFinished = useCallback(() => {
    if (!finishedRef.current) {
      finishedRef.current = true;
      track('story_finished', { contentType: 'story', contentId: slug });
    }
    onFinished?.();
  }, [track, slug, onFinished]);

  return <GoldenStory story={story} onFinished={handleFinished} />;
}

/** @param {{ story?: any, canEarn?: boolean, childId?: string | null }} props */
export default function StorybookView({ story, canEarn = false, childId = null }) {
  const router = useRouter();
  const { earn, celebration, dismissCelebration } = useFlagEarn();

  // The curtain starts raised for everyone: arriving from the shelf it is
  // already up (DGBornToday raised it on the click) and simply stays up, and a
  // deep link gets the same wait rather than a book assembling itself. Both
  // renders — server and hydration — agree on `false`, since the check can only
  // run in an effect.
  const images = useMemo(() => storyImageUrls(story), [story]);
  const [imagesReady, setImagesReady] = useState(false);
  // A text-only story (Tier 2, all parchment placeholders) has nothing to wait
  // for, so it is never covered at all.
  const curtain = !!story && images.length > 0 && !imagesReady;

  useEffect(() => {
    if (!images.length) return undefined;

    // The same URLs are already in the DOM behind the curtain, so these are the
    // very requests the book is making — the browser serves both from one.
    let remaining = images.length;
    const loaders = images.map((src) => {
      const img = new Image();
      // An image that fails still counts: the page shows its placeholder and
      // waiting on it would strand the reader.
      img.onload = img.onerror = () => { if (--remaining === 0) setImagesReady(true); };
      img.src = src;
      return img;
    });
    const timer = setTimeout(() => setImagesReady(true), MAX_WAIT_MS);

    return () => {
      clearTimeout(timer);
      loaders.forEach((img) => { img.onload = img.onerror = null; });
    };
  }, [images]);

  const handleFinished = useCallback(() => {
    if (!canEarn || !story) return;
    const iso2 = resolvePerson({
      countryCode: story.country_code,
      nationality: story.nationality,
      country: story.country,
    });
    if (iso2) earn(story.country || story.nationality || '', iso2, 'born_today');
  }, [canEarn, story, earn]);

  return (
    // Mounted here, not in a layout: it unmounts with the view, and that
    // cleanup flush is what carries the last page back to the paper.
    <DGInstrumentationProvider childId={childId} staticSection="story">
      <div style={{ minHeight: '100vh', background: '#F5F0E7' }}>
        {/* Fixed and above everything, so the book, the back button and the
            story's own scroll all stay hidden until the art is here. */}
        {curtain && (
          <BookOpeningCurtain name={story.name} imgUrl={story.image_url || null} resume />
        )}

        {celebration && (
          <FlagSealCelebration
            key={celebration.id}
            countryCode={celebration.countryCode}
            countryName={celebration.countryName}
            type={celebration.type}
            onDone={dismissCelebration}
          />
        )}

        {/* Back to the edition */}
        <button
          onClick={() => router.back()}
          aria-label="Back to Daily Gold"
          className="mdo-story-back"
          style={{
            position: 'fixed', top: 20, left: 20, zIndex: 50,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0.55rem 1.15rem',
            background: 'rgba(251,248,241,0.9)',
            border: '1px solid rgba(201,169,110,0.4)',
            borderRadius: 30,
            color: '#A8884A',
            fontFamily: 'Lato, sans-serif',
            fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(90,60,20,0.12)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>‹</span> Back
        </button>

        {story ? (
          <StoryReader story={story} onFinished={handleFinished} />
        ) : (
          <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '2rem',
            textAlign: 'center',
          }}>
            <p style={{
              fontFamily: 'Playfair Display, serif', fontSize: '1.4rem',
              color: '#4A3B2A', margin: 0,
            }}>
              This story could not be found.
            </p>
            <button
              onClick={() => router.push('/daily-gold-edition')}
              style={{
                padding: '0.7rem 1.6rem', background: '#C8A96B', border: 'none',
                borderRadius: 30, color: '#2C1F0E', cursor: 'pointer',
                fontFamily: 'Lato, sans-serif', fontSize: '0.72rem',
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}
            >
              Return to Daily Gold
            </button>
          </div>
        )}
      </div>
    </DGInstrumentationProvider>
  );
}
