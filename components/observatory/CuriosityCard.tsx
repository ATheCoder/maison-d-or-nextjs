import type { ObservatoryData, SectionMeter } from '@/app/(dg)/parent-observatory/actions';
import { TOP_CONTENT_VISIBLE } from '@/lib/observatory/constants';
import { formatMinutes } from '@/lib/observatory/format';
import { EmptyNote } from './EmptyNote';
import styles from './observatory.module.css';

type TopContent = ObservatoryData['themes']['topContent'];

/**
 * F3 · Curiosity themes, over the trailing 30 days.
 *
 * The one card that is an addition to the Ledger mock rather than a port of it:
 * the mock's main column holds only the summary and the bookshelf, but
 * DGForParents promises "Curiosity Themes" by name
 * (components/dailygold/DGForParents.jsx), and this surface exists to keep those
 * promises. It is built entirely from the mock's own vocabulary.
 *
 * The expansion is a native <details>, so the full list ships with the page and
 * costs no client JavaScript — consistent with the no-new-API-routes rule.
 */
export function CuriosityCard({
  sections,
  topContent,
}: {
  sections: SectionMeter[];
  topContent: TopContent;
}) {
  const visible = topContent.slice(0, TOP_CONTENT_VISIBLE);
  const rest = topContent.slice(TOP_CONTENT_VISIBLE);

  return (
    <section className={`${styles.card} ${styles.span2}`}>
      <p className={styles.cardkick}>Curiosity themes</p>
      <h2 className={styles.cardtitle}>Where the month went</h2>

      {sections.length === 0 && topContent.length === 0 ? (
        <EmptyNote>Themes appear once there is a month of reading to look back on.</EmptyNote>
      ) : null}

      {sections.length > 0 ? (
        <div className={styles.meters} style={{ marginTop: 20 }}>
          {sections.map((meter) => (
            <div key={meter.section} className={styles.srow}>
              <span className={styles.sname}>{meter.label}</span>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${Math.max(4, meter.share)}%` }} />
              </div>
              <span className={styles.smin}>{meter.share}%</span>
            </div>
          ))}
        </div>
      ) : null}

      {visible.length > 0 ? (
        <>
          {sections.length > 0 ? <hr className={`${styles.hairline} ${styles.rule}`} /> : null}
          <p className={styles.cardnote}>Opened most often</p>
          <div className={styles.chips}>
            {visible.map((item) => (
              <span key={item.key} className={styles.chip}>
                {item.label} · {formatMinutes(item.ms)}
              </span>
            ))}
          </div>
          {rest.length > 0 ? (
            <details className={styles.more}>
              <summary>{rest.length} more</summary>
              <div className={styles.chips}>
                {rest.map((item) => (
                  <span key={item.key} className={styles.chip}>
                    {item.label} · {formatMinutes(item.ms)}
                  </span>
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
