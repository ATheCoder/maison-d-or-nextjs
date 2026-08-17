'use client';
/**
 * DGHeroImage — a card or modal's picture, with the gradient scrim that carries
 * it down into the card ground, and the quiet mark shown when the day has no
 * picture at all.
 *
 * Promoted verbatim from the local `Hero` in TreasuryItemModal, which was
 * already the right shape; the same three parts had been retyped at eight other
 * sites. The wrapper is the positioning context, so overlays — a rank badge, a
 * caption line — are passed as `children` and placed absolutely against it.
 *
 * `scrimFrom` is where the scrim starts being anything: `0` for the explore
 * cards (a wash over the whole image), `30` for the modals, `40` where the
 * headline sits close under the picture, `60` for the destination modal's tall
 * hero. It is per-site by design and each value is the one that site already
 * had.
 */
import type { ReactNode } from 'react';

export default function DGHeroImage({
  imageUrl,
  aspectRatio,
  fallbackMark,
  fallback,
  scrimFrom = 30,
  alt = '',
  children,
}: {
  imageUrl?: string | null;
  /** Sits on the image itself, so the hero is exactly as tall as its picture. */
  aspectRatio: string;
  /** The emoji shown in the default 4rem, 0.2-opacity mark when there is no picture. */
  fallbackMark?: string;
  /** Replaces that mark outright — a rank number, or an emoji at another size. */
  fallback?: ReactNode;
  /** Percent at which the scrim stops being transparent. */
  scrimFrom?: number;
  /** Decorative by default: the headline beside the picture already names it. */
  alt?: string;
  /** Absolutely-positioned overlays: rank badges, caption lines. */
  children?: ReactNode;
}) {
  return (
    <div style={{ position: 'relative', background: 'var(--surface-tint)' }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          style={{ display: 'block', width: '100%', aspectRatio, objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: '100%', aspectRatio,
          background: 'linear-gradient(135deg, var(--surface-tint) 0%, var(--surface-page) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {fallback ?? (fallbackMark
            ? <span aria-hidden="true" style={{ fontSize: '4rem', opacity: 0.2 }}>{fallbackMark}</span>
            : null)}
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent ${scrimFrom}%, var(--surface-raised) 100%)` }} />
      {children}
    </div>
  );
}
