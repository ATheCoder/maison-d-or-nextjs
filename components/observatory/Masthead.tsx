import Link from 'next/link';
import { Avatar, Eyebrow, Heading, Prose, selectPillClasses } from '@/components/ds';
import type { ObservatoryChild } from '@/app/(dg)/parent-observatory/actions';
import styles from './observatory.module.css';

/**
 * Masthead and child switcher.
 *
 * The pills are plain links, one per profile. They *navigate* and never
 * juxtapose: at no point do two children's numbers appear on the same screen
 * (spec §6.2), which is why the switcher is a set of routes rather than a
 * filter over one shared dataset.
 *
 * A pill is `SelectPill`, worn as a class string because these navigate with
 * next/link — the same composition `buttonClasses` exists for. Note there is no
 * `selected` prop anywhere below: the coat paints itself from `aria-current`,
 * so the pill that LOOKS chosen is the pill that SAYS it is, and the two can no
 * longer disagree.
 *
 * The mark in front of the name is `Avatar`, which was written partly for this
 * call site — it names the pills in its own docstring — and it took a private
 * `initialOf` with it. It is drawn in MONOGRAM mode: the child's chosen emblem
 * is in `child.avatar` and would render if passed, but the mock's masthead has
 * always been initials and switching is a product decision, not a migration
 * one. `.avi` shrinks it to the mock's 26px, which is the documented way to
 * resize this primitive (its sizes are classes, not inline styles, precisely so
 * an unlayered stylesheet can win).
 */
export function Masthead({
  profiles,
  activeChildId,
  weekLabel,
}: {
  // Named `profiles`, not `children` — the latter is JSX's own slot, and a prop
  // that shadows it reads as page content rather than as a list of people.
  profiles: ObservatoryChild[];
  activeChildId?: string;
  weekLabel?: string;
}) {
  return (
    <header className={styles.masthead}>
      <Eyebrow rule={false} className={styles.kick}>
        Maison d&apos;Or&eacute; · Private · Family intelligence
      </Eyebrow>
      {/* variant="section", not the level's default hero: the ledger's title is
          42px in the mock and type-display-section (max 2.5rem) is the token it
          lands on. A hero here would be twice the height of the numbers it
          introduces. */}
      <Heading level={1} variant="section" className={styles.title}>
        The Parent Observatory
      </Heading>
      {weekLabel ? (
        <Prose variant="caption" measure={false} className={styles.weekline}>
          The week of {weekLabel}
        </Prose>
      ) : null}
      {profiles.length > 0 ? (
        <nav className={styles.pills} aria-label="Choose a child">
          {profiles.map((child) => {
            const isActive = child.id === activeChildId;
            return (
              <Link
                key={child.id}
                href={`/parent-observatory/${child.id}`}
                className={selectPillClasses()}
                aria-current={isActive ? 'page' : undefined}
              >
                <Avatar name={child.displayName} size="sm" ring className={styles.avi} />
                {child.displayName}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
