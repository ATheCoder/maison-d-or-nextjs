import type { CSSProperties } from 'react';

/**
 * MaisonPlate — a photograph that dissolves into the ground it stands on.
 *
 * The house's rule for pictures has always been that they should read as
 * light entering the page rather than as a photo pasted onto it, and
 * MaisonBlendedImage said so first. What it could not do is say it in tokens:
 * it feathers by painting `rgba(250,247,242,…)` — the LEGACY ivory — over the
 * picture, so a plate is only invisible on one ground, and lands as a pale
 * halo on parchment and as a grey fog on the espresso and navy interludes.
 *
 * This one feathers by MASK instead. The alpha ramp carries no colour at all,
 * so the same plate melts correctly into parchment, into sand, into espresso
 * and into navy with nothing to configure — which is the property every ds
 * primitive has, arrived at the same way: say the shape, let the surface
 * scope say the colour.
 *
 * `feather` names the edges that dissolve; an edge left out keeps its hard
 * crop, which is what a full-bleed plate and a framed one inside a card both
 * want. Adjoining edges intersect, so a corner fades once rather than twice
 * as dark.
 *
 * A plain <img>, deliberately, like the component it replaces: these plates
 * are art-directed at fixed aspect ratios by their call site's grid, and
 * next/image's layout machinery would fight the mask for the same box. The
 * call site's `className` dresses the wrapper — that is what carries the size
 * and the mask; the picture inside always fills it.
 */
type Edge = 'top' | 'right' | 'bottom' | 'left';

/* The ramp is deliberately long and deliberately eased — a short one reads as
   a gradient laid over a photograph, which is exactly the effect this exists
   to avoid. Black is opaque in a mask; `transparent` is the edge that is gone. */
const RAMP: Record<Edge, string> = {
  top: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 10%, #000 32%)',
  right: 'linear-gradient(to left, transparent 0%, rgba(0,0,0,0.35) 8%, #000 28%)',
  bottom: 'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.35) 10%, #000 32%)',
  left: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 8%, #000 28%)',
};

export default function MaisonPlate({
  src,
  alt,
  feather = [],
  position = 'center',
  className = '',
  style,
  loading = 'lazy',
}: {
  src: string;
  /** Empty only for a plate that is pure atmosphere and says nothing. */
  alt: string;
  feather?: Edge[];
  /** object-position, for the plates whose subject is not centred. */
  position?: string;
  className?: string;
  style?: CSSProperties;
  loading?: 'lazy' | 'eager';
}) {
  /* Two things about mask-composite that this had to learn the hard way, and
     both of them render the picture completely invisible when got wrong:

     · Unprefixed only. `-webkit-mask-composite` is not a harmless alias — it
       takes a DIFFERENT keyword set (source-in and friends, not intersect)
       and Chrome resolves both names onto the same property, so shipping the
       webkit line beside the standard one replaces `intersect` with
       `source-in` and composites the whole plate away. Every engine this app
       targets has had unprefixed mask-image and mask-composite for years.
     · The BOTTOM layer is `add`, not `intersect`. Each layer's operator
       composites it against the layers accumulated beneath it, and beneath
       the last one there is nothing — so `intersect` there means "this ramp ∩
       transparent", which is empty, and that emptiness then intersects its
       way up through every layer above. `add` seeds the stack with the ramp
       itself and the rest intersect onto it. With a single edge the list is
       just `add`, which is the correct no-op. */
  const ramps = feather.map((edge) => RAMP[edge]);
  const mask: CSSProperties = ramps.length
    ? {
        maskImage: ramps.join(', '),
        maskComposite: ramps
          .map((_, i) => (i === ramps.length - 1 ? 'add' : 'intersect'))
          .join(', '),
      }
    : {};

  return (
    <span
      className={`block h-full w-full overflow-hidden ${className}`}
      style={{ ...mask, ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className="block h-full w-full object-cover"
        style={{ objectPosition: position }}
      />
    </span>
  );
}
