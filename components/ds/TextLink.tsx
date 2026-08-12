import type { AnchorHTMLAttributes } from 'react';

/**
 * TextLink — the editorial link treatment for prose anchors, sharing its
 * dress with Button's link variant (which exists for link-shaped actions
 * that are really <button>s). Underlined at rest: colour is never the only
 * marker of a link, and the ink is accent-readable — the AA tier, never
 * bare gold. Hover deepens the ink to primary and thickens the underline;
 * both resolve per surface scope, so the same link is gold-bright on dark
 * grounds and the family's deep tone inside an atmosphere section.
 */
export default function TextLink({
  className = '',
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={
        'text-accent-readable underline underline-offset-3 transition-[color,text-decoration-thickness] duration-300 ' +
        'hover:text-primary hover:decoration-2 ' +
        'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring ' +
        className
      }
      {...rest}
    >
      {children}
    </a>
  );
}
