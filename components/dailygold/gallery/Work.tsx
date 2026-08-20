'use client';
/**
 * Work — a painting hung on a wall.
 *
 * The frame, the painting, the gallery light, and the two things that hang on
 * a frame in this product: a country's flag seal, and the treasury heart. No
 * gradient wash, no scrim, no text over the paint — the label lives beneath
 * the work and is a separate component. That is the whole design.
 *
 * **The frame is the door.** Where a work opens something — a story route, a
 * modal — the painting itself is the control, and the seal and the heart hang
 * *beside* that control rather than inside it: a heart nested in a link is a
 * heart that navigates. Which is why the positioning context is the wrapper
 * and not the frame.
 *
 * Two behaviours the mockup never had to have:
 *
 * **The hairline frame** is not decoration. Hung unframed, a painting ends
 * where its own paint stops matching the wall, so each of the seven grounds
 * eats the edge of whichever works happen to match it in value — measured, the
 * lead portrait is 1.01:1 against espresso and 14.32:1 against parchment, and
 * the pale watercolours run it exactly backwards. One hairline closes it on
 * all seven at once. It lives in GALLERY_CSS on `.gl-art`.
 *
 * **The bare frame.** `imageUrl` is null far more often than the mockup
 * assumes: no edition in this corpus has a masthead painting, and no On This
 * Day event has one at all. So a work with no painting keeps its frame and
 * shows the wall inside it, with a small hairline lozenge — a canvas away for
 * restoration. Not an emoji, not a placeholder gradient, and not a hole.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ds';

export default function Work({
  imageUrl,
  alt = '',
  aspect,
  seal,
  heart,
  href,
  onClick,
  ariaLabel,
  prefetch,
  className = '',
  children,
}: {
  imageUrl?: string | null;
  /** Decorative by default: the label beneath the work already names it. */
  alt?: string;
  /** The frame's aspect, as CSS — '3 / 4' for a portrait, '4 / 3' for a scene. */
  aspect: string;
  /** A FlagSealMedallion, hung top-left. Rendered beside the door, never inside it. */
  seal?: ReactNode;
  /** A TreasuryHeart, hung top-right. Pass `onImage` on it — it sits over paint. */
  heart?: ReactNode;
  /** Makes the frame a link. Mutually exclusive with `onClick`. */
  href?: string;
  /** Makes the frame a button — the walls that open a modal. */
  onClick?: () => void;
  ariaLabel?: string;
  prefetch?: boolean;
  className?: string;
  /** Overlays that belong inside the door: the story-opening curtain. */
  children?: ReactNode;
}) {
  const bare = !imageUrl;
  const frame = (
    <div className={`gl-art${bare ? ' gl-art-bare' : ''}`} style={{ ['--ar' as string]: aspect }}>
      {imageUrl && <img src={imageUrl} alt={alt} />}
      {children}
    </div>
  );

  return (
    <div className={`gl-hung${className ? ` ${className}` : ''}`}>
      {href ? (
        <Link href={href} className="gl-door" aria-label={ariaLabel} onClick={onClick} prefetch={prefetch}>
          {frame}
        </Link>
      ) : onClick ? (
        <Button variant="bare" className="gl-door" onClick={onClick} aria-label={ariaLabel}>
          {frame}
        </Button>
      ) : frame}
      {seal && <span className="gl-seal">{seal}</span>}
      {heart && <span className="gl-heart">{heart}</span>}
    </div>
  );
}
