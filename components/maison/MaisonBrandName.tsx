/**
 * MAISON D'ORE — PROTECTED BRAND WORDMARK COMPONENT
 * IMMUTABLE · DO NOT ALTER CASING OR SPELLING
 *
 * Canonical string:  Maison d'Ore
 *   default    → <MaisonBrandName /> styled React component
 *   BRAND_NAME → plain string for SEO / metadata / AI prompts
 */

// Single source of truth for the wordmark (inlined from the legacy
// lib/brandProtection module during the migration).
export const BRAND_NAME = "Maison d'Ore";

/**
 * Styled brand wordmark.
 * - "Maison d'" renders in the surrounding ink
 * - "Ore" renders with gold shimmer animation
 * Never wrap this in text-transform CSS — it will break the protected casing.
 *
 * The two halves used to be a hardcoded #8B7B6F and a gradient sweeping
 * through #FFD700, which meant the wordmark was the one thing on a page that
 * could not follow its surface: the taupe half sat wrong against the design
 * system's ink and the yellow peak belonged to no palette in this house. Both
 * are §1 tokens now — `currentColor` for the static half, so the wordmark
 * takes the ink of whatever heading or bar it sits in, and the accent pair
 * for the sweep, so the gold is the room's gold (bright on the espresso and
 * navy interludes, the family tone inside an atmosphere).
 *
 * The sweep itself is no longer written here. It is `.gold-shimmer` in
 * globals.css, worn by the two other places the house shows a gold half of a
 * phrase — the Daily Gold rail's wordmark and the gallery entrance heading.
 * This component is just the one that names which letters get it.
 */
export default function MaisonBrandName() {
  return (
    <span style={{ display: 'inline-block' }}>
      <span style={{ color: 'currentColor' }}>Maison d&apos;</span>
      <span className="gold-shimmer">Ore</span>
    </span>
  );
}
