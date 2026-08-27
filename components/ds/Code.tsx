import type { HTMLAttributes, ReactNode } from 'react';

/**
 * Code — a string a person has to read character by character.
 *
 * Not "code" in the editorial sense; the house ships no documentation and
 * quotes no source. What it ships is three strings that a human has to check
 * or copy exactly: the one-time co-guardian invite link on /family and
 * /welcome, and the slug the admin must retype to delete a person. All three
 * were setting `font-family: monospace` by hand against a type scale that had
 * no mono token — which is what --face-mono and type-mono now are (see
 * globals.css §2.1 for why a third face was worth it, and why it is not a
 * third voice).
 *
 * Ink is text-primary, not type-caption's secondary. These strings ARE the
 * content at that moment — the link is the entire point of the panel it sits
 * in — and greying them would be the caption treatment applied to the thing
 * the caption is about.
 *
 * `break` is off by default and that default matters both ways. A slug inline
 * in a sentence must never shatter mid-word; a 90-character invite URL in a
 * flex row must, or it pushes the Copy button off the panel. There is no
 * heuristic that gets both right, so the call site says which it has.
 * `min-w-0` rides with it because break-all alone does not stop a flex child
 * from claiming its full intrinsic width.
 */
export default function Code({
  break: breakAll = false,
  className = '',
  children,
  ...rest
}: {
  /** For long unbroken strings inside a flex row — a URL, a token. */
  break?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'className'>) {
  return (
    <code
      className={`type-mono text-primary ${breakAll ? 'min-w-0 break-all ' : ''}${className}`}
      {...rest}
    >
      {children}
    </code>
  );
}
