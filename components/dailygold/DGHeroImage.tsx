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
 *
 * `useTheme()` is called here rather than taking a `theme` prop: the hook falls
 * back to the default palette with no provider mounted, which is what lets the
 * design-sync previews render this standalone.
 */
import type { ReactNode } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';

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
  const { theme } = useTheme();
  return (
    <div style={{ position: 'relative', background: theme.bgSoft }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          style={{ display: 'block', width: '100%', aspectRatio, objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: '100%', aspectRatio,
          background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {fallback ?? (fallbackMark
            ? <span aria-hidden="true" style={{ fontSize: '4rem', opacity: 0.2 }}>{fallbackMark}</span>
            : null)}
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent ${scrimFrom}%, ${theme.bgCard} 100%)` }} />
      {children}
    </div>
  );
}
