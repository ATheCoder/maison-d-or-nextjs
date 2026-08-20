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
 * WHERE THE LABEL STANDS depends on the ground, and this is the one place the
 * gallery reads the theme rather than the tokens. On espresso and navy the
 * label stands *in* the painting over a two-axis ramp, which is the mockup's
 * own entrance and the best thing in it. On the five lit grounds it hangs
 * beneath the painting instead: there the ramp has to build the whole readable
 * ground itself, and it bleaches most of the picture doing it — measured on
 * `06-gallery-themes.html`, the entrance is the one wall the light rooms
 * cannot afford. Both placements come out of GALLERY_CSS; this file states the
 * markup once and does not know which it got.
 *
 * The day navigator arrives as `children` — the page owns it, because turning
 * a page is a navigation and the router lives up there.
 */
import type { ReactNode } from 'react';
import { Heading } from '@/components/ds';
import DGThemeSwitcher from '@/components/dailygold/DGThemeSwitcher';

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
    <section className="gl-entry">
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
            targets [role="heading"] rather than h1. */}
        {place ? (
          <Heading level={1} variant="none" tone="none">Today the world<br />is in <em>{place}</em></Heading>
        ) : hasEdition ? (
          <Heading level={1} variant="none" tone="none">Today&rsquo;s wall<br />is being <em>hung</em></Heading>
        ) : (
          <Heading level={1} variant="none" tone="none">The walls<br />are <em>bare</em> today</Heading>
        )}

        <p className="sub">
          {sub
            ?? (hasEdition
              ? 'The day is written but the destination is not chosen yet.'
              : 'Nothing is re-hung from yesterday. The turner stays lit, and every earlier day is still hanging behind it.')}
        </p>

        {children}
      </div>

      <DGThemeSwitcher />
    </section>
  );
}
