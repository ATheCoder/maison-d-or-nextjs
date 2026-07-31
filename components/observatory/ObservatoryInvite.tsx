import Link from 'next/link';
import { Masthead } from './Masthead';
import styles from './observatory.module.css';

/**
 * The zero-children state (spec §3).
 *
 * A guardian who has signed up but not yet made a profile has an observatory
 * with nothing to observe. Rather than render six empty cards — which would
 * look like a broken page, or worse like a child who reads nothing — the whole
 * surface collapses to one note pointing at the room where profiles are made.
 */
export function ObservatoryInvite() {
  return (
    <div className={styles.obs}>
      <div className={styles.shell}>
        <Masthead profiles={[]} />
        <hr className={`${styles.hairline} ${styles.mastheadRule}`} />
        <div className={styles.invite}>
          <p className={styles.inviteText}>
            There is no reader yet. Add a child profile in the Family room and their
            observatory will fill itself in as they read.
          </p>
          <Link href="/family" className={styles.inviteLink}>Go to the Family room</Link>
        </div>
      </div>
    </div>
  );
}
