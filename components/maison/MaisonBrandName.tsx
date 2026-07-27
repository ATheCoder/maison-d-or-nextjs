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
 * - "Maison d'" renders in warm static colour
 * - "Ore" renders with gold shimmer animation
 * Never wrap this in text-transform CSS — it will break the protected casing.
 */
export default function MaisonBrandName() {
  return (
    <span style={{ display: 'inline-block' }}>
      <span style={{ color: '#8B7B6F' }}>Maison d&apos;</span>
      <span
        style={{
          backgroundImage: 'linear-gradient(90deg, var(--gold), #FFD700, var(--gold))',
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
