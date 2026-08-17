// @ts-nocheck — untyped .jsx from before checkJs was on; 1 error to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * DGInspirationBar — Full-width warm quote band.
 * Uses rotating curated quotes until live quote data is wired in.
 * NOTE: Currently using a static rotating set of uplifting quotes.
 * Wire to a `daily_quote` field on DailyGoldEdition when ready.
 */
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';

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
  // Pick a quote: the edition's own if authored, otherwise the daily rotation.
  const quote = edition?.daily_quote
    ? { text: edition.daily_quote, author: edition.daily_quote_author || '' }
    : FALLBACK_QUOTE;

  return (
    <div style={{
      background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, transparent) 0%, color-mix(in srgb, var(--accent) 8%, transparent) 50%, color-mix(in srgb, var(--accent) 12%, transparent) 100%)',
      borderTop: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
      borderBottom: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
      padding: '2rem clamp(1.5rem, 6vw, 5rem)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: '0.75rem',
    }}>
      {/* Heading cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <div aria-hidden="true" style={{ width: 40, height: 1, background: 'color-mix(in srgb, var(--accent) 50%, transparent)' }} />
        <DGEyebrow tracking="hero" color="var(--accent-readable)" style={{ fontSize: '0.72rem', fontWeight: 500 }}>
          Daily Dose of Inspiration
        </DGEyebrow>
        <div aria-hidden="true" style={{ width: 40, height: 1, background: 'color-mix(in srgb, var(--accent) 50%, transparent)' }} />
      </div>

      <p style={{
        fontFamily: 'var(--face-sans)',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        margin: '0 0 0.5rem',
        letterSpacing: '0.05em',
      }}>
        A quote, a reminder, a spark for your day
      </p>

      {/* Quote */}
      <blockquote style={{
        fontFamily: 'var(--face-display)',
        fontStyle: 'italic',
        fontSize: 'clamp(1.05rem, 2.2vw, 1.4rem)',
        fontWeight: 400,
        color: 'var(--accent-readable)',
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
        <DGEyebrow tracking="tight" color="var(--accent-readable)" style={{ fontSize: '0.72rem', fontWeight: 500 }}>
          {quote.author}
        </DGEyebrow>
      )}
    </div>
  );
}
