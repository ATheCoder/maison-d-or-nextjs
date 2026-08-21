import type { AnchorHTMLAttributes, ElementType } from 'react';

/**
 * TextLink — the editorial link treatment for prose anchors, sharing its
 * dress with Button's link variant (which exists for link-shaped actions
 * that are really <button>s). Underlined at rest: colour is never the only
 * marker of a link, and the ink is accent-readable — the AA tier, never
 * bare gold. Hover deepens the ink to primary and thickens the underline;
 * both resolve per surface scope, so the same link is gold-bright on dark
 * grounds and the family's deep tone inside an atmosphere section.
 *
 * `as` takes the tag — almost always next/link's <Link>, for a prose link
 * that goes somewhere inside the app. Without it the choice was between a
 * raw <a> (no client navigation, no prefetch) and a <Link> wearing a
 * hand-copied version of the three lines above, and the admin desk's prose
 * is full of exactly this: "edited in the almanac and the people library".
 * Same reasoning, and the same shape, as `buttonClasses` on the Button side —
 * a primitive that cannot be worn by a router link is a primitive the router
 * links will quietly stop wearing. Default stays a plain <a> so an external
 * link needs nothing.
 */
export default function TextLink({
  as: Tag = 'a' as ElementType,
  className = '',
  children,
  ...rest
}: { as?: ElementType } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Tag
      className={
        'text-accent-readable underline underline-offset-3 transition-[color,text-decoration-thickness] duration-300 ' +
        'hover:text-primary hover:decoration-2 ' +
        'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring ' +
        className
      }
      {...rest}
    >
      {children}
    </Tag>
  );
}
