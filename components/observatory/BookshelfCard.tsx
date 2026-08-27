import { Chip, Meter, Prose } from '@/components/ds';
import type { ShelfBook, ShelfState } from '@/lib/observatory/derive';
import { EmptyNote } from './EmptyNote';
import { LedgerCard, LedgerCardHead } from './LedgerCard';
import styles from './observatory.module.css';

/*
 * The mock coded the three states gold / sage / terracotta. The token system
 * names exactly two colour meanings — --accent for action and attention, and
 * --danger for errors — and "set aside" is emphatically not an error; the
 * docstring below is entirely about not turning it into one. So the states are
 * told apart by WEIGHT rather than by hue: finished is the accent at full
 * strength, reading is the accent held back, set aside recedes into the faint
 * ink. That reads on all seven themes, which a hardcoded sage did not.
 */
const SPINE: Record<ShelfState, string> = {
  reading: '',
  finished: styles.spineStrong,
  set_aside: styles.spineFaded,
};

/* Only two fills, not three: `reading` and `finished` were already the same
   colour — the accent at full strength — and the weight that tells them apart
   lives on the spine. A third entry that duplicated the first was a variant
   pretending to be information. */
const FILL: Record<ShelfState, 'accent' | 'faint'> = {
  reading: 'accent',
  finished: 'accent',
  set_aside: 'faint',
};

/**
 * F4 · Growth insights, the bookshelf.
 *
 * **The progress track is relative attention, not progress through the book.**
 * A story's total page count is unknowable from the data — page numbering is
 * orientation-dependent (a leaf in portrait, a spread in landscape:
 * components/dailygold/GoldenStory.jsx:606-610) and no page-count column
 * exists — so the mock's "14 of 22 pages" cannot be reproduced honestly. The
 * bar therefore shows how much of *this child's own reading time* went to each
 * book, and every literally-true number lives in the meta line beneath it. Do
 * not "fix" this back into a fraction: there is no denominator to divide by.
 *
 * "Set aside" is deliberate wording. A child who put a book down did not fail
 * at it, and "abandoned" would turn this card into a report card.
 */
export function BookshelfCard({ books, childName }: { books: ShelfBook[]; childName: string }) {
  return (
    <LedgerCard className={styles.span2}>
      <LedgerCardHead kick="Growth insights" title="The bookshelf" />

      {books.length === 0 ? (
        <EmptyNote>The bookshelf is waiting for a first story.</EmptyNote>
      ) : (
        <div className={styles.shelf}>
          {books.map((book) => (
            <div key={book.storyId} className={styles.bkrow}>
              {/* The real cover when the book has one, the painted spine when it
                  doesn't — and the painted spine stays underneath either way, so
                  a cover that fails to load leaves a book rather than a hole.
                  Decorative: the title is already the row's next line. */}
              <div
                className={`${styles.spine} ${SPINE[book.state]} ${book.coverUrl ? styles.spineCover : ''}`}
                aria-hidden="true"
              >
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.spineImg} src={book.coverUrl} alt="" loading="lazy" />
                ) : null}
              </div>
              <div className={styles.bkbody}>
                {/* The small-Fraunces idiom: a type token's size with the display
                    face, which is what the house does where the scale has no
                    entry of its own. */}
                <p className={`type-body-ui font-display text-primary ${styles.bktitle}`}>
                  {book.title}
                </p>
                <p className={`type-caption ${styles.bkmeta}`}>{book.meta}</p>
                {/* No `label`, and that is the whole point of the Meter API:
                    a labelled meter becomes an announced progressbar, and this
                    bar is a book's share of this child's reading time, not
                    progress through the book. There is no denominator to
                    divide by, so there is nothing honest to announce. */}
                <Meter value={book.fill} tone={FILL[book.state]} className={styles.bktrack} />
              </div>
              <Chip className={`${styles.state} ${book.state === 'finished' ? styles.stateFin : ''}`}>
                {book.stateLabel}
              </Chip>
            </div>
          ))}
        </div>
      )}

      {books.length > 0 ? (
        <Prose variant="caption" measure={false} className={styles.cardnote} style={{ marginTop: 14 }}>
          Bars compare how much of {childName}&apos;s reading time each book has held — a book&apos;s
          total length isn&apos;t something the paper can know.
        </Prose>
      ) : null}
    </LedgerCard>
  );
}
