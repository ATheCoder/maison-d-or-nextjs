'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';

const C = {
  gold: '#D4AF37',
  terra: '#C46D46',
};

// The real Daily Gold house style. Nothing here renders any more — it is kept
// as the source of truth for lib/daily-gold/prompts.ts, which harvests it, and
// for the per-card scene text below it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MASTER_STYLE = "Fine art oil painting, luminous and painterly, in the style of a luxurious illustrated storybook. Rich warm natural light, soft visible brushstrokes, depth and atmosphere, golden hour glow. Warm cream, gold, sage, and earth tones. Elegant, serene, emotionally warm, museum-quality illustration. Soft focus background, beautiful composition. NOT flat, NOT cartoon, NOT vector, NOT simple graphic art. Oil on canvas texture, fine detail, painterly realism with a dreamy quality. No text, no watermarks, no logos.";

const EXPLORE_CARDS = [
  {
    label: 'Golden Escapes',
    description: 'Dream destinations for curious hearts.',
    path: '/escapes',
    prompt: `A child looking at a glowing world map with golden compass, warm adventure atmosphere`,
    accent: C.gold,
    image_url: null,
  },
  {
    label: 'Languages',
    description: 'One word a day opens a new world.',
    path: '/academy',
    prompt: `Beautiful handwritten letters and ink, warm golden light, book pages, magical atmosphere`,
    accent: C.sage,
    image_url: null,
  },
  {
    label: 'Recipes',
    description: 'Taste the world together.',
    path: '/recipes',
    prompt: `Beautiful Mediterranean food spread, warm colours, golden light, painterly style`,
    accent: C.terra,
    image_url: null,
  },
];

function ExploreCard({ card, theme }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  // The card's painting, when it has one. Rendering is all this does: the
  // reader never calls a model (D5), so a card with no image_url keeps its
  // placeholder gradient until one is authored in the admin.
  const imgUrl = card.image_url;

  return (
    <div
      onClick={() => router.push(card.path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: theme.radius,
        overflow: 'hidden',
        height: 220,
        cursor: 'pointer',
        border: `1px solid ${theme.accentGold}${hovered ? '80' : '24'}`,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        transform: hovered ? 'translateY(-6px) scale(1.01)' : 'none',
        boxShadow: hovered ? theme.shadowDeep : theme.shadowSoft,
      }}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={card.label}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'transform 0.5s ease',
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
          }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 50% 30%, ${theme.accentGold}15 0%, transparent 70%)`,
          }} />
        </div>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to bottom, transparent 0%, ${theme.bgCard} 100%)`,
      }} />

      {/* Gold border accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(to right, transparent, ${card.accent}, transparent)`,
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.3s',
      }} />

      <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', right: '1.5rem' }}>
        <h3 style={{ fontFamily: theme.fontHeadline, fontSize: '1.3rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.4rem', lineHeight: 1.2 }}>
          {card.label}
        </h3>
        <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.82rem', color: theme.textMuted, margin: '0 0 0.75rem' }}>
          {card.description}
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          fontFamily: theme.fontBody, fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase',
          color: card.accent,
          opacity: hovered ? 1 : 0.7,
          transition: 'opacity 0.3s',
        }}>
          Explore →
        </div>
      </div>
    </div>
  );
}

export default function DGMoreToExplore() {
  const { theme } = useTheme();
  return (
    <section style={{ padding: '5rem clamp(1.5rem, 5vw, 4rem)', background: `linear-gradient(to bottom, ${theme.bgPrimary}, ${theme.bgSoft})` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ fontFamily: theme.fontBody, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.accentGold, margin: '0 0 0.75rem', textAlign: 'center' }}>
          Continue the journey
        </p>
        <h2 style={{ fontFamily: theme.fontHeadline, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 600, color: theme.textHeadline, margin: '0 0 3rem', textAlign: 'center', lineHeight: 1.15 }}>
          More to Explore
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}>
          {EXPLORE_CARDS.map((card, i) => (
            <ExploreCard key={i} card={card} theme={theme} />
          ))}
        </div>
      </div>
    </section>
  );
}