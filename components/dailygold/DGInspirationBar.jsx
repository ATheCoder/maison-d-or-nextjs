'use client';
/**
 * DGInspirationBar — Full-width warm quote band.
 * Uses rotating curated quotes until live quote data is wired in.
 * NOTE: Currently using a static rotating set of uplifting quotes.
 * Wire to a `daily_quote` field on DailyGoldEdition when ready.
 */
import { useTheme } from '@/components/theme/ThemeContext';

const QUOTES = [
  { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
  { text: "Curiosity is the engine of achievement.", author: "Ken Robinson" },
  { text: "You are never too small to make a difference.", author: "Greta Thunberg" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The world is a book, and those who do not travel read only one page.", author: "Saint Augustine" },
  { text: "Wonder is the beginning of wisdom.", author: "Socrates" },
  { text: "Every child is an artist. The problem is how to remain an artist once we grow up.", author: "Pablo Picasso" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats" },
  { text: "The earth has music for those who listen.", author: "George Santayana" },
];

// Rotate the fallback quote by day-of-year. Computed once at module load
// (render must stay pure); the quote only changes across a midnight reload,
// which is exactly its cadence anyway.
const DAY_OF_YEAR = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
const FALLBACK_QUOTE = QUOTES[DAY_OF_YEAR % QUOTES.length];

export default function DGInspirationBar({ edition }) {
  const { theme } = useTheme();

  // Pick a quote: the edition's own if authored, otherwise the daily rotation.
  const quote = edition?.daily_quote
    ? { text: edition.daily_quote, author: edition.daily_quote_author || '' }
    : FALLBACK_QUOTE;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${theme.accentGold}26 0%, ${theme.accentGold}14 50%, ${theme.accentGold}1F 100%)`,
      borderTop: `1px solid ${theme.accentGold}40`,
      borderBottom: `1px solid ${theme.accentGold}40`,
      padding: '2rem clamp(1.5rem, 6vw, 5rem)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: '0.75rem',
    }}>
      {/* Heading cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <div aria-hidden="true" style={{ width: 40, height: 1, background: `${theme.accentGold}80` }} />
        <p style={{
          fontFamily: theme.fontBody,
          fontSize: '0.72rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: theme.accentGold,
          margin: 0,
          fontWeight: 500,
        }}>
          Daily Dose of Inspiration
        </p>
        <div aria-hidden="true" style={{ width: 40, height: 1, background: `${theme.accentGold}80` }} />
      </div>

      <p style={{
        fontFamily: theme.fontBody,
        fontSize: '0.78rem',
        color: theme.textMuted,
        margin: '0 0 0.5rem',
        letterSpacing: '0.05em',
      }}>
        A quote, a reminder, a spark for your day
      </p>

      {/* Quote */}
      <blockquote style={{
        fontFamily: theme.fontHeadline,
        fontStyle: 'italic',
        fontSize: 'clamp(1.05rem, 2.2vw, 1.4rem)',
        fontWeight: 400,
        color: theme.textHeadline,
        lineHeight: 1.65,
        maxWidth: 680,
        margin: '0 auto',
        padding: 0,
        border: 'none',
      }}>
        <span aria-hidden="true">❝ </span>{quote.text}<span aria-hidden="true"> ❞</span>
      </blockquote>

      {/* Attribution */}
      {quote.author && (
        <p style={{
          fontFamily: theme.fontBody,
          fontSize: '0.72rem',
          color: theme.accentGold,
          margin: 0,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          {quote.author}
        </p>
      )}
    </div>
  );
}
