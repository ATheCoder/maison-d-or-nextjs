import Link from 'next/link';
import type { ObservatoryChild } from '@/app/(dg)/parent-observatory/actions';
import styles from './observatory.module.css';

/** First character of the name, unicode-safe (a name may start with an emoji or a surrogate pair). */
export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? '·';
}

/**
 * Masthead and child switcher.
 *
 * The pills are plain links, one per profile. They *navigate* and never
 * juxtapose: at no point do two children's numbers appear on the same screen
 * (spec §6.2), which is why the switcher is a set of routes rather than a
 * filter over one shared dataset.
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
      <p className={styles.kick}>Maison d&apos;Oré · Private · Family intelligence</p>
      <h1 className={styles.title}>The Parent Observatory</h1>
      {weekLabel ? <p className={styles.weekline}>The week of {weekLabel}</p> : null}
      {profiles.length > 0 ? (
        <nav className={styles.pills} aria-label="Choose a child">
          {profiles.map((child) => {
            const isActive = child.id === activeChildId;
            return (
              <Link
                key={child.id}
                href={`/parent-observatory/${child.id}`}
                className={`${styles.pill} ${isActive ? styles.pillOn : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles.avi} aria-hidden="true">{initialOf(child.displayName)}</span>
                {child.displayName}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
