import { SkeletonBar, PARCHMENT_SKELETON_CSS } from '@/components/maison/ParchmentSkeleton';
import styles from '@/components/observatory/observatory.module.css';

/**
 * Suspense fallback for the observatory — both the index (which only
 * redirects to the first child) and /parent-observatory/[childId] beneath
 * it, so a rail press shows one unbroken frame across the redirect hop.
 *
 * Unlike the other loading files this one does not copy literals: the
 * ledger's geometry lives in observatory.module.css, and the skeleton wears
 * the same classes — .obs, .shell, .masthead, .trio, .grid, .card — so the
 * paddings, the 1fr/380px split and every container-query breakpoint cannot
 * drift from the page by construction. Only the shimmer bars are ghosts.
 *
 * The kick and the title are the masthead's own static words; the child
 * pills, the stat trio and the card interiors are the data's news. Two pills
 * and the fixed six-cards-plus-recap layout model the common family.
 *
 * Not SkeletonStatus: the a11y wrapper cannot carry the .obs class, so the
 * role/label live here directly — same contract, one sentence per screen.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={styles.obs}>
      <style>{PARCHMENT_SKELETON_CSS}</style>
      <span style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
      }}>
        Opening the observatory
      </span>

      <div className={styles.shell} style={{ animation: 'mdoSkelFade 0.3s ease-out' }} aria-hidden="true">
        <header className={styles.masthead}>
          <p className={styles.kick}>Maison d&apos;Oré · Private · Family intelligence</p>
          <h1 className={styles.title}>The Parent Observatory</h1>
          {/* "The week of …" — 13px at the body's line-height */}
          <SkeletonBar w={190} h={23} />
          <div className={styles.pills}>
            <SkeletonBar w={120} h={34} radius={17} style={{ background: 'rgba(200,169,107,0.14)', border: '1px solid #c8a96b' }} />
            <SkeletonBar w={120} h={34} radius={17} style={{ background: 'transparent', border: '1px solid rgba(200,169,107,0.45)' }} />
          </div>
        </header>

        <hr className={`${styles.hairline} ${styles.mastheadRule}`} />

        <div className={styles.trio}>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <SkeletonBar w={64} h={34} style={{ margin: '0 auto' }} />
              <SkeletonBar w={90} h={12} style={{ margin: '6px auto 0' }} />
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          <div className={styles.column}>
            {/* Week: the bar chart and the section meters */}
            <div className={styles.card}>
              <SkeletonBar w={100} h={10} style={{ marginBottom: 4 }} />
              <SkeletonBar w={170} h={24} />
              <SkeletonBar h={110} style={{ marginTop: 24 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <SkeletonBar w={128} h={13} style={{ flex: 'none' }} />
                    <SkeletonBar w="auto" h={5} radius={3} style={{ flex: 1 }} />
                    <SkeletonBar w={44} h={12} style={{ flex: 'none' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Curiosity: the theme chips */}
            <div className={styles.card}>
              <SkeletonBar w={100} h={10} style={{ marginBottom: 4 }} />
              <SkeletonBar w={150} h={24} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                {[86, 64, 98, 72, 58].map((w, i) => (
                  <SkeletonBar key={i} w={w} h={30} radius={20} />
                ))}
              </div>
            </div>

            {/* Bookshelf: two spines with their titles */}
            <div className={styles.card}>
              <SkeletonBar w={100} h={10} style={{ marginBottom: 4 }} />
              <SkeletonBar w={140} h={24} />
              {[0, 1].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0' }}>
                  <SkeletonBar w={34} h={48} radius="3px 6px 6px 3px" style={{ flex: 'none' }} />
                  <div style={{ flex: 1 }}>
                    <SkeletonBar w="60%" h={15} />
                    <SkeletonBar w="40%" h={11} style={{ marginTop: 6 }} />
                  </div>
                  <SkeletonBar w={70} h={22} radius={20} style={{ flex: 'none' }} />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.column}>
            {/* Rhythm: the sentence and the four day-bands */}
            <div className={styles.card}>
              <SkeletonBar w={100} h={10} style={{ marginBottom: 4 }} />
              <SkeletonBar w={120} h={24} />
              <SkeletonBar w="90%" h={14} style={{ marginTop: 10 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <SkeletonBar h={7} radius={4} />
                    <SkeletonBar w="80%" h={9} style={{ margin: '6px auto 0' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones: three dot-led lines */}
            <div className={styles.card}>
              <SkeletonBar w={100} h={10} style={{ marginBottom: 4 }} />
              <SkeletonBar w={130} h={24} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <SkeletonBar w={8} h={8} radius="50%" style={{ flex: 'none' }} />
                    <SkeletonBar w="85%" h={13} />
                  </div>
                ))}
              </div>
            </div>

            {/* Starters: two champagne notes */}
            <div className={styles.card}>
              <SkeletonBar w={100} h={10} style={{ marginBottom: 4 }} />
              <SkeletonBar w={190} h={24} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {[0, 1].map((i) => (
                  <SkeletonBar key={i} h={74} radius={12} style={{ background: 'rgba(243,233,216,0.9)', border: '1px solid rgba(200,169,107,0.35)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* The edition recap, full width below the columns */}
        <div className={`${styles.card} ${styles.cardWide}`}>
          <SkeletonBar w={100} h={10} style={{ marginBottom: 4 }} />
          <SkeletonBar w={220} h={24} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonBar key={i} w={92} h={30} radius={20} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
