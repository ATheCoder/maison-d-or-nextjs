import { AVATARS, type AvatarKey } from '@/lib/avatars';

/**
 * Avatar — the circular mark that stands for a person.
 *
 * It arrived after being hand-rolled in seven files at five different
 * diameters and four different ring strengths: FamilyManager (twice —
 * the roster row and the emblem picker), WelcomeWizard, ProfilePicker,
 * DGNavigationRail, DGIdentityHeader, ChildSwitcherOverlay and
 * ProfileSwitchCurtain. None of them was wrong; they had simply never been
 * asked to agree.
 *
 * ── Three things it can be ────────────────────────────────────────────────
 * `avatar` — a child's chosen emblem, from lib/avatars.ts.
 * `name`   — a monogram: the first character of a name, in the display face
 *            on --surface-tint. The observatory's child pills draw this
 *            today, and the profile picker wants it wherever a family has
 *            not chosen an emblem.
 * neither  — the grown-up's key. A room with no reader in it still has
 *            somebody in it, and DGIdentityHeader open-codes exactly this
 *            fallback (`{ emoji: '🗝️', bg: 'var(--surface-tint)' }`).
 *
 * ── The one hex in components/ds, and why it is allowed ───────────────────
 * The barrel's rule is that no primitive carries a raw --palette-* value or a
 * hex literal, because a colour that cannot re-scope is a colour the themes
 * cannot reach. The emblem grounds break that rule on purpose: they are
 * CONTENT, not palette — an illustration table sitting beside the emoji it
 * tints, the same way a photograph's pixels are content. A fox on peach is a
 * fox on peach in the evening room too. What re-scopes here is everything the
 * house owns: the ring, the monogram's ground, the monogram's ink.
 *
 * ── Sizes are classes, not inline styles ──────────────────────────────────
 * Deliberate, and load-bearing: Tailwind utilities are layered, so the rail's
 * unlayered `.dg-rail-av` can still shrink this to 28px at its breakpoint
 * without an !important. An inline width/height could not be overridden at
 * all, and the rail's responsive shrink would have had to move in here — a
 * primitive growing a breakpoint that belongs to one call site's stylesheet.
 *
 * ── Two ring states, not four ─────────────────────────────────────────────
 * The wild had 30%, 50%, 70% and a solid 2.5px. `ring` is the house edge and
 * `selected` is the choice mark, and the switcher's 30/70 pair collapses onto
 * them. That is a flattening, and it is the point: three strengths of the
 * same hairline is not information anybody was reading.
 *
 * Always aria-hidden. An avatar is never the accessible name of anything —
 * the row, the button or the menu item around it says who this is, and a
 * screen reader announcing "fox emoji" before the name is noise. If a call
 * site has no text beside it, the fix is a label on the control, not here.
 */
type AvatarSize = 'sm' | 'md' | 'lg';

/* Spelled out rather than interpolated: Tailwind v4 scans source text.
   32 / 40 / 48 — the sizes the seven call sites rounded to. */
const SIZE: Record<AvatarSize, string> = {
  sm: 'size-8 text-[0.9rem]',
  md: 'size-10 text-[1.05rem]',
  lg: 'size-12 text-[1.3rem]',
};

/** First character of a name, unicode-safe — a name may open on an emoji or a surrogate pair. */
function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? '·';
}

export default function Avatar({
  avatar,
  name,
  size = 'md',
  ring = false,
  selected = false,
  className = '',
}: {
  /** A child's emblem key. Anything unrecognised falls back to `sun`. */
  avatar?: string | null;
  /** Draw a monogram instead — used when there is no emblem to show. */
  name?: string;
  size?: AvatarSize;
  /** The house edge: a hairline at --accent 50%. */
  ring?: boolean;
  /** The choice mark: 2.5px solid --accent. Wins over `ring`. */
  selected?: boolean;
  className?: string;
}) {
  const emblem = avatar != null ? (AVATARS[avatar as AvatarKey] ?? AVATARS.sun) : null;
  const border = selected
    ? '2.5px solid var(--accent)'
    : ring
      ? '1.5px solid color-mix(in srgb, var(--accent) 50%, transparent)'
      : undefined;

  return (
    <span
      aria-hidden
      className={
        `inline-flex shrink-0 items-center justify-center rounded-full ${SIZE[size]} ` +
        // The monogram is set in the display face — it is a letter standing in
        // for a person, which is the one job the serif does everywhere else.
        `${emblem ? '' : 'font-display text-primary '}${className}`
      }
      style={{
        background: emblem ? emblem.bg : 'var(--surface-tint)',
        border,
      }}
    >
      {emblem ? emblem.emoji : name ? initialOf(name) : '\u{1F5DD}\u{FE0F}'}
    </span>
  );
}
