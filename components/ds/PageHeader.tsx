import type { ReactNode } from 'react';
import Eyebrow from './Eyebrow';
import Heading from './Heading';
import Prose from './Prose';

/**
 * PageHeader — what a room says before it says anything else: where you are,
 * whose it is, and the one or two verbs that belong to the room rather than
 * to any section of it.
 *
 * /admin and /family had written this identically — an unruled Eyebrow, a
 * level-1 heading at the SECTION scale, and a flex row pushing the account
 * verbs to the far edge — which is the pattern worth naming.
 *
 * ── Why the title is `variant="section"` and not the level's default ──────
 * `Heading` defaults level 1 to `type-display-hero`, which is right for a
 * front door and wrong for a room: the hero runs to 4.75rem, and a room's
 * title introduces a working screen rather than opening a story. Both call
 * sites had already overridden it the same way, and the observatory's
 * masthead carries a comment making the same argument in its own words. So
 * `section` is the default here, and `variant` is still open for the room
 * that genuinely wants the hero.
 *
 * ── What it is not ────────────────────────────────────────────────────────
 * Not PageSection. That is a page's CONTENT band — eyebrow, lede, a
 * Container and vertical rhythm — and it has no title and no actions slot
 * because a section is not a place, it is a part of one.
 *
 * Not the observatory's Masthead either, and that room should keep its own:
 * it is centred, it carries a week line and a child-pill nav underneath, and
 * bending this to fit would mean two layout modes and an alignment prop that
 * one caller uses. A header that different is a different header.
 *
 * `items-end` rather than baseline or centre: the actions are controls with
 * boxes, and aligning a 36px button to the baseline of a 40px serif leaves it
 * floating. Bottoms line up; that is what reads as a row.
 */
export default function PageHeader({
  eyebrow,
  title,
  variant = 'section',
  lede,
  actions,
  className = '',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  variant?: 'hero' | 'section' | 'story';
  /** A line under the title, for rooms that need to say what they are for. */
  lede?: ReactNode;
  /** The room's own verbs — Sign out, a link to a sibling room. */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        {eyebrow != null && <Eyebrow rule={false}>{eyebrow}</Eyebrow>}
        <Heading level={1} variant={variant} className={eyebrow != null ? 'mt-2' : ''}>
          {title}
        </Heading>
        {lede != null && (
          <Prose variant="caption" measure={false} className="mt-2">
            {lede}
          </Prose>
        )}
      </div>
      {/* A wrapper even when empty would leave a gap-4 hole on the right of
          every header that has no verbs. */}
      {actions != null && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
