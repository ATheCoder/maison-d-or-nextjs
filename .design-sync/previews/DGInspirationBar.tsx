import DGInspirationBar from '@/components/dailygold/DGInspirationBar';

// Reads `edition.daily_quote` / `daily_quote_author` when the day has an
// authored quote, and falls back to the built-in daily rotation when it
// doesn't — so both paths are worth a story.

export function AuthoredQuote() {
  return (
    <DGInspirationBar
      edition={{
        daily_quote: 'Education is not the filling of a pail, but the lighting of a fire.',
        daily_quote_author: 'W. B. Yeats',
      }}
    />
  );
}

export function LongerQuote() {
  return (
    <DGInspirationBar
      edition={{
        daily_quote:
          'The world is full of magic things, patiently waiting for our senses to grow sharper.',
        daily_quote_author: 'W. B. Yeats',
      }}
    />
  );
}

export function DailyRotationFallback() {
  return <DGInspirationBar />;
}
