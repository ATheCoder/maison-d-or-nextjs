'use client';
/**
 * StorybookView — client chrome for a single Golden Story.
 * The person is fetched on the server (SSR, via Drizzle) and passed in;
 * this component only owns the interactive bits (back navigation, the
 * not-found fallback, the born_today flag earn) and renders the GoldenStory
 * itself.
 *
 * This is the single `born_today` earn site (spec R6.6a/R6.9): opening a
 * person's story earns their country, whether reached from the edition or by
 * deep link. `canEarn` is the server's "there is an active child" boolean —
 * signed-out and parent-mode visitors still read the story, they just earn
 * nothing. GoldenStory itself stays earn-free. Same-navigation revisits are
 * deduped by the server action's idempotence, not by client state.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GoldenStory from '@/components/dailygold/GoldenStory';
import FlagSealCelebration from '@/components/dailygold/FlagSealCelebration';
import { useFlagEarn } from '@/components/dailygold/useFlagEarn';
import { resolvePerson } from '@/lib/countries';

export default function StorybookView({ story, canEarn = false }) {
  const router = useRouter();
  const { earn, celebration, dismissCelebration } = useFlagEarn();

  useEffect(() => {
    if (!canEarn || !story) return;
    const iso2 = resolvePerson({
      countryCode: story.country_code,
      nationality: story.nationality,
      country: story.country,
    });
    if (iso2) earn(story.country || story.nationality || '', iso2, 'born_today');
  }, [canEarn, story, earn]);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E7' }}>
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
        <GoldenStory story={story} />
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
  );
}
