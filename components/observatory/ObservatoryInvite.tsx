import Link from 'next/link';
import { buttonClasses, Card, Prose } from '@/components/ds';
import styles from './observatory.module.css';

/**
 * The zero-children state (spec §3).
 *
 * A guardian who has signed up but not yet made a profile has an observatory
 * with nothing to observe. Rather than render six empty cards — which would
 * look like a broken page, or worse like a child who reads nothing — the whole
 * body collapses to one note pointing at the room where profiles are made.
 *
 * Just the note: this renders inside ObservatoryLedger's body stage, which
 * already provides the frame and the (pill-less) masthead above it.
 *
 * The call to action navigates in-app, so it is a next/link wearing
 * `buttonClasses` rather than a `Button href` — the house pattern for "a link
 * that looks like a button" that also has to keep client navigation. It takes
 * the real primary coat, which means it is espresso-filled on parchment and
 * gold on the interludes, where the old hand-painted gold pill was gold
 * everywhere.
 */
export function ObservatoryInvite() {
  return (
    <Card tone="tint" bordered radius="lg" padding="none" className={styles.invite}>
      <Prose variant="body-ui" tone="primary" className={`mx-auto ${styles.inviteText}`}>
        There is no reader yet. Add a child profile in the Family room and their
        observatory will fill itself in as they read.
      </Prose>
      <Link href="/family" className={buttonClasses()}>
        Go to the Family room
      </Link>
    </Card>
  );
}
