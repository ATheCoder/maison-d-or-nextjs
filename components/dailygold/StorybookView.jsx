'use client';
/**
 * StorybookView — client chrome for a single Golden Story.
 * The person is fetched on the server (SSR, via Drizzle) and passed in;
 * this component only owns the interactive bits (back navigation, the
 * not-found fallback) and renders the GoldenStory itself.
 */
import { useRouter } from 'next/navigation';
import GoldenStory from '@/components/dailygold/GoldenStory';

export default function StorybookView({ story }) {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E7' }}>
      {/* Back to the edition */}
      <button
        onClick={() => router.back()}
        aria-label="Back to Daily Gold"
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
