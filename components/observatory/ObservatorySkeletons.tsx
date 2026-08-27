import { Eyebrow, Heading } from '@/components/ds';
import { SkeletonBar, SkeletonStatus, PARCHMENT_SKELETON_CSS } from '@/components/maison/ParchmentSkeleton';
import { LedgerCard } from './LedgerCard';
import styles from './observatory.module.css';

/**
 * The observatory's skeleton, in the two pieces the page actually loads in.
 *
 * ObservatoryLedger streams in stages — masthead first (one fast read), then
 * the ledger body (the heavy per-child read) — so each stage needs its own
 * Suspense fallback, and app/(dg)/parent-observatory/loading.tsx needs the two
 * of them stacked for the whole-page state. Extracting the fragments here is
 * what keeps those three frames identical: the route fallback, the masthead
 * fallback and the body fallback are the same markup by construction, so the
 * handoff from one to the next never shifts a pixel.
 *
 * Like the loading file this came from, the geometry is not copied literals:
 * the skeleton wears the page's own furniture — .masthead, .trio, .grid and the
 * real LedgerCard — so the paddings, the 1fr/380px split and every
 * container-query breakpoint cannot drift from the page by construction. Only
 * the shimmer bars are ghosts.
 *
 * The two pill ghosts are the one place a skeleton has to state a colour, since
 * a bar with no fill is an invisible bar. They state it in the same semantic
 * tokens the real pills use, so they re-scope with the theme rather than
 * staying gold on a navy page.
 */

/**
 * The masthead's ghost: the kick and the title are the page's own static
 * words; the week line and the two pills stand in for the data. No live
 * region of its own — whenever this is visible the body skeleton is visible
 * too, and one sentence per screen is the house rule (ParchmentSkeleton).
 */
export function MastheadSkeleton() {
  return (
    <header className={styles.masthead} aria-busy="true">
      <style>{PARCHMENT_SKELETON_CSS}</style>
      <Eyebrow rule={false} className={styles.kick}>
        Maison d&apos;Oré · Private · Family intelligence
      </Eyebrow>
      <Heading level={1} variant="section" className={styles.title}>
        The Parent Observatory
      </Heading>
      <div aria-hidden="true" style={{ display: 'contents' }}>
        {/* "The week of …" — type-caption at its own line-height */}
        <SkeletonBar w={190} h={20} />
        <div className={styles.pills}>
          <SkeletonBar
            w={120}
            h={34}
            radius={17}
            style={{
              background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
              border: '1px solid var(--accent)',
            }}
          />
          <SkeletonBar
            w={120}
            h={34}
            radius={17}
            style={{ background: 'transparent', border: '1px solid var(--border-accent)' }}
          />
        </div>
      </div>
    </header>
  );
}

/**
 * Everything below the masthead rule: the stat trio and the fixed
 * six-cards-plus-recap layout that models the common family. Carries the
 * screen's one loading announcement, since the body is the last thing to
 * arrive in every state this skeleton appears in.
 */
export function LedgerBodySkeleton() {
  return (
    <SkeletonStatus label="Opening the observatory">
      <div aria-hidden="true">
        <div className={styles.trio}>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <SkeletonBar w={64} h={40} style={{ margin: '0 auto' }} />
              <SkeletonBar w={90} h={15} style={{ margin: '6px auto 0' }} />
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          <div className={styles.column}>
            {/* Week: the bar chart and the section meters */}
            <LedgerCard as="div">
              <SkeletonBar w={110} h={15} style={{ marginBottom: 4 }} />
              <SkeletonBar w={170} h={30} />
              <SkeletonBar h={118} style={{ marginTop: 24 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <SkeletonBar w={132} h={20} style={{ flex: 'none' }} />
                    <SkeletonBar w="auto" h={5} radius={3} style={{ flex: 1 }} />
                    <SkeletonBar w={44} h={16} style={{ flex: 'none' }} />
                  </div>
                ))}
              </div>
            </LedgerCard>

            {/* Curiosity: the theme chips */}
            <LedgerCard as="div">
              <SkeletonBar w={110} h={15} style={{ marginBottom: 4 }} />
              <SkeletonBar w={150} h={30} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                {[104, 82, 116, 90, 76].map((w, i) => (
                  <SkeletonBar key={i} w={w} h={34} radius={20} />
                ))}
              </div>
            </LedgerCard>

            {/* Bookshelf: two spines with their titles */}
            <LedgerCard as="div">
              <SkeletonBar w={110} h={15} style={{ marginBottom: 4 }} />
              <SkeletonBar w={140} h={30} />
              {[0, 1].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0' }}>
                  <SkeletonBar w={34} h={48} radius="3px 6px 6px 3px" style={{ flex: 'none' }} />
                  <div style={{ flex: 1 }}>
                    <SkeletonBar w="60%" h={20} />
                    <SkeletonBar w="40%" h={16} style={{ marginTop: 6 }} />
                  </div>
                  <SkeletonBar w={90} h={28} radius={20} style={{ flex: 'none' }} />
                </div>
              ))}
            </LedgerCard>
          </div>

          <div className={styles.column}>
            {/* Rhythm: the sentence and the four day-bands */}
            <LedgerCard as="div">
              <SkeletonBar w={110} h={15} style={{ marginBottom: 4 }} />
              <SkeletonBar w="90%" h={22} style={{ marginTop: 10 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <SkeletonBar h={7} radius={4} />
                    <SkeletonBar w="80%" h={15} style={{ margin: '6px auto 0' }} />
                  </div>
                ))}
              </div>
            </LedgerCard>

            {/* Milestones: three dot-led lines */}
            <LedgerCard as="div">
              <SkeletonBar w={110} h={15} style={{ marginBottom: 4 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <SkeletonBar w={8} h={8} radius="50%" style={{ flex: 'none' }} />
                    <SkeletonBar w="85%" h={22} />
                  </div>
                ))}
              </div>
            </LedgerCard>

            {/* Starters: two champagne notes */}
            <LedgerCard as="div">
              <SkeletonBar w={110} h={15} style={{ marginBottom: 4 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {[0, 1].map((i) => (
                  <SkeletonBar
                    key={i}
                    h={92}
                    radius={12}
                    style={{ background: 'var(--surface-tint)', border: '1px solid var(--border-fine)' }}
                  />
                ))}
              </div>
            </LedgerCard>
          </div>
        </div>

        {/* The edition recap, full width below the columns */}
        <LedgerCard as="div" variant="wide">
          <SkeletonBar w={110} h={15} style={{ marginBottom: 4 }} />
          <SkeletonBar w={220} h={30} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonBar key={i} w={92} h={34} radius={20} />
            ))}
          </div>
        </LedgerCard>
      </div>
    </SkeletonStatus>
  );
}
