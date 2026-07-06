'use client';
/**
 * DGInspirationBar — Full-width warm quote band.
 * Uses rotating curated quotes until live quote data is wired in.
 * NOTE: Currently using a static rotating set of uplifting quotes.
 * Wire to a `daily_quote` field on DailyGoldEdition when ready.
 */
import { useMemo } from 'react';
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

export default function DGInspirationBar({ edition }) {
  const { theme } = useTheme();

  // Pick a quote: if edition has one use it, otherwise rotate by day-of-year
  const quote = useMemo(() => {
    if (edition?.daily_quote) return { text: edition.daily_quote, author: edition.daily_quote_author || '' };
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  }, [edition]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(201,169,110,0.18) 0%, rgba(232,220,195,0.25) 50%, rgba(201,169,110,0.12) 100%)',
      borderTop: '1px solid rgba(201,169,110,0.25)',
      borderBottom: '1px solid rgba(201,169,110,0.25)',
      padding: '2rem clamp(1.5rem, 6vw, 5rem)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: '0.75rem',
    }}>
      {/* Heading cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <div style={{ width: 40, height: 1, background: 'rgba(201,169,110,0.5)' }} />
        <p style={{
          fontFamily: theme.fontBody,
          fontSize: '0.55rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'rgba(201,169,110,0.85)',
          margin: 0,
          fontWeight: 500,
        }}>
          Daily Dose of Inspiration
        </p>
        <div style={{ width: 40, height: 1, background: 'rgba(201,169,110,0.5)' }} />
      </div>

      <p style={{
        fontFamily: theme.fontBody,
        fontSize: '0.72rem',
        color: 'rgba(100,80,50,0.6)',
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
        ❝ {quote.text} ❞
      </blockquote>

      {/* Attribution */}
      {quote.author && (
        <p style={{
          fontFamily: theme.fontBody,
          fontSize: '0.7rem',
          color: 'rgba(201,169,110,0.8)',
          margin: 0,
          letterSpacing: '0.1em',
          fontWeight: 500,
        }}>
          — {quote.author}
        </p>
      )}
    </div>
  );
}