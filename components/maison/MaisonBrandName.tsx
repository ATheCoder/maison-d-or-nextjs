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
 * The sweep runs between --accent-readable and a whitened --accent rather
 * than between two decorative golds: at the header and footer sizes this is
 * small text, and the darker stops are what keep it legible there. At hero
 * size the bright peak is what carries it. Neither end names a raw palette
 * value, so a retune in globals.css moves the wordmark with the house.
 */
export default function MaisonBrandName() {
  return (
    <span style={{ display: 'inline-block' }}>
      <span style={{ color: 'currentColor' }}>Maison d&apos;</span>
      <span
        style={{
          backgroundImage:
            'linear-gradient(90deg, var(--accent-readable), color-mix(in srgb, var(--accent) 70%, white), var(--accent-readable))',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'shimmer 4s ease-in-out infinite',
          display: 'inline-block',
        }}
      >
        Ore
      </span>
    </span>
  );
}
