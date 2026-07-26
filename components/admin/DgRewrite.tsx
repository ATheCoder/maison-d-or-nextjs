'use client';
/**
 * Per-field rewrite (§8.1) — the person editor's idiom, one component.
 *
 * A small ✦ beside the field label, and when a proposal lands, **CURRENT beside
 * AI-PROPOSES** with Accept and Reject. Never an in-place replacement: the
 * point of the pattern is that the admin reads both and chooses, so the current
 * text is captured when the ask is made and shown unchanged while they read.
 *
 * Accepting writes through the caller's own save path rather than a special AI
 * one — an accepted proposal is ordinary text in an ordinary field from the
 * moment it lands, which is also what makes it editable afterwards (R4.20).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GenerationJobRow } from '@/src/db/schema';
import { startDgRewrite, dismissDgJob } from '@/app/admin/daily-gold/aiActions';
import type { DgSubjectRef } from '@/lib/inngest/client';

export type RewriteJob = Pick<GenerationJobRow, 'id' | 'state' | 'progress' | 'result' | 'error'>;

/** The proposal for one field, out of whatever jobs are in flight. */
export function jobForField(jobs: RewriteJob[], fieldPath: string): RewriteJob | null {
  return jobs.find((j) => j.progress?.fieldPath === fieldPath || j.result?.fieldPath === fieldPath) ?? null;
}

export function RewriteButton({ subject, fieldPath, current, context, job, onStarted, onError }: {
  subject: DgSubjectRef;
  fieldPath: string;
  /** The live editor value — autosave may not have flushed it yet. */
  current: string;
  /** What the surrounding row makes true: the destination, the year. */
  context?: string;
  job: RewriteJob | null;
  onStarted: () => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const running = job?.state === 'running';

  if (job && job.state !== 'running') return null; // the review panel is showing

  return (
    <button
      className="btn btn-sm btn-ghost"
      style={{ color: 'var(--gold-deep)' }}
      disabled={busy || running || !current.trim()}
      title={current.trim() ? 'Draft an alternative' : 'Write a first version first'}
      onClick={() => {
        setBusy(true);
        void startDgRewrite(subject, fieldPath, current, context)
          .then((res) => { if (!res.ok) onError(res.error ?? 'Could not start the rewrite.'); else onStarted(); })
          .finally(() => setBusy(false));
      }}
    >
      {running ? '✦ drafting…' : '✦ rewrite'}
    </button>
  );
}

/**
 * CURRENT beside AI-PROPOSES. Rendered under the field whose proposal it is.
 * `onAccept` receives the proposal and is expected to write it the same way a
 * keystroke would.
 */
export function RewriteReview({ job, onAccept, onResolved }: {
  job: RewriteJob;
  onAccept: (proposal: string) => void;
  onResolved: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const resolve = useCallback((then?: () => void) => {
    setBusy(true);
    void dismissDgJob(job.id).then(() => { then?.(); onResolved(); }).finally(() => setBusy(false));
  }, [job.id, onResolved]);

  if (job.state === 'failed') {
    return (
      <div className="banner b-red" style={{ fontSize: 12 }}>
        <span style={{ flex: 1 }}>{job.error ?? 'The rewrite failed.'}</span>
        <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => resolve()}>Dismiss</button>
      </div>
    );
  }

  const proposal = job.result?.proposal ?? '';
  const current = job.result?.current ?? '';
  if (!proposal) return null;

  return (
    <div className="panel" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div className="kick" style={{ color: 'var(--brown3)', marginBottom: 5 }}>Current</div>
          <div className="note" style={{ whiteSpace: 'pre-wrap' }}>{current || <i>empty</i>}</div>
        </div>
        <div>
          <div className="kick" style={{ marginBottom: 5 }}>AI proposes</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{proposal}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-sm btn-gold" disabled={busy}
          onClick={() => resolve(() => onAccept(proposal))}>
          Use this
        </button>
        <button className="btn btn-sm" disabled={busy} onClick={() => resolve()}>Keep mine</button>
      </div>
    </div>
  );
}

/**
 * Poll while anything is running, and stop when nothing is.
 *
 * The interval is deliberately unremarkable: these are jobs measured in tens of
 * seconds, and a single self-hosted admin polling every two seconds costs
 * nothing worth optimising.
 */
export function useJobPolling(active: boolean, refresh: () => void, ms = 2000) {
  // The callback is kept in a ref so a new closure each render does not restart
  // the interval — the timer's identity depends on whether anything is running,
  // not on which render scheduled it.
  const saved = useRef(refresh);
  useEffect(() => { saved.current = refresh; });
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}
