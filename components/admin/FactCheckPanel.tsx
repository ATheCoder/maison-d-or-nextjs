'use client';
/**
 * The fact-check panel — where "factual accuracy is non-negotiable"
 * (docs/golden-stories-bible.md) becomes something the admin can look at.
 *
 * Three principles, all of them from the bible rather than from taste:
 *
 *  1. **It warns; it never blocks.** Nothing in here disables Publish, and the
 *     panel says so in as many words. The admin is the family's owner and the
 *     only user; a hard gate would cost more than it caught (Standing
 *     decision 2). What the panel owes them instead is a report they can read
 *     in ten seconds and act on in one click.
 *
 *  2. **A claim's verdict and its evidence are different questions.** `verdict`
 *     is what the sources say about the claim; `verified` is whether the source
 *     the model named is one the request actually read. They are independent,
 *     and the panel shows both, because a "supported" verdict resting on a URL
 *     nobody fetched is the least trustworthy row in the report and would
 *     otherwise look like the safest.
 *
 *  3. **Never checked is a normal state.** Most of the library predates the
 *     bible and is deliberately exempt (Standing decision 1). An unchecked book
 *     gets an invitation, not a warning.
 *
 * Every claim carries the dotted `fieldPath` it came from, so a finding is one
 * click from the field that has to change — a report you have to go hunting
 * through is a report that gets skimmed.
 */
import { useState } from 'react';
import { Button, Heading, TextLink } from '@/components/ds';
import styles from './PersonEditor.module.css';
import { factCheckCounts } from '@/lib/golden-story/factCheckCounts';
import type { FactCheckClaim, FactCheckReport, GenerationJobRow } from '@/src/db/schema';

type Verdict = FactCheckClaim['verdict'];

// How each verdict is named and coloured. "Reads as true" rather than
// "supported" throughout: the admin is deciding whether to publish something to
// their own children, not grading an essay.
const VERDICT: Record<Verdict, { label: string; chip: string; rank: number }> = {
  wrong:        { label: 'Contradicted', chip: styles.chipRed,   rank: 0 },
  unsupported:  { label: 'Nothing found', chip: styles.chipAmber, rank: 1 },
  unverifiable: { label: 'Could not check', chip: styles.chipInk, rank: 2 },
  supported:    { label: 'Checks out',    chip: styles.chipGreen, rank: 3 },
};

// The headline count comes from lib/golden-story/factCheckCounts — the same
// function the stored job result is built from, so the number on the button and
// the number in the job can never disagree about one report.
export { factCheckCounts } from '@/lib/golden-story/factCheckCounts';

/**
 * The header chip. It reports the worst thing found, because that is the only
 * number that changes what the admin does next.
 */
export function FactCheckChip({ report, running }: { report: FactCheckReport | null; running: boolean }) {
  const s = factCheckCounts(report);
  if (running) return <span className={`${styles.chip} ${styles.chipAmber}`}>checking…</span>;
  if (!s.checked) return <span className={`${styles.chip} ${styles.chipInk}`}>not checked</span>;
  if (s.wrong) return <span className={`${styles.chip} ${styles.chipRed}`}>{s.wrong} contradicted</span>;
  if (s.unsupported) return <span className={`${styles.chip} ${styles.chipAmber}`}>{s.unsupported} unsourced</span>;
  return <span className={`${styles.chip} ${styles.chipGreen}`}>checked</span>;
}

