'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { base44 } from '@/api/base44Client';
import GoldenStory from '@/components/dailygold/GoldenStory';

type Story = Record<string, any>;

export default function StorybookPage() {
  const router = useRouter();
  const params = useParams<{ editionId: string; personIndex: string }>();
  const editionId = params?.editionId as string;
  const index = Number.parseInt((params?.personIndex as string) ?? '0', 10) || 0;

  const [story, setStory] = useState<Story | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!editionId) return;
    let alive = true;
    setStatus('loading');
    base44.entities.DailyGoldEdition
      .filter({ id: editionId }, '-created_date', 1)
      .then((rows: any[]) => rows?.[0] || null)
      .then((edition: any) => {
        if (!alive) return;
        const person = edition?.born_today?.[index] || null;
        if (person) {
          setStory(person);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [editionId, index]);

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

      {status === 'loading' && (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%', background: '#C9A96E',
                animation: `gsDot 1.6s ${d}s ease-in-out infinite`,
              }} />
            ))}
          </div>
          <p style={{
            fontFamily: 'Playfair Display, serif', fontStyle: 'italic',
            fontSize: '1.05rem', color: '#5C4A2A', margin: 0,
          }}>
            Opening the story&#8230;
          </p>
          <style>{`@keyframes gsDot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.85); } }`}</style>
        </div>
      )}

      {status === 'error' && (
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

      {status === 'ready' && story && (
        <GoldenStory story={story} editionId={editionId} index={index} />
      )}
    </div>
  );
}
