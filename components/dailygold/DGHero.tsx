'use client';
/**
 * DGHero — the gallery's entrance: one painting, the day's name, and the
 * turner. Nothing else.
 *
 * It used to be a masthead: a title reading "Daily Gold" over a Ken-Burns pan,
 * fifteen floating particles, a breathing glow orb, a pill-shaped date stamp
 * and a generic subtitle that said the same thing every morning. All of it is
 * gone. The entrance now says what is actually true of *this* day — where in
 * the world it goes, and what that place feels like — over the day's own
 * painting, because a room that cannot name its subject is a lobby.
 *
 * THE LABEL STANDS IN THE PAINTING on all seven grounds, over a ramp made of
 * the reader's own --surface-page, so the picture dissolves into the room it
 * is hanging in. It used to stand there only on espresso and navy and hang
 * beneath the picture on the five lit ones; `06-gallery-themes.html` has it in
 * the painting everywhere, and that is what this renders. GALLERY_CSS owns the
 * whole of it — including which stops each ground gets — so this file states
 * the markup once and does not know which ground it got.
 *
 * The one thing it does know is whether there is a picture at all. With none,
 * `gl-entry-bare` drops the label back beneath the empty frame: a wash over a
 * blank rectangle is not a dissolve, it is a plain band with words on it.
 *
 * The day navigator arrives as `children` — the page owns it, because turning
 * a page is a navigation and the router lives up there.
 */
import type { ReactNode } from 'react';
import { Heading } from '@/components/ds';

export default function DGHero({
  dateStr,
  heroImageUrl,
  destinationName,
  atmosphere,
  hasEdition = true,
  children,
}: {
  /** The viewed day, already formatted — the entrance never parses a date. */
  dateStr: string;
  /** `EditionRecord.hero_image_url`, falling back to the destination painting. */
  heroImageUrl?: string | null;
  /** `destination_country` — "Kyoto, Japan". The city half becomes the headline. */
  destinationName?: string | null;
  /** `destination_description` — the first sentence becomes the sub-line. */
  atmosphere?: string | null;
  /** False on a day with no edition row at all: the walls are bare, and say so. */
  hasEdition?: boolean;
  /** The day navigator, hung on the label's own line. */
  children?: ReactNode;
}) {
  // Derived directly: the page never borrows another day's imagery to fill a
  // gap, so when the viewed day has no painting the entrance has none — the
  // frame stands empty and the words still land.
  const imgUrl = heroImageUrl || null;
  const place = destinationName?.split(',')[0].trim() || null;
  // Two sentences at most. The rest of the atmosphere belongs to the
  // destination wall, where a reader has asked for it.
  const sub = atmosphere
    ? atmosphere.split('.').slice(0, 2).join('.').trim() + (atmosphere.includes('.') ? '.' : '')
    : null;

  return (
    <section className={imgUrl ? 'gl-entry' : 'gl-entry gl-entry-bare'}>
      <div className="gl-entry-art">
        {imgUrl && <img src={imgUrl} alt="" />}
      </div>

      <div className="gl-entry-in">
        <p className="eye">Daily Gold · {dateStr}</p>

        {/* `variant="none"` and `tone="none"`: GALLERY_CSS owns this one's
            size (clamp 40–104px) and ink, and shipping a type-display-* class
            alongside its rule would mean two declarations competing to set the
            same property. Heading is here for the semantics — it renders
            <p role="heading" aria-level="1">, which is why the stylesheet
            targets [role="heading"] rather than h1.

            The <em> is the gold word — the place, or what the day is doing
            instead of naming one — and it wears `.gold-shimmer` (globals.css),
            the same sweep as the two wordmarks. It is the largest type in the
            house to carry it, which is the size the bright middle stop was
            put there for. GALLERY_CSS still sets the em's colour: that is the
            ground the sweep falls back to under reduced motion. */}
        {place ? (
          <Heading level={1} variant="none" tone="none">Today the world<br />is in <em className="gold-shimmer">{place}</em></Heading>
        ) : hasEdition ? (
          <Heading level={1} variant="none" tone="none">Today&rsquo;s wall<br />is being <em className="gold-shimmer">hung</em></Heading>
        ) : (
          <Heading level={1} variant="none" tone="none">The walls<br />are <em className="gold-shimmer">bare</em> today</Heading>
        )}

        <p className="sub">
          {sub
            ?? (hasEdition
              ? 'The day is written but the destination is not chosen yet.'
              : 'Nothing is re-hung from yesterday. The turner stays lit, and every earlier day is still hanging behind it.')}
        </p>

        {children}
      </div>
    </section>
  );
}
