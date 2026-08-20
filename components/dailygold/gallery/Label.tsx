'use client';
/**
 * Label — the single typographic unit of the whole gallery.
 *
 * Title / subtitle / metadata / body / action, hung from a hairline, always
 * *beneath* the work rather than printed over it. Every wall of this page is
 * this component at a different size; the eight card treatments the reading
 * column used to carry are gone, and this is what replaced all of them.
 *
 * Nothing here takes a colour or a size prop. The five slots are the whole
 * vocabulary, `size` picks the two scales, and the rest is GALLERY_CSS —
 * which is the point: a label that wants a sixth slot wants one of these five.
 *
 * The gold inks (`.s`, `.go`) resolve to `--accent-readable`, never bare
 * `--accent`. That is not a preference: on the five pale grounds bare gold is
 * 2.20–2.96:1 as small text, and this text is 9.5–13.5px.
 */
import type { ReactNode } from 'react';
import { Button } from '@/components/ds';

export default function Label({
  title,
  subtitle,
  meta,
  body,
  action,
  size = 'work',
  className = '',
}: {
  title: ReactNode;
  /** The italic line under the name: a role, a translation, a place. */
  subtitle?: ReactNode;
  /** The uppercase line: dates, a country, a rank. Never the only place something important is said — it is 9.5px. */
  meta?: ReactNode;
  /** A short paragraph. The lead work on a wall gets one; the satellites do not. */
  body?: ReactNode;
  /** The door: a button, a link, or the "not written yet" line. Rendered as given. */
  action?: ReactNode;
  /** `lead` is the wall's rank-one label. */
  size?: 'lead' | 'work';
  className?: string;
}) {
  return (
    <div className={`lab lab-rule${className ? ` ${className}` : ''}`}>
      <p className={size === 'lead' ? 't t-big' : 't'}>{title}</p>
      {subtitle && <p className="s">{subtitle}</p>}
      {meta && <p className="m">{meta}</p>}
      {body && <p className="b">{body}</p>}
      {action}
    </div>
  );
}

/**
 * The label's action line, where it is a real control. `as` is the element the
 * call site needs — a button for the walls that open a modal, a Link for the
 * portrait wall, which navigates.
 */
export function LabelAction({
  children,
  onClick,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
} & Record<string, unknown>) {
  return (
    <Button variant="bare" className="go" onClick={onClick} {...rest}>
      {children}
    </Button>
  );
}

/** The action line where there is nothing to open — says so, and is not a door. */
export function LabelNoAction({ children }: { children: ReactNode }) {
  return <span className="go go-none">{children}</span>;
}
