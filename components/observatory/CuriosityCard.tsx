import { Chip, Meter, Rule } from '@/components/ds';
import type { ObservatoryData, SectionMeter } from '@/app/(dg)/parent-observatory/actions';
import { TOP_CONTENT_VISIBLE } from '@/lib/observatory/constants';
import { formatMinutes } from '@/lib/observatory/format';
import { EmptyNote } from './EmptyNote';
import { LedgerCard, LedgerCardHead } from './LedgerCard';
import styles from './observatory.module.css';

type TopContent = ObservatoryData['themes']['topContent'];

/**
 * F3 · Curiosity themes, over the trailing 30 days.
 *
 * The one card that is an addition to the Ledger mock rather than a port of it:
 * the mock's main column holds only the summary and the bookshelf, but the
 * paper's old For Parents card promised "Curiosity Themes" by name, and this
 * surface exists to keep those promises. (That card is gone — it was the last
 * reader-keyed read on the edition page, and removing it is what let the paper
 * be cached per day rather than per child; the observatory is where a grown-up
 * reads this now.) It is built entirely from the mock's own vocabulary.
 *
 * The expansion is a native <details>, so the full list ships with the page and
 * costs no client JavaScript — consistent with the no-new-API-routes rule. It
 * is the one control on this page with no primitive behind it: /design stamps
 * no disclosure, so the summary borrows the house label token and the shared
 * --focus-ring and nothing else.
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
    <LedgerCard className={styles.span2}>
      <LedgerCardHead kick="Curiosity themes" title="Where the month went" />

      {sections.length === 0 && topContent.length === 0 ? (
        <EmptyNote>Themes appear once there is a month of reading to look back on.</EmptyNote>
      ) : null}

      {sections.length > 0 ? (
        <div className={styles.meters} style={{ marginTop: 20 }}>
          {sections.map((meter) => (
            <div key={meter.section} className={styles.srow}>
              <span className={`type-body-ui text-primary ${styles.sname}`}>{meter.label}</span>
              <Meter value={meter.share} minVisible={4} />
              <span className={`type-caption ${styles.smin}`}>{meter.share}%</span>
            </div>
          ))}
        </div>
      ) : null}

      {visible.length > 0 ? (
        <>
          {sections.length > 0 ? <Rule className={styles.rule} /> : null}
          <p className={`type-caption ${styles.cardnote}`}>Opened most often</p>
          <div className={styles.chips}>
            {visible.map((item) => (
              <Chip key={item.key} className={styles.chip}>
                {item.label} · {formatMinutes(item.ms)}
              </Chip>
            ))}
          </div>
          {rest.length > 0 ? (
            <details className={styles.more}>
              <summary className="type-label-editorial text-accent-readable">
                {rest.length} more
              </summary>
              <div className={styles.chips}>
                {rest.map((item) => (
                  <Chip key={item.key} className={styles.chip}>
                    {item.label} · {formatMinutes(item.ms)}
                  </Chip>
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : null}
    </LedgerCard>
  );
}
