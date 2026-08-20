'use client';
/**
 * DGInspirationBar — the quiet room: the day's quote, and nothing else on the
 * screen with it.
 *
 * It was a tinted full-width band with a gold gradient, two hairlines, a
 * heading cluster, a sub-line, quotation ornaments and an attribution, all
 * stacked at 2rem of padding. In the gallery it is a room a reader walks into:
 * a great deal of air, the quote set as large as 62px in the display italic,
 * and the attribution in small caps beneath. The band, the gradient and both
 * hairlines are gone — a wall between two walls already has the only rule this
 * page draws.
 *
 * NOTE: still falls back to a curated rotation when the edition authored no
 * quote of its own. Wire the fallback out when `daily_quote` is reliably
 * populated.
 */

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

/** @param {{ edition?: { daily_quote?: string | null, daily_quote_author?: string | null } | null }} props */
export default function DGInspirationBar({ edition }) {
  // Pick a quote: the edition's own if authored, otherwise the daily rotation.
  const quote = edition?.daily_quote
    ? { text: edition.daily_quote, author: edition.daily_quote_author || '' }
    : FALLBACK_QUOTE;

  return (
    <section className="wall gl-quiet">
      <small>Daily dose of inspiration</small>
      <p className="q">&ldquo;{quote.text}&rdquo;</p>
      {quote.author && <cite>{quote.author}</cite>}
      <p>A quote, a reminder, a spark for your day</p>
    </section>
  );
}
