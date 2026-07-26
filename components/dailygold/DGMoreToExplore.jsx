'use client';
import { useTheme } from '@/components/theme/ThemeContext';

// The real Daily Gold house style. Nothing here renders any more — it is kept
// as the source of truth for lib/daily-gold/prompts.ts, which harvests it, and
// for the per-card scene text below it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MASTER_STYLE = "Fine art oil painting, luminous and painterly, in the style of a luxurious illustrated storybook. Rich warm natural light, soft visible brushstrokes, depth and atmosphere, golden hour glow. Warm cream, gold, sage, and earth tones. Elegant, serene, emotionally warm, museum-quality illustration. Soft focus background, beautiful composition. NOT flat, NOT cartoon, NOT vector, NOT simple graphic art. Oil on canvas texture, fine detail, painterly realism with a dreamy quality. No text, no watermarks, no logos.";

// These destinations are not routes yet: /escapes, /academy and /recipes do
// not exist in app/. The cards render as a quiet "coming soon" editorial band
// (no click affordance) until their pages ship. `path` and `prompt` stay as
// authored intent for that day.
const EXPLORE_CARDS = [
  {
    label: 'Golden Escapes',
    description: 'Dream destinations for curious hearts.',
    path: '/escapes',
    prompt: `A child looking at a glowing world map with golden compass, warm adventure atmosphere`,
    accentToken: 'accentGold',
    image_url: null,
  },
  {
    label: 'Languages',
    description: 'One word a day opens a new world.',
    path: '/academy',
    prompt: `Beautiful handwritten letters and ink, warm golden light, book pages, magical atmosphere`,
    accentToken: 'accentSage',
    image_url: null,
  },
  {
    label: 'Recipes',
    description: 'Taste the world together.',
    path: '/recipes',
    prompt: `Beautiful Mediterranean food spread, warm colours, golden light, painterly style`,
    accentToken: 'accentSecondary',
    image_url: null,
  },
];

function ExploreCard({ card, theme }) {
  const accent = theme[card.accentToken] || theme.accentGold;
  // The card's painting, when it has one. Rendering is all this does: the
  // reader never calls a model (D5), so a card with no image_url keeps its
  // placeholder gradient until one is authored in the admin.
  const imgUrl = card.image_url;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: theme.radius,
        overflow: 'hidden',
        aspectRatio: '16 / 11',
        border: `1px solid ${theme.accentGold}24`,
        boxShadow: theme.shadowSoft,
      }}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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

      {/* Accent thread */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(to right, transparent, ${accent}, transparent)`,
        opacity: 0.6,
      }} />

      <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', right: '1.5rem' }}>
        <p style={{
          fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase',
          color: accent, margin: '0 0 0.4rem',
        }}>
          Coming soon
        </p>
        <h3 style={{ fontFamily: theme.fontHeadline, fontSize: '1.3rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.4rem', lineHeight: 1.2 }}>
          {card.label}
        </h3>
        <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.82rem', color: theme.textMuted, margin: 0 }}>
          {card.description}
        </p>
      </div>
    </div>
  );
}

export default function DGMoreToExplore() {
  const { theme } = useTheme();
  return (
    <section style={{ padding: '5rem clamp(1.5rem, 5vw, 4rem)', background: `linear-gradient(to bottom, ${theme.bgPrimary}, ${theme.bgSoft})` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: theme.accentGold, margin: '0 0 0.75rem', textAlign: 'center' }}>
          Coming soon to the journey
        </p>
        <h2 style={{ fontFamily: theme.fontHeadline, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.75rem', textAlign: 'center', lineHeight: 1.15 }}>
          More to Explore
        </h2>
        <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.95rem', color: theme.textMuted, margin: '0 0 3rem', textAlign: 'center' }}>
          New rooms of the Maison, opening their doors soon.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
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
