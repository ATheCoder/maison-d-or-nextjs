'use client';
/**
 * The ask (§8.5) — units, the words-only / words-and-paintings choice, and a
 * staged progress line while it runs.
 *
 * **No cost estimate anywhere** (R6.5). Not per ask, not per painting, not
 * "about". OpenRouter has no pre-flight quote to give and output length is
 * unknowable in advance, so a number here would be a guess the admin learns to
 * ignore — and once they ignore one number they ignore the credit balance too.
 * What the panel states instead is *units*: five moments, with paintings or
 * without.
 *
 * The mode is chosen on the ask and never remembered as a preference: the right
 * answer differs between "draft me five moments" and "fill this one gap".
 */
import { useEffect, useState } from 'react';
import type { GenerationJobRow } from '@/src/db/schema';
import { getAskCapacity, startDgAsk, dismissDgJob } from '@/app/admin/daily-gold/aiActions';
import type { AskKind, AskMode } from '@/lib/daily-gold/askStore';

export type AskJob = Pick<GenerationJobRow, 'id' | 'state' | 'progress' | 'result' | 'error'>;

export default function AskPanel({
  kind, subjectKey, title, blurb, unitNoun, defaultUnits, job, onChanged, onError, onClose,
}: {
  kind: AskKind;
  /** 'YYYY-MM-DD' for a day or its news, 'MM-DD' for the almanac's two. */
  subjectKey: string;
  title: string;
  blurb: string;
  /** "story"/"stories", "event"/"events" — the ask is stated in these. */
  unitNoun: [singular: string, plural: string];
  defaultUnits: number;
  job: AskJob | null;
  onChanged: () => void;
  onError: (message: string) => void;
  onClose: () => void;
}) {
  const [units, setUnits] = useState(defaultUnits);
  const [mode, setMode] = useState<AskMode>('words');
  const [capacity, setCapacity] = useState<{ max: number; note: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let live = true;
    void getAskCapacity(kind, subjectKey).then((c) => {
      if (!live) return;
      setCapacity(c);
      setUnits((u) => Math.max(1, Math.min(u, Math.max(1, c.max))));
    });
    return () => { live = false; };
  }, [kind, subjectKey]);

  const running = job?.state === 'running';
  const noun = units === 1 ? unitNoun[0] : unitNoun[1];

  const run = (confirm?: boolean) => {
    setBusy(true);
    void startDgAsk(kind, subjectKey, mode, units, confirm ? { confirm: true } : undefined)
      .then((res) => {
        if (res.ok) { setConfirming(false); onChanged(); return; }
        if (res.needsConfirm) { setConfirming(true); return; }
        onError(res.error ?? 'Could not start the ask.');
      })
      .finally(() => setBusy(false));
  };

  // ── Running, or finished and awaiting a look ──────────────────────────────
  if (job) {
    const stages = job.progress?.stages ?? [];
    const slots = Object.entries(job.progress?.slots ?? {});
    const painted = slots.filter(([, s]) => s.state === 'done').length;
    const failed = slots.filter(([, s]) => s.state === 'failed');

    return (
      <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="kick">{job.progress?.ask?.label ?? title}</span>
          {running
            ? <span className="chip chip-amber">Running</span>
            : job.state === 'failed'
              ? <span className="chip chip-red">Failed</span>
              : <span className="chip chip-green">Done</span>}
          <span className="note" style={{ marginLeft: 'auto' }}>
            You can leave this page — it keeps going.
          </span>
        </div>

        {stages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {stages.map((s) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: 'var(--brown)' }}>
                <span className={`dot ${s.state === 'done' ? 'd-done' : s.state === 'active' ? 'd-warn' : s.state === 'failed' ? 'd-red' : 'd-empty'}`} />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {slots.length > 0 && (
          <div className="note">
            Paintings: {painted} of {slots.length} done
            {failed.length > 0 && ` · ${failed.length} failed — the words are saved either way`}
          </div>
        )}

        {job.state === 'failed' && <div className="banner b-red"><span>{job.error ?? 'The ask failed.'}</span></div>}

        {job.state === 'done' && <AskOutcome result={job.result ?? {}} />}

        {!running && (
          <div>
            <button className="btn btn-sm btn-gold" disabled={busy}
              onClick={() => {
                setBusy(true);
                void dismissDgJob(job.id).then(() => { onChanged(); onClose(); }).finally(() => setBusy(false));
              }}>
              {job.state === 'done' ? 'Review what it found' : 'Dismiss'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── The ask itself ────────────────────────────────────────────────────────
  const max = Math.max(1, capacity?.max ?? 1);
  const blocked = capacity?.max === 0;

  return (
    <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span className="kick">{title}</span>
        <button className="btn btn-sm btn-ghost" onClick={onClose}>Close</button>
      </div>
      <div className="note">{blurb}</div>
      {capacity?.note && <div className="note" style={{ color: 'var(--amber)' }}>{capacity.note}</div>}

      {confirming ? (
        <>
          <div className="banner b-amber">
            <span>
              <b>This date already says something.</b> Drafting it writes over the destination, the
              atmosphere, the child&rsquo;s day and the four cards. Good news is proposed rather than
              written, so nothing already in the column is touched.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-gold" disabled={busy} onClick={() => run(true)}>
              Draft over it
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => setConfirming(false)}>Keep what is there</button>
          </div>
        </>
      ) : (
        <>
          {kind !== 'day' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="note" style={{ width: 54 }}>How many</span>
              <input
                type="range" min={1} max={max} value={Math.min(units, max)}
                onChange={(e) => setUnits(Number(e.target.value))}
                style={{ flex: 1, minWidth: 140, accentColor: '#a8843f' }}
                disabled={blocked}
              />
              <span className="chip chip-gold">{Math.min(units, max)} {noun}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="note" style={{ width: 54 }}>Mode</span>
            <div className="seg">
              <button className={mode === 'words' ? 'on' : undefined} onClick={() => setMode('words')}>
                Words only
              </button>
              <button className={mode === 'words+paintings' ? 'on' : undefined} onClick={() => setMode('words+paintings')}>
                Words and paintings
              </button>
            </div>
          </div>
          <div className="note">
            {mode === 'words'
              ? 'Each painting slot is left empty with its prompt already written — a finished state, not a gap. You can paint them later, one at a time or all at once.'
              : 'Every slot this writes a scene for is painted in the same job. Slots fail one at a time; the words are saved either way.'}
          </div>

          <div>
            <button className="btn btn-gold" disabled={busy || blocked} onClick={() => run()}>
              {kind === 'day' ? 'Draft this day' : `Ask for ${Math.min(units, max)} ${noun}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** What an ask found, in the units it was asked in. */
function AskOutcome({ result }: { result: Record<string, unknown> }) {
  const n = (k: string) => (typeof result[k] === 'number' ? result[k] as number : 0);
  const lines: string[] = [];

  if (result.kind === 'day' && result.destination) lines.push(`Destination: ${result.destination}.`);
  if (typeof result.quoteNote === 'string') lines.push(result.quoteNote);

  const found = n('newsCandidates') + n('eventCandidates') + n('momentCandidates');
  const unverified = n('unverifiedNews') + n('unverifiedEvents') + n('unverifiedMoments');

  if (result.newsSkipped) {
    lines.push('The good-news column was already full, so nothing was searched for it.');
  } else if (result.kind !== 'day' || n('newsCandidates') > 0) {
    lines.push(found === 0
      // R3.21 — an empty result is a first-class outcome, not a failure.
      ? 'Nothing suitable was found. That is a real answer: publish without it rather than filling the gap.'
      : `${found} proposed, waiting below for review.`);
  }

  // An unexplained empty panel is what makes an ask look broken. If the search
  // did return things and they were thrown away, say so and say why — for On
  // This Day the reason is nearly always a year outside the twenty-year band.
  if (n('discarded') > 0) {
    lines.push(result.kind === 'history'
      ? `${n('discarded')} more were found but fell outside ${result.band ?? 'the band'}, so they were discarded — that period belongs to Greatest Moments, which spans all of history.`
      : `${n('discarded')} more were found but came back incomplete and were discarded.`);
  }
  if (unverified > 0) {
    lines.push(`${unverified} could not be traced back to a source the search actually read — those are marked unverifiable, and are yours to check by hand.`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {lines.map((l, i) => <div key={i} className="note" style={{ color: 'var(--brown)' }}>{l}</div>)}
    </div>
  );
}