function ClaimRow({ claim, onGoToField }: { claim: FactCheckClaim; onGoToField?: (fieldPath: string) => void }) {
  const v = VERDICT[claim.verdict];
  return (
    <div className={styles.row} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className={`${styles.chip} ${v.chip}`}>{v.label}</span>
        {onGoToField ? (
          <Button variant="link" size="sm" onClick={() => onGoToField(claim.fieldPath)}>{claim.fieldLabel} ↗</Button>
        ) : (
          <span className={styles.muted} style={{ fontSize: 11.5 }}>{claim.fieldLabel}</span>
        )}
        {/* Evidence, kept visibly separate from the verdict — see (2) above. */}
        <span
          className={`${styles.chip} ${claim.verified ? styles.chipGreen : styles.chipAmber}`}
          style={{ marginLeft: 'auto' }}
          title={claim.verified
            ? 'The source below is one this check actually read.'
            : 'The model named this source but the check never read that page — treat the verdict with care.'}
        >{claim.verified ? 'source read' : 'source unconfirmed'}</span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>“{claim.claim}”</div>
      {claim.note && (
        <div className={styles.muted} style={{ fontSize: 12, lineHeight: 1.5 }}>{claim.note}</div>
      )}
      {claim.correction && (
        <div className={styles.callout} style={{ padding: '8px 11px', fontSize: 12, lineHeight: 1.5, color: 'var(--ink)' }}>
          <strong>The sources say:</strong> {claim.correction}
        </div>
      )}
      {claim.sourceUrl && (
        <TextLink
          href={claim.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          style={{ fontSize: 11.5, wordBreak: 'break-all' }}
        >{claim.sourceTitle || claim.sourceUrl}</TextLink>
      )}
    </div>
  );
}

export default function FactCheckPanel({
  personName, report, job, bookUpdatedAt, onRun, onDismiss, running, pending, error, onGoToField, onClose,
}: {
  personName: string;
  report: FactCheckReport | null;
  job: GenerationJobRow | null;
  /** The book's live updated_at, compared against the report's to spot staleness. */
  bookUpdatedAt: string | null;
  onRun: () => void;
  onDismiss: () => void;
  running: boolean;
  pending: boolean;
  error?: string;
  onGoToField?: (fieldPath: string) => void;
  onClose: () => void;
}) {
  // Default to hiding what checks out. A report is read to find problems, and
  // twenty green rows between two red ones is how a real finding gets missed.
  const [showAll, setShowAll] = useState(false);
  const s = factCheckCounts(report);
  const failed = job?.state === 'failed';
  const stage = job?.progress?.stages?.[0];

  const claims = (report?.claims ?? [])
    .slice()
    .sort((a, b) => VERDICT[a.verdict].rank - VERDICT[b.verdict].rank);
  const shown = showAll ? claims : claims.filter((c) => c.verdict !== 'supported');
  const hidden = claims.length - shown.length;

  // The book may have been edited since the report was written, which makes
  // every verdict a statement about text that no longer exists. The check
  // itself never stamps updated_at (see factcheckStore), so a difference here
  // is always a real edit and never the check's own footprint.
  const stale = !!(report?.bookUpdatedAt && bookUpdatedAt && report.bookUpdatedAt !== bookUpdatedAt);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(36,26,12,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1.5rem' }}>
      <div onClick={(e) => e.stopPropagation()} className={styles.panel} style={{ background: 'var(--ground)', padding: 22, width: 'min(760px, 100%)', maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div className={styles.kick}>Accuracy · retrieve → cross-check → decide</div>
          <Heading level={2} variant="story" className="mt-1.5">Fact-checking {personName}</Heading>
          <div className={styles.muted} style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>
            Every date, quote, relationship and anecdote in the book is searched for and ruled on against
            what the search actually read. The “If they were 10 today” narrative is skipped on purpose —
            that spread is imagination and says so — but its fact is checked.
          </div>
        </div>

        {running ? (
          <div className={styles.panel} style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{stage?.label ?? 'Reading the book'}</span>
              <span className={`${styles.chip} ${styles.chipAmber}`}>running</span>
            </div>
            <div className={styles.callout} style={{ padding: '9px 12px', fontSize: 11.5, color: 'var(--brown)' }}>
              One web search per passage, so this takes a few minutes. You can close this and carry on editing.
            </div>
            {/* A pass takes minutes and its only signal is this spinner, so a run
                that never starts — a lost event, a worker that was not listening
                when it was queued — is indistinguishable from a slow one. Without
                this the panel spins forever and the only way out is the database.
                `onRun` clears the stuck row before it queues a new one. */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button variant="link" size="sm" onClick={onRun} disabled={pending}>Not moving? Start over</Button>
            </div>
          </div>
        ) : failed ? (
          <div className={styles.panel} style={{ padding: 16, borderColor: 'rgba(181,83,58,.4)', background: 'rgba(181,83,58,.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--red)', marginBottom: 6 }}>The check couldn’t finish</div>
            <div className={styles.muted} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>{job?.error ?? 'The fact-checker failed. Nothing was changed.'}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="link" size="sm" onClick={onDismiss} disabled={pending}>Dismiss</Button>
              <Button variant="primary" size="sm" onClick={onRun} disabled={pending}>↻ Try again</Button>
            </div>
          </div>
        ) : !s.checked ? (
          <div className={styles.panel} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55 }}>
              This book has never been checked. Books written before the Golden Stories Bible are exempt by
              decision, so an unchecked older book is not a problem — but anything written since should be
              checked before it goes to families.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" size="sm" onClick={onRun} disabled={pending}>✦ Check this book</Button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {s.wrong > 0 && <span className={`${styles.chip} ${styles.chipRed}`}>{s.wrong} contradicted</span>}
              {s.unsupported > 0 && <span className={`${styles.chip} ${styles.chipAmber}`}>{s.unsupported} nothing found</span>}
              {s.unverifiable > 0 && <span className={`${styles.chip} ${styles.chipInk}`}>{s.unverifiable} could not check</span>}
              <span className={`${styles.chip} ${styles.chipGreen}`}>{s.supported} check out</span>
              <span className={styles.muted} style={{ marginLeft: 'auto', fontSize: 11.5 }}>
                {report?.checkedAt ? `Checked ${new Date(report.checkedAt).toLocaleString()}` : ''}
              </span>
            </div>

            {stale && (
              <div className={styles.callout} style={{ padding: '9px 12px', fontSize: 12, color: 'var(--brown)' }}>
                The book has been edited since this check — run it again before trusting these verdicts.
              </div>
            )}

            <div className={styles.callout} style={{ padding: '9px 12px', fontSize: 11.5, color: 'var(--brown)' }}>
              Nothing here blocks publishing. It is a second pair of eyes; the call is yours.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {shown.length === 0 ? (
                <div className={styles.muted} style={{ fontSize: 13, lineHeight: 1.55 }}>
                  Nothing to fix — every claim the check found was supported by what it read.
                </div>
              ) : shown.map((c, i) => <ClaimRow key={`${c.fieldPath}-${i}`} claim={c} onGoToField={onGoToField} />)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {hidden > 0 && (
                <Button variant="link" size="sm" onClick={() => setShowAll(true)}>Show the {hidden} that check out</Button>
              )}
              {showAll && <Button variant="link" size="sm" onClick={() => setShowAll(false)}>Hide what checks out</Button>}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={onRun} disabled={pending}>↻ Check again</Button>
              </span>
            </div>

            {(report?.sources.length ?? 0) > 0 && (
              <details>
                <summary className={styles.muted} style={{ fontSize: 11.5, cursor: 'pointer' }}>
                  Everything this check read ({report?.sources.length})
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 9 }}>
                  {report?.sources.map((src) => (
                    <TextLink key={src.url} href={src.url} target="_blank" rel="noreferrer noopener"
                      style={{ fontSize: 11.5, wordBreak: 'break-all' }}>
                      {src.title || src.url}
                    </TextLink>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="link" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
