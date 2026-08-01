import type { ShelfBook, ShelfState } from '@/lib/observatory/derive';
import { EmptyNote } from './EmptyNote';
import styles from './observatory.module.css';

/** The mock gives each state its own spine and fill; state, not index, picks them. */
const SPINE: Record<ShelfState, string> = {
  reading: '',
  finished: styles.spineSage,
  set_aside: styles.spineTerracotta,
};

const FILL: Record<ShelfState, string> = {
  reading: '',
  finished: styles.fillSage,
  set_aside: styles.fillFaded,
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
    <section className={`${styles.card} ${styles.span2}`}>
      <p className={styles.cardkick}>Growth insights</p>
      <h2 className={styles.cardtitle}>The bookshelf</h2>

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
                <p className={styles.bktitle}>{book.title}</p>
                <p className={styles.bkmeta}>{book.meta}</p>
                <div className={`${styles.track} ${styles.bktrack}`}>
                  <div
                    className={`${styles.fill} ${FILL[book.state]}`}
                    style={{ width: `${book.fill}%` }}
                    // The bar is not progress, so it must not claim to be one to
                    // a screen reader either.
                    role="presentation"
                  />
                </div>
              </div>
              <span className={`${styles.state} ${book.state === 'finished' ? styles.stateFin : ''}`}>
                {book.stateLabel}
              </span>
            </div>
          ))}
        </div>
      )}

      {books.length > 0 ? (
        <p className={styles.cardnote} style={{ marginTop: 14 }}>
          Bars compare how much of {childName}&apos;s reading time each book has held — a book&apos;s
          total length isn&apos;t something the paper can know.
        </p>
      ) : null}
    </section>
  );
}
