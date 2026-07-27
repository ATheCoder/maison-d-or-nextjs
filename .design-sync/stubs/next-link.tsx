// design-sync stub for `next/link`.
// Preview cards render outside the Next.js runtime, so Link degrades to a
// plain anchor. Visual output is identical — Link renders an <a> too.
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string | { pathname?: string };
  children?: ReactNode;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
};

// Next 16 navigation-pending hook. Cards never navigate, so it never pends.
export function useLinkStatus(): { pending: boolean } {
  return { pending: false };
}

export default function Link({ href, children, prefetch, replace, scroll, shallow, ...rest }: LinkProps) {
  const to = typeof href === 'object' && href ? (href.pathname ?? '#') : (href ?? '#');
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
}
