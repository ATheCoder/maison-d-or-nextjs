import type { CSSProperties } from 'react';

/**
 * MaisonBlendedImage
 * Global image presentation rule for Maison d'Ore:
 * Images should feel like light and atmosphere entering the page —
 * not like a photo pasted onto a website.
 *
 * Uses a plain <img> (not next/image) so external, remotely-hosted
 * artwork works without configuring remotePatterns.
 */
interface MaisonBlendedImageProps {
  src: string;
  alt?: string;
  height?: string;
  width?: string;
  objectPos?: string;
  fadeLeft?: boolean;
  fadeRight?: boolean;
  fadeTop?: boolean;
  fadeBottom?: boolean;
  fadeStrength?: number;
  bg?: string;
  className?: string;
  style?: CSSProperties;
  animate?: boolean;
}

export default function MaisonBlendedImage({
  src,
  alt = '',
  height = '100%',
  width = '100%',
  objectPos = 'center',
  fadeLeft = true,
  fadeRight = false,
  fadeTop = false,
  fadeBottom = true,
  fadeStrength = 40,
  bg = 'var(--ivory)',
  className = '',
  style = {},
  animate = false,
}: MaisonBlendedImageProps) {
  if (!src) return null;

  // Build gradient layers
  const gradients: string[] = [];

  if (fadeLeft) {
    gradients.push(
      `linear-gradient(to right, ${bg} 0%, rgba(250,247,242,0.55) ${Math.round(fadeStrength * 0.55)}%, rgba(250,247,242,0.15) ${fadeStrength}%, transparent ${Math.round(fadeStrength * 1.6)}%)`
    );
  }
  if (fadeRight) {
    gradients.push(
      `linear-gradient(to left, ${bg} 0%, rgba(250,247,242,0.55) ${Math.round(fadeStrength * 0.55)}%, rgba(250,247,242,0.15) ${fadeStrength}%, transparent ${Math.round(fadeStrength * 1.6)}%)`
    );
  }
  if (fadeTop) {
    gradients.push(
      `linear-gradient(to bottom, ${bg} 0%, rgba(250,247,242,0.4) ${Math.round(fadeStrength * 0.4)}%, transparent ${fadeStrength}%)`
    );
  }
  if (fadeBottom) {
    gradients.push(
      `linear-gradient(to top, ${bg} 0%, rgba(250,247,242,0.5) ${Math.round(fadeStrength * 0.5)}%, transparent ${fadeStrength}%)`
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        width,
        height,
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`${animate ? 'hero-breathe' : ''} ${className}`.trim()}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: objectPos,
          display: 'block',
        }}
      />
      {/* Gradient masks — layered for soft feathered edges */}
      {gradients.map((g, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            background: g,
            pointerEvents: 'none',
          }}
        />
      ))}
      {/* Subtle warm atmospheric veil */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(250,244,235,0.05)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
