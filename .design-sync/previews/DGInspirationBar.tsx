import type { ReactNode } from 'react';
import DGInspirationBar from '@/components/dailygold/DGInspirationBar';
import { GALLERY_CSS } from '@/components/dailygold/galleryCss';

/** The room the quiet room hangs in — see the note above GALLERY_CSS. */
function Room({ children }: { children: ReactNode }) {
  return (
    <div className="gl" style={{ background: 'var(--surface-page)' }}>
      <style>{GALLERY_CSS}</style>
      {children}
    </div>
  );
}

// The quiet room: the day's quote, set as large as 62px in the display italic,
// with nothing else on the screen beside it. Reads `edition.daily_quote` /
// `daily_quote_author` when the day has an authored quote, and falls back to
// the built-in daily rotation when it doesn't — so both paths are worth a
// story. `LongerQuote` is the one that shows the type actually reflowing.
//
// It was a tinted band with a gold gradient, two hairlines, a heading cluster
// and quotation ornaments; none of that survives, so the story has to supply
// the wall it now sits on.

export function AuthoredQuote() {
  return (
    <Room>
      <DGInspirationBar
        edition={{
          daily_quote: 'Education is not the filling of a pail, but the lighting of a fire.',
          daily_quote_author: 'W. B. Yeats',
        }}
      />
    </Room>
  );
}

export function LongerQuote() {
  return (
    <Room>
      <DGInspirationBar
        edition={{
          daily_quote:
            'The world is full of magic things, patiently waiting for our senses to grow sharper.',
          daily_quote_author: 'W. B. Yeats',
        }}
      />
    </Room>
  );
}

export function DailyRotationFallback() {
  return (
    <Room>
      <DGInspirationBar />
    </Room>
  );
}
