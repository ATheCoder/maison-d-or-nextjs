'use client';
/**
 * PersonEditor (screen ① of the approved design): top bar / 232px section rail /
 * center editing panel / 512px live-book preview. Phase 3 delivers the shell,
 * the derived section rail with completeness dots, debounced autosave, the
 * Draft/Publish control, and the real <GoldenStory> preview flipping in lockstep
 * with the rail. Phase 4 adds the per-section editors: cover identity (required
 * birth date, three-way death date), narrative fields with word-count chips,
 * the page_span/blend/fade layout pickers, chapter add/duplicate/delete +
 * drag-reorder, and timeline/treasures/lessons row editors. Phase 5 adds the AI
 * writer (screen ③): the "Write with AI" panel with the whole-book generation
 * job (staged progress, polled, autosave paused while it runs), per-narrative
 * ✦ Rewrite with a CURRENT / AI-PROPOSES review, and the golden-thread /
 * character-sheet panels. Image slots (the cover-art card etc.) are still
 * placeholders until Phase 6.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import GoldenStory, { spreadCount } from '@/components/dailygold/GoldenStory';
import {
  savePerson, setPublished as setPublishedAction,
  getPersonForEditor, getStoryBrief, getPersonJobs,
  generateBook, startRewrite, dismissJob, updateGoldenThread,
  type EditorPerson,
} from '@/app/admin/people/actions';
import type { Chapter, GenerationJobRow } from '@/src/db/schema';
import { deriveSections, type Section, type SectionStatus } from './personSections';
import styles from './PersonEditor.module.css';

// ── AI text generation (Phase 5) client types ────────────────────────────────

// A per-field rewrite as the editor tracks it: running while the model drafts,
// ready with a proposal to review, or failed. `jobId` is -1 only in the brief
// window between kicking the job and learning its row id.
type RewriteState = { jobId: number; status: 'running' | 'ready' | 'failed'; current?: string; proposal?: string; error?: string };

// The rewrite controls threaded down to each narrative field.
type RewriteApi = {
  states: Record<string, RewriteState>;
  busy: boolean; // a rewrite is already running (one at a time, server-guarded)
  start: (fieldPath: string, current: string) => void;
  accept: (fieldPath: string, value: string) => void;
  reject: (fieldPath: string) => void;
  tryAgain: (fieldPath: string, current: string) => void;
};

// Build the field→rewrite map from job rows: the field path comes from the
// finished result, or from a running job's progress (so it is self-describing).
function rewriteMapFromRows(rows: GenerationJobRow[]): Record<string, RewriteState> {
  const map: Record<string, RewriteState> = {};
  for (const r of rows) {
    const fp = r.result?.fieldPath ?? r.progress?.fieldPath;
    if (!fp) continue;
    map[fp] = {
      jobId: r.id,
      status: r.state === 'running' ? 'running' : r.state === 'failed' ? 'failed' : 'ready',
      current: r.result?.current,
      proposal: r.result?.proposal,
      error: r.error ?? undefined,
    };
  }
  return map;
}

const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Lato:wght@300;400;700&family=Great+Vibes&display=swap';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DOT_CLASS: Record<SectionStatus, string> = {
  done: styles.dDone, part: styles.dPart, empty: styles.dEmpty, warn: styles.dWarn,
};

// ── Draft reducer ────────────────────────────────────────────────────────────

type ListKey = 'chapters' | 'timeline' | 'treasures' | 'lessons';

type DraftAction =
  | { type: 'replace'; value: EditorPerson }
  | { type: 'field'; key: keyof EditorPerson; value: unknown }
  | { type: 'chapterField'; index: number; key: string; value: unknown }
  | { type: 'objField'; key: 'modern' | 'after_treasures'; field: string; value: unknown }
  | { type: 'listAdd'; list: ListKey }
  | { type: 'listDelete'; list: ListKey; index: number }
  | { type: 'listDuplicate'; list: ListKey; index: number }
  | { type: 'listReorder'; list: ListKey; from: number; to: number }
  | { type: 'listItemField'; list: ListKey; index: number; key: string; value: unknown };

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// Keep chapter numbers 1..n after any reordering/insertion/removal.
function renumber(chapters: Chapter[]): Chapter[] {
  return chapters.map((c, i) => (c.number === i + 1 ? c : { ...c, number: i + 1 }));
}

const BLANK: Record<ListKey, () => Record<string, unknown>> = {
  chapters: () => ({ page_span: 'single', title: '', narrative: '', image_url: null }),
  timeline: () => ({ year: '', caption: '', blend: 'multiply', image_url: null }),
  treasures: () => ({ name: '', image_url: null }),
  lessons: () => ({ icon_name: '', lesson: '' }),
};

// Write a list back, renumbering chapters so `number` always matches position.
function withList(state: EditorPerson, list: ListKey, next: unknown[]): EditorPerson {
  if (list === 'chapters') return { ...state, chapters: renumber(next as Chapter[]) };
  return { ...state, [list]: next } as EditorPerson;
}

function draftReducer(state: EditorPerson, action: DraftAction): EditorPerson {
  switch (action.type) {
    case 'replace':
      return action.value;
    case 'field':
      return { ...state, [action.key]: action.value } as EditorPerson;
    case 'chapterField':
      return {
        ...state,
        chapters: state.chapters.map((c, i) => (i === action.index ? { ...c, [action.key]: action.value } : c)),
      };
    case 'objField': {
      const cur = state[action.key] ?? {};
      return { ...state, [action.key]: { ...cur, [action.field]: action.value } } as EditorPerson;
    }
    case 'listAdd':
      return withList(state, action.list, [...(state[action.list] as unknown[]), BLANK[action.list]()]);
    case 'listDelete':
      return withList(state, action.list, (state[action.list] as unknown[]).filter((_, i) => i !== action.index));
    case 'listDuplicate': {
      const arr = state[action.list] as Record<string, unknown>[];
      if (!arr[action.index]) return state;
      const copy = { ...arr[action.index] };
      return withList(state, action.list, [...arr.slice(0, action.index + 1), copy, ...arr.slice(action.index + 1)]);
    }
    case 'listReorder':
      return withList(state, action.list, moveItem(state[action.list] as unknown[], action.from, action.to));
    case 'listItemField':
      return withList(state, action.list, (state[action.list] as Record<string, unknown>[]).map(
        (it, i) => (i === action.index ? { ...it, [action.key]: action.value } : it),
      ));
    default:
      return state;
  }
}

// ── Small helpers ────────────────────────────────────────────────────────────

function bornLabel(birth: string | null): string | null {
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const [, m, d] = birth.split('-');
  return `born ${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

function wordCount(text: string | null | undefined): number {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function imageStats(draft: EditorPerson): { filled: number; total: number } {
  const imgs: (string | null | undefined)[] = [
    draft.image_url, draft.childhood_image_url, draft.modern?.image_url, draft.after_treasures?.image_url,
    ...draft.chapters.map((c) => c.image_url),
    ...draft.timeline.map((t) => t.image_url),
    ...draft.treasures.map((t) => t.image_url),
  ];
  const total = imgs.length;
  const filled = imgs.filter((u) => typeof u === 'string' && u.trim()).length;
  return { filled, total };
}

type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

// ── Field primitives ─────────────────────────────────────────────────────────

function Kick({ children }: { children: React.ReactNode }) {
  return <div className={styles.kick}>{children}</div>;
}

function TextField({ label, value, onChange, placeholder, serif }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; serif?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Kick>{label}</Kick>
      <input
        className={`${styles.field}${serif ? ` ${styles.serif}` : ''}`}
        style={{ padding: '11px 14px', fontSize: serif ? 18 : 14, fontWeight: serif ? 600 : 400 }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function NarrativeField({ label, value, onChange, fieldPath, rw }: {
  label: string; value: string; onChange: (v: string) => void;
  fieldPath?: string; rw?: RewriteApi;
}) {
  const words = wordCount(value);
  const tone = words > 75 ? styles.chipRed : words > 70 ? styles.chipAmber : styles.chipInk;
  const chipText = words > 75 ? `Over the leaf · ${words} words` : words > 70 ? `Leaf nearly full · ${words} words` : `${words} words`;
  const rewrite = fieldPath && rw ? rw.states[fieldPath] : undefined;
  const canRewrite = !!(fieldPath && rw && value.trim());
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Kick>{label}</Kick>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {fieldPath && rw && (
            <button
              className={`${styles.btn} ${styles.btnSm}`}
              style={{ color: 'var(--gold-deep)', borderColor: 'var(--line2)' }}
              disabled={!canRewrite || rw.busy || rewrite?.status === 'running'}
              title={!value.trim() ? 'Write something first' : rw.busy ? 'Another rewrite is running' : 'Draft an alternative in the house style'}
              onClick={() => rw.start(fieldPath, value)}
            >✦ Rewrite</button>
          )}
          <span className={`${styles.chip} ${tone}`}>{chipText}</span>
        </div>
      </div>
      <textarea
        className={styles.field}
        style={{ padding: '14px 16px', minHeight: 158, lineHeight: 1.7 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className={styles.muted} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11 }}>
        <span>Blank line = new stanza · single break = hard line</span>
        <span style={{ marginLeft: 'auto' }} className={styles.chipInk + ' ' + styles.chip}>House rule: 40–70 words · 6–9 per line</span>
      </div>
      {fieldPath && rw && rewrite && <RewriteReview fieldPath={fieldPath} rw={rw} rewrite={rewrite} liveValue={value} />}
    </div>
  );
}

// The CURRENT vs ✦ AI-PROPOSES review that appears under a field once a rewrite
// is drafting or ready (screen ③'s "Rewrite one field"). Accept applies the
// proposal to the draft; Reject discards it; Try again re-runs from the live text.
function RewriteReview({ fieldPath, rw, rewrite, liveValue }: {
  fieldPath: string; rw: RewriteApi; rewrite: RewriteState; liveValue: string;
}) {
  if (rewrite.status === 'running') {
    return (
      <div className={styles.callout} style={{ padding: '9px 12px', fontSize: 11.5, color: 'var(--brown)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`${styles.saveDot} ${styles.saveDotSaving}`} />
        ✦ Drafting an alternative in the house style…
      </div>
    );
  }
  if (rewrite.status === 'failed') {
    return (
      <div className={styles.panel} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, borderColor: 'rgba(181,83,58,.4)', background: 'rgba(181,83,58,.06)' }}>
        <span style={{ fontSize: 11.5, color: 'var(--red)', flex: 1 }}>{rewrite.error ?? 'The rewrite failed.'}</span>
        <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => rw.tryAgain(fieldPath, liveValue)}>↻ Try again</button>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => rw.reject(fieldPath)}>Dismiss</button>
      </div>
    );
  }
  const proposal = rewrite.proposal ?? '';
  return (
    <div className={styles.panel} style={{ padding: 14 }}>
      <div className={styles.kick} style={{ color: 'var(--brown)', marginBottom: 10 }}>Rewrite · review the proposal</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div className={styles.muted} style={{ fontSize: 10.5, fontWeight: 700, marginBottom: 5 }}>CURRENT</div>
          <div className={styles.field} style={{ padding: '11px 13px', fontSize: 12, lineHeight: 1.6, color: 'var(--brown)', minHeight: 92, whiteSpace: 'pre-wrap' }}>{rewrite.current ?? liveValue}</div>
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, marginBottom: 5, color: 'var(--gold-deep)' }}>✦ AI PROPOSES</div>
          <div className={styles.field} style={{ padding: '11px 13px', fontSize: 12, lineHeight: 1.6, color: 'var(--ink)', minHeight: 92, whiteSpace: 'pre-wrap', borderColor: 'var(--gold-deep)', background: 'var(--gold-soft)' }}>{proposal}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 11, justifyContent: 'flex-end' }}>
        <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => rw.reject(fieldPath)}>✕ Reject</button>
        <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => rw.tryAgain(fieldPath, liveValue)}>↻ Try again</button>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGold}`} onClick={() => rw.accept(fieldPath, proposal)}>✓ Accept</button>
      </div>
    </div>
  );
}

// The four page_span layouts, mapped 1:1 onto GoldenStory's `page_span`.
const SPAN_OPTIONS: { value: string; name: string }[] = [
  { value: 'default', name: 'Classic' },
  { value: 'single', name: 'Single' },
  { value: 'both', name: 'Full-bleed' },
  { value: 'image', name: 'Art only' },
];

// The icon_name words the data uses (rendered as a titleCased label by
// GoldenStory) — offered as suggestions, but free text is allowed.
const LESSON_ICONS = ['courage', 'creativity', 'curiosity', 'generosity', 'honesty', 'imagination', 'integrity', 'kindness', 'observation', 'patience', 'perseverance', 'persistence', 'wonder'];

// A mini spread diagram for one page_span option.
function SpanDiagram({ value }: { value: string }) {
  if (value === 'single') {
    return (
      <div className={styles.lhSpread}>
        <div className={`${styles.lhArt} ${styles.lhLeafFold}`} style={{ flexBasis: '55%' }} />
        <div className={styles.lhTxt} style={{ flexBasis: '45%' }} />
      </div>
    );
  }
  if (value === 'both') {
    return (
      <div className={styles.lhSpread} style={{ background: 'linear-gradient(140deg, #d8c48a, #b79a5c)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,12,6,.32)' }} />
        <div style={{ position: 'absolute', left: 8, top: 10, right: 8, bottom: 8, opacity: 0.8, background: 'repeating-linear-gradient(180deg, #fff 0 1.5px, transparent 1.5px 6px)', backgroundSize: '60% 100%', backgroundRepeat: 'no-repeat' }} />
      </div>
    );
  }
  if (value === 'image') {
    return <div className={styles.lhSpread}><div className={styles.lhArt} /><div style={{ background: '#fffdf8' }} /></div>;
  }
  return <div className={styles.lhSpread}><div className={`${styles.lhTxt} ${styles.lhLeafFold}`} /><div className={styles.lhArt} /></div>;
}

// "How this page composes" — page_span diagrams + blend + text-wash fade.
function LayoutPicker({ span, blend, fade, onSpan, onBlend, onFade }: {
  span?: string; blend?: string; fade?: boolean;
  onSpan: (v: string) => void; onBlend: (v: string) => void; onFade: (v: boolean) => void;
}) {
  const eff = ['both', 'single', 'image'].includes(span ?? '') ? span : 'default';
  const blendNormal = blend === 'normal' || blend === 'none';
  const fadeOn = fade !== false;
  const fadeEnabled = eff === 'single' || eff === 'both'; // only overlaid-text spans wash

  return (
    <div className={styles.panel} style={{ padding: 16 }}>
      <div className={styles.kick} style={{ marginBottom: 12 }}>How this page composes</div>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <div>
          <div className={styles.muted} style={{ fontSize: 11, marginBottom: 9, fontWeight: 700 }}>Page span</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {SPAN_OPTIONS.map((o) => (
              <button key={o.value} className={`${styles.lh} ${eff === o.value ? styles.lhOn : styles.lhOff}`} onClick={() => onSpan(o.value)}>
                <SpanDiagram value={o.value} />
                <div className={styles.lhName}>{o.name}</div>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.vhair} />
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          <div>
            <div className={styles.muted} style={{ fontSize: 11, marginBottom: 9, fontWeight: 700 }}>Blend</div>
            <div className={styles.seg}>
              <button className={!blendNormal ? styles.segOn : ''} onClick={() => onBlend('multiply')}>Multiply</button>
              <button className={blendNormal ? styles.segOn : ''} onClick={() => onBlend('normal')}>Normal</button>
            </div>
            <div className={styles.muted} style={{ fontSize: 10.5, marginTop: 8, maxWidth: 150 }}>Paint on white melts into the parchment.</div>
          </div>
          <div>
            <div className={styles.muted} style={{ fontSize: 11, marginBottom: 9, fontWeight: 700 }}>
              Text wash <span className={`${styles.chip} ${styles.chipInk}`} style={{ marginLeft: 2 }}>for overlaid text</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: fadeEnabled ? 1 : 0.5 }}>
              <button className={`${styles.sw}${fadeOn ? '' : ` ${styles.swOff}`}`} disabled={!fadeEnabled} onClick={() => onFade(!fadeOn)} aria-label="Toggle text wash" />
              <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700 }}>{fadeOn ? 'Fade on' : 'Fade off'}</span>
            </div>
            <div className={styles.muted} style={{ fontSize: 10.5, marginTop: 8, maxWidth: 160 }}>
              {fadeEnabled ? 'Legibility wash behind overlaid text.' : 'Dimmed here — this span doesn’t overlay text.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Death date as full-date / year-only / living, writing the ISO text column.
function DeathDateControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const initial = !value ? 'living' : /^\d{4}$/.test(value) ? 'year' : 'full';
  const [mode, setMode] = useState<'living' | 'year' | 'full'>(initial);
  const year = value && /^\d{4}/.test(value) ? value.slice(0, 4) : '';

  const pick = (m: 'living' | 'year' | 'full') => {
    setMode(m);
    if (m === 'living') onChange('');
    else if (m === 'year') onChange(year);
    else onChange(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : (year ? `${year}-01-01` : ''));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Kick>Death date</Kick>
      <div className={styles.seg} style={{ alignSelf: 'flex-start' }}>
        <button className={mode === 'full' ? styles.segOn : ''} onClick={() => pick('full')}>Full date</button>
        <button className={mode === 'year' ? styles.segOn : ''} onClick={() => pick('year')}>Year only</button>
        <button className={mode === 'living' ? styles.segOn : ''} onClick={() => pick('living')}>Living</button>
      </div>
      {mode === 'full' && (
        <input type="date" className={styles.field} style={{ padding: '10px 14px', maxWidth: 200 }}
          value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {mode === 'year' && (
        <input type="text" inputMode="numeric" className={styles.field} style={{ padding: '10px 14px', maxWidth: 120 }} placeholder="1519"
          value={year} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      )}
      {mode === 'living' && <div className={styles.muted} style={{ fontSize: 12 }}>No death date — shown as still living.</div>}
    </div>
  );
}

// The cover art slot — a placeholder until the image tools land (Phase 6).
function CoverImageCard({ src }: { src: string | null }) {
  return (
    <div className={styles.panel} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 66, height: 66, flex: '0 0 66px', borderRadius: 8, overflow: 'hidden', background: '#EDE3D2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {src
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span className={styles.muted} style={{ fontSize: 10 }}>No art</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span className={styles.kick} style={{ color: 'var(--brown)' }}>Cover illustration</span>
          {src ? <span className={`${styles.chip} ${styles.chipGreen}`}>✓ set</span> : <span className={`${styles.chip} ${styles.chipInk}`}>empty</span>}
        </div>
        <div className={styles.muted} style={{ fontSize: 12, marginTop: 5 }}>Full-bleed · 1024×1536 · the gradient overlay carries the title.</div>
      </div>
      <button className={`${styles.btn} ${styles.btnSm}`} disabled title="Image slots arrive with the art tools">Open slot ▾</button>
    </div>
  );
}

// A reorderable list of rows: drag the grip to move, ✕ to delete, ＋ to add.
function RowList({ count, onReorder, onDelete, onAdd, addLabel, renderRow }: {
  count: number; onReorder: (from: number, to: number) => void; onDelete: (i: number) => void;
  onAdd: () => void; addLabel: string; renderRow: (i: number) => React.ReactNode;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${styles.row}${drag === i ? ` ${styles.rowDragging}` : ''}`}
          onDragOver={(e) => { if (drag !== null) e.preventDefault(); }}
          onDrop={() => { if (drag !== null && drag !== i) onReorder(drag, i); setDrag(null); }}
        >
          <span className={styles.grip} draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)} title="Drag to reorder">⋮⋮</span>
          <div style={{ flex: 1, minWidth: 0 }}>{renderRow(i)}</div>
          <button className={styles.iconBtn} onClick={() => onDelete(i)} title="Delete" aria-label="Delete row">✕</button>
        </div>
      ))}
      <button className={`${styles.btn} ${styles.btnSm}`} style={{ alignSelf: 'flex-start' }} onClick={onAdd}>＋ {addLabel}</button>
    </div>
  );
}

// ── AI panel (screen ③) ──────────────────────────────────────────────────────
// The "Generate the story text" surface: the whole-book job with staged
// progress on the left, the golden thread + character sheet on the right. Opened
// from the top bar; the generation keeps running if it is closed.

const STAGE_DOT: Record<string, string> = { done: styles.dDone, active: styles.dWarn, pending: styles.dEmpty, failed: styles.dWarn };

function AIPanel({
  personName, briefJob, onGenerate, onRetryGenerate, onDismissBrief, genState, genPending,
  hasBrief, goldenThread, onSaveGoldenThread, characterSheet, rewriteCount, onClose,
}: {
  personName: string;
  briefJob: GenerationJobRow | null;
  onGenerate: (confirm?: boolean) => void;
  onRetryGenerate: () => void;
  onDismissBrief: () => void;
  genState: { error?: string; needsConfirm?: boolean };
  genPending: boolean;
  hasBrief: boolean;
  goldenThread: string;
  onSaveGoldenThread: (v: string) => void;
  characterSheet: string;
  rewriteCount: number;
  onClose: () => void;
}) {
  const [thread, setThread] = useState(goldenThread);
  const [editingThread, setEditingThread] = useState(false);
  const beginEdit = () => { setThread(goldenThread); setEditingThread(true); };

  const running = briefJob?.state === 'running';
  const failed = briefJob?.state === 'failed';
  const stages = briefJob?.progress?.stages ?? [];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(36,26,12,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1.5rem' }}>
      <div onClick={(e) => e.stopPropagation()} className={styles.panel} style={{ background: 'var(--ground)', padding: 22, width: 'min(940px, 100%)', maxHeight: '90vh', overflow: 'auto', display: 'flex', gap: 22, flexWrap: 'wrap' }}>
        {/* Left — writing the whole book */}
        <div style={{ flex: '1.35 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Kick>AI · propose → review → accept</Kick>
            <div className={styles.serif} style={{ fontSize: 22, fontWeight: 600, marginTop: 6, color: 'var(--ink)' }}>Writing the whole book</div>
            <div className={styles.muted} style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>
              One action drafts every narrative, the quote, timeline, treasures and lessons — plus a scene per image slot, the character sheet, and the golden thread. It takes a few minutes; the book fills in as it finishes.
            </div>
          </div>

          {running ? (
            <div className={styles.panel} style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>Drafting…</span>
                <span className={`${styles.chip} ${styles.chipAmber}`}>running</span>
              </div>
              <div className={styles.prog}><i className={styles.progFill} style={{ width: `${stages.length ? (stages.filter((s) => s.state === 'done').length / stages.length) * 100 : 0}%` }} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
                {stages.map((s) => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <span className={`${styles.dot} ${STAGE_DOT[s.state] ?? styles.dEmpty}`} />
                    <span style={{ color: s.state === 'pending' ? 'var(--brown2)' : 'var(--ink)', fontWeight: s.state === 'active' ? 700 : 400 }}>{s.label}</span>
                    <span className={`${styles.chip} ${s.state === 'done' ? styles.chipGreen : s.state === 'active' ? styles.chipAmber : styles.chipInk}`} style={{ marginLeft: 'auto' }}>
                      {s.state === 'done' ? 'done' : s.state === 'active' ? 'writing…' : 'queued'}
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.callout} style={{ padding: '9px 12px', marginTop: 14, fontSize: 11.5, color: 'var(--brown)' }}>
                You can close this and keep the tab open — the book fills in as it finishes. Autosave pauses until it is done.
              </div>
            </div>
          ) : failed ? (
            <div className={styles.panel} style={{ padding: 16, borderColor: 'rgba(181,83,58,.4)', background: 'rgba(181,83,58,.06)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--red)', marginBottom: 6 }}>The book couldn’t be written</div>
              <div className={styles.muted} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>{briefJob?.error ?? 'The writer failed. Nothing was changed.'}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onDismissBrief} disabled={genPending}>Dismiss</button>
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGold}`} onClick={onRetryGenerate} disabled={genPending}>↻ Try again</button>
              </div>
            </div>
          ) : (
            <div className={styles.panel} style={{ padding: 16 }}>
              {genState.needsConfirm ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>Overwrite the existing text?</div>
                  <div className={styles.muted} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                    <strong style={{ color: 'var(--ink)' }}>{personName}</strong> already has written content. Generating replaces every narrative, the quote, timeline, treasures and lessons. Existing illustrations are kept.
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onClose} disabled={genPending}>Cancel</button>
                    <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGold}`} onClick={() => onGenerate(true)} disabled={genPending}>{genPending ? 'Starting…' : 'Overwrite & write'}</button>
                  </div>
                </>
              ) : (
                <>
                  <button className={`${styles.btn} ${styles.btnGold}`} style={{ width: '100%' }} onClick={() => onGenerate(false)} disabled={genPending}>
                    {genPending ? 'Starting…' : '✦ Generate the whole book'}
                  </button>
                  {genState.error && <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 10 }}>{genState.error}</div>}
                </>
              )}
            </div>
          )}

          <div className={styles.muted} style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`${styles.chip} ${styles.chipInk}`}>Rewrite one field</span>
            {rewriteCount > 0
              ? <span>{rewriteCount} proposal{rewriteCount > 1 ? 's' : ''} to review beside {rewriteCount > 1 ? 'their fields' : 'its field'}.</span>
              : <span>Use ✦ Rewrite on any narrative to draft an alternative in the house style.</span>}
          </div>
        </div>

        {/* Right — golden thread + character sheet */}
        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={styles.panel} style={{ padding: 16, background: 'var(--gold-soft)' }}>
            <div className={styles.kick} style={{ color: 'var(--brown)' }}>The golden thread · the story’s spine</div>
            {editingThread ? (
              <>
                <textarea
                  className={styles.field}
                  style={{ marginTop: 8, padding: '10px 12px', fontSize: 14, minHeight: 64 }}
                  value={thread}
                  autoFocus
                  onChange={(e) => setThread(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => { setThread(goldenThread); setEditingThread(false); }}>Cancel</button>
                  <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGold}`} onClick={() => { onSaveGoldenThread(thread.trim()); setEditingThread(false); }}>Save</button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.script} style={{ fontSize: 28, color: 'var(--gold-deep)', lineHeight: 1.15, marginTop: 8 }}>
                  {goldenThread || <span className={styles.muted} style={{ fontFamily: 'var(--sans)', fontSize: 13 }}>Not set yet.</span>}
                </div>
                <div className={styles.muted} style={{ fontSize: 11, marginTop: 8 }}>
                  The one defining quality every page returns to.{' '}
                  {hasBrief
                    ? <button className={styles.btn + ' ' + styles.btnGhost + ' ' + styles.btnSm} style={{ padding: 0, color: 'var(--gold-deep)', fontWeight: 700 }} onClick={beginEdit}>Edit</button>
                    : <span>Generate the book to set it.</span>}
                </div>
              </>
            )}
          </div>

          <div className={styles.panel} style={{ padding: 16 }}>
            <div className={styles.kick} style={{ color: 'var(--brown)' }}>Character sheet · the art’s anchor</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--brown)', marginTop: 11 }}>
              {characterSheet || <span className={styles.muted}>Set when the book is generated — one sentence fixing the child’s look.</span>}
            </div>
            {characterSheet && (
              <div className={styles.muted} style={{ fontSize: 11, marginTop: 11, lineHeight: 1.5 }}>
                Every scene that shows {personName.split(' ')[0] || 'them'} as a child starts with this text verbatim — so the face stays consistent across the book.
              </div>
            )}
          </div>

          <div className={styles.callout} style={{ padding: '11px 13px', fontSize: 11.5, color: 'var(--brown)' }}>
            If a scene drops the character-sheet line, its slot shows a gentle “consistency may drift” hint — never a block.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────

export default function PersonEditor({ initialPerson, initialBrief, initialJobs }: {
  initialPerson: EditorPerson;
  initialBrief: { goldenThread: string; characterSheet: string } | null;
  initialJobs: { brief: GenerationJobRow | null; rewrites: GenerationJobRow[] };
}) {
  const slug = initialPerson.slug;
  const [draft, dispatch] = useReducer(draftReducer, initialPerson);
  const [isPublished, setIsPublished] = useState(initialPerson.published);
  const [save, setSave] = useState<{ status: SaveStatus; savedAt: string | null; error?: string }>({
    status: 'saved', savedAt: initialPerson.updated_at,
  });
  const [selectedId, setSelectedId] = useState('cover');
  const [pageState, setPage] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(512);
  const [dragging, setDragging] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [pubPending, startPub] = useTransition();
  const [dragChapter, setDragChapter] = useState<number | null>(null);

  // ── AI generation state (Phase 5) ──
  const [showAI, setShowAI] = useState(false);
  const [goldenThread, setGoldenThread] = useState(initialBrief?.goldenThread ?? '');
  const [characterSheet, setCharacterSheet] = useState(initialBrief?.characterSheet ?? '');
  const [hasBrief, setHasBrief] = useState(!!initialBrief);
  const [briefJob, setBriefJob] = useState<GenerationJobRow | null>(initialJobs.brief);
  const [rewrites, setRewrites] = useState<Record<string, RewriteState>>(() => rewriteMapFromRows(initialJobs.rewrites));
  const [genState, setGenState] = useState<{ error?: string; needsConfirm?: boolean }>({});
  const [genPending, startGen] = useTransition();
  const briefJobRef = useRef(briefJob);
  useEffect(() => { briefJobRef.current = briefJob; }, [briefJob]);

  const sections = useMemo(() => deriveSections(draft), [draft]);
  const count = useMemo(() => spreadCount(draft), [draft]);
  const active = sections.find((s) => s.id === selectedId) ?? sections[0];
  const stats = imageStats(draft);
  // Derived, always-valid current spread (clamped as the story grows/shrinks).
  const page = Math.max(0, Math.min(pageState, count - 1));

  // An edit: update the draft and mark unsaved (in the event, not an effect).
  const edit = useCallback((action: DraftAction) => {
    dispatch(action);
    setSave((s) => (s.status === 'dirty' ? s : { ...s, status: 'dirty' }));
  }, []);

  // ── Autosave: debounce 2s after the last edit ──────────────────────────────
  const doSave = useCallback(async (record: EditorPerson) => {
    setSave((s) => ({ ...s, status: 'saving' }));
    const res = await savePerson(slug, record);
    if (res.ok) setSave({ status: 'saved', savedAt: res.updated_at ?? new Date().toISOString() });
    else setSave((s) => ({ ...s, status: 'error', error: res.error }));
  }, [slug]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    // Paused while the whole-book writer runs — it applies text server-side and
    // the draft reloads on completion, so client saves would race it.
    if (briefJob?.state === 'running') return;
    const t = setTimeout(() => { void doSave(draft); }, 2000);
    return () => clearTimeout(t);
  }, [draft, doSave, briefJob?.state]);

  // Warn before leaving with unsaved work.
  useEffect(() => {
    const dirty = save.status === 'dirty' || save.status === 'saving';
    const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [save.status]);

  // ── AI jobs: poll while anything is running ─────────────────────────────────
  // Reload the applied person + brief when the whole-book job finishes, then
  // clear its row so the progress panel closes.
  const handleBriefDone = useCallback(async (jobId: number) => {
    const [fresh, brief] = await Promise.all([getPersonForEditor(slug), getStoryBrief(slug)]);
    if (fresh) { dispatch({ type: 'replace', value: fresh }); setSave({ status: 'saved', savedAt: fresh.updated_at }); }
    if (brief) { setGoldenThread(brief.goldenThread); setCharacterSheet(brief.characterSheet); setHasBrief(true); }
    setBriefJob(null);
    await dismissJob(jobId).catch(() => {});
  }, [slug]);

  const rewriteRunning = Object.values(rewrites).some((r) => r.status === 'running');
  const polling = briefJob?.state === 'running' || rewriteRunning;
  useEffect(() => {
    if (!polling) return;
    let cancelled = false;
    const poll = async () => {
      let res: Awaited<ReturnType<typeof getPersonJobs>>;
      try { res = await getPersonJobs(slug); } catch { return; }
      if (cancelled) return;
      const prev = briefJobRef.current;
      if (prev?.state === 'running' && res.brief && res.brief.state === 'done') {
        void handleBriefDone(res.brief.id);
      } else {
        setBriefJob(res.brief);
      }
      setRewrites(rewriteMapFromRows(res.rewrites));
    };
    const iv = setInterval(poll, 2500);
    return () => { cancelled = true; clearInterval(iv); };
  }, [polling, slug, handleBriefDone]);

  // On return, a brief job that finished while the tab was away: the person was
  // applied server-side (and initialBrief carried the panels), so just clear the
  // stale row once so the progress panel doesn't reappear.
  const initialDoneHandled = useRef(false);
  useEffect(() => {
    if (initialDoneHandled.current) return;
    initialDoneHandled.current = true;
    if (briefJob?.state === 'done') { const id = briefJob.id; setTimeout(() => void handleBriefDone(id), 0); }
  }, [briefJob, handleBriefDone]);

  // Kick the whole-book writer; on success fetch its row so the panel shows it.
  const startBook = useCallback((confirm?: boolean) => {
    setGenState({});
    startGen(async () => {
      const res = await generateBook(slug, { confirm });
      if (res.ok) { const j = await getPersonJobs(slug); setBriefJob(j.brief); setGenState({}); }
      else if (res.needsConfirm) setGenState({ needsConfirm: true });
      else setGenState({ error: res.error });
    });
  }, [slug]);

  const dismissBriefJob = useCallback(() => {
    const job = briefJob;
    setBriefJob(null);
    setGenState({});
    if (job) void dismissJob(job.id).catch(() => {});
  }, [briefJob]);

  const saveGoldenThread = useCallback((value: string) => {
    setGoldenThread(value);
    void updateGoldenThread(slug, value);
  }, [slug]);

  // Apply an accepted rewrite to the right draft field (narratives only in P5).
  const applyRewriteToDraft = useCallback((fieldPath: string, value: string) => {
    if (fieldPath === 'story_childhood') edit({ type: 'field', key: 'story_childhood', value });
    else if (fieldPath === 'story_takeaway') edit({ type: 'field', key: 'story_takeaway', value });
    else if (fieldPath === 'modern.narrative') edit({ type: 'objField', key: 'modern', field: 'narrative', value });
    else if (fieldPath === 'after_treasures.narrative') edit({ type: 'objField', key: 'after_treasures', field: 'narrative', value });
    else {
      const m = /^chapters\.(\d+)\.narrative$/.exec(fieldPath);
      if (m) edit({ type: 'chapterField', index: Number(m[1]), key: 'narrative', value });
    }
  }, [edit]);

  const doStartRewrite = useCallback((fieldPath: string, current: string) => {
    setRewrites((s) => ({ ...s, [fieldPath]: { jobId: -1, status: 'running', current } }));
    void (async () => {
      const res = await startRewrite(slug, fieldPath, current);
      setRewrites((s) => (res.ok
        ? { ...s, [fieldPath]: { jobId: res.jobId, status: 'running', current } }
        : { ...s, [fieldPath]: { jobId: -1, status: 'failed', current, error: res.error } }));
    })();
  }, [slug]);

  const rw: RewriteApi = useMemo(() => ({
    states: rewrites,
    busy: rewriteRunning,
    start: doStartRewrite,
    accept: (fieldPath, value) => {
      const st = rewrites[fieldPath];
      applyRewriteToDraft(fieldPath, value);
      setRewrites((s) => { const n = { ...s }; delete n[fieldPath]; return n; });
      if (st && st.jobId > 0) void dismissJob(st.jobId).catch(() => {});
    },
    reject: (fieldPath) => {
      const st = rewrites[fieldPath];
      setRewrites((s) => { const n = { ...s }; delete n[fieldPath]; return n; });
      if (st && st.jobId > 0) void dismissJob(st.jobId).catch(() => {});
    },
    tryAgain: (fieldPath, current) => {
      const st = rewrites[fieldPath];
      if (st && st.jobId > 0) void dismissJob(st.jobId).catch(() => {});
      doStartRewrite(fieldPath, current);
    },
  }), [rewrites, rewriteRunning, doStartRewrite, applyRewriteToDraft]);

  const selectSection = (sec: Section) => { setSelectedId(sec.id); setPage(sec.spreadIndex); };
  // Reorder chapters from the rail; selection follows the moved chapter.
  const moveChapter = (from: number, to: number) => { edit({ type: 'listReorder', list: 'chapters', from, to }); setSelectedId(`chapter-${to}`); };
  const goToPage = (np: number) => {
    const clamped = Math.max(0, Math.min(count - 1, np));
    setPage(clamped);
    const sec = sections.find((s) => s.spreadIndex === clamped);
    if (sec) setSelectedId(sec.id);
  };

  const applyPublish = (next: boolean) => {
    startPub(async () => {
      const res = await setPublishedAction(slug, next);
      if (res.ok) { setIsPublished(res.published ?? next); setPublishConfirm(false); }
    });
  };

  // Drag the divider to trade width between the editing panel and the preview.
  // The preview is pinned to the right, so its width is (container right − cursor).
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const onMove = (ev: PointerEvent) => {
      const rect = mainRef.current?.getBoundingClientRect();
      if (!rect) return;
      const max = Math.max(360, rect.width - 232 - 360); // keep the rail + a usable panel
      setPreviewWidth(Math.max(360, Math.min(max, rect.right - ev.clientX)));
    };
    const onUp = () => {
      setDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const born = bornLabel(draft.birth_date);
  const pageLabel = sections.find((s) => s.spreadIndex === page)?.label ?? 'Cover';

  const saveDotClass =
    save.status === 'error' ? styles.saveDotError
      : save.status === 'saving' ? styles.saveDotSaving
        : save.status === 'dirty' ? styles.saveDotDirty : '';
  const saveText =
    save.status === 'error' ? (save.error ?? 'Could not save')
      : save.status === 'saving' ? 'Saving…'
        : save.status === 'dirty' ? 'Unsaved changes'
          : save.savedAt ? `All changes saved · ${new Date(save.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : 'All changes saved';

  return (
    <div className={styles.editor}>
      <link rel="stylesheet" precedence="default" href={FONT_LINK} />

      {/* ── Top bar ── */}
      <div
        className={isPublished ? styles.publishedBar : undefined}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: isPublished ? undefined : '1px solid var(--line)',
          background: isPublished ? undefined : 'var(--panel)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/admin/people" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} style={{ paddingLeft: 0 }}>‹ Library</Link>
          <div className={styles.vhair} style={{ height: 30, alignSelf: 'center' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className={styles.serif} style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>{draft.name || 'Untitled'}</div>
              <span className={`${styles.chip} ${styles.chipInk} ${styles.mono}`}>/stories/{slug}</span>
            </div>
            <div className={styles.kick} style={{ marginTop: 4 }}>Remarkable person{born ? ` · ${born}` : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className={`${styles.btn} ${styles.btnSm}`}
            style={{ color: 'var(--gold-deep)', borderColor: briefJob?.state === 'running' ? 'var(--gold-deep)' : 'var(--line2)', background: briefJob?.state === 'running' ? 'var(--gold-soft)' : undefined }}
            onClick={() => setShowAI(true)}
          >{briefJob?.state === 'running' ? '✦ Writing…' : '✦ Write with AI'}</button>
          <div className={styles.muted} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className={`${styles.saveDot} ${saveDotClass}`} />
            <span style={{ fontSize: 12 }}>{saveText}</span>
          </div>
          <div className={styles.seg}>
            <button
              className={!isPublished ? `${styles.segOn} ${styles.segOnDraft}` : ''}
              onClick={() => isPublished && applyPublish(false)}
              disabled={pubPending}
            >Draft</button>
            <button
              className={isPublished ? styles.segOn : ''}
              onClick={() => !isPublished && setPublishConfirm(true)}
              disabled={pubPending}
            >Published</button>
          </div>
          {isPublished ? (
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => applyPublish(false)} disabled={pubPending}>Move to draft</button>
          ) : (
            <button className={`${styles.btn} ${styles.btnGold}`} onClick={() => setPublishConfirm(true)} disabled={pubPending}>Publish to families</button>
          )}
        </div>
      </div>

      {isPublished && (
        <div className={styles.publishedBar} style={{ padding: '7px 20px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`${styles.dot} ${styles.dWarn}`} />
          This page is live — edits publish to families as soon as they autosave.
        </div>
      )}

      <div ref={mainRef} style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Section rail ── */}
        <div style={{
          width: 232, flex: '0 0 232px', borderRight: '1px solid var(--line)', padding: '18px 14px',
          display: 'flex', flexDirection: 'column', gap: 3, overflow: 'auto', background: 'rgba(255, 248, 238, .5)',
        }}>
          <div className={styles.kick} style={{ padding: '4px 10px 10px' }}>The book</div>
          {sections.map((s) => {
            const isChapter = s.kind === 'chapter';
            return (
              <button
                key={s.id}
                className={`${styles.navrow}${s.id === active?.id ? ` ${styles.navrowOn}` : ''}${isChapter && dragChapter === s.chapterIndex ? ` ${styles.navrowDragging}` : ''}`}
                onClick={() => selectSection(s)}
                draggable={isChapter}
                onDragStart={isChapter ? () => setDragChapter(s.chapterIndex!) : undefined}
                onDragEnd={isChapter ? () => setDragChapter(null) : undefined}
                onDragOver={isChapter && dragChapter !== null ? (e) => e.preventDefault() : undefined}
                onDrop={isChapter && dragChapter !== null ? () => { if (dragChapter !== s.chapterIndex) moveChapter(dragChapter, s.chapterIndex!); setDragChapter(null); } : undefined}
              >
                {isChapter && <span className={styles.grip} style={{ fontSize: 12, marginLeft: -4 }}>⋮⋮</span>}
                <span className={`${styles.dot} ${DOT_CLASS[s.status]}`} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                {s.note && (
                  <span style={{ marginLeft: 'auto', font: '700 9px/1 var(--sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--amber)' }}>{s.note}</span>
                )}
                {s.count && <span style={{ marginLeft: 'auto' }} className={`${styles.muted} ${styles.mono}`}>{s.count}</span>}
              </button>
            );
          })}
          <button
            className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
            style={{ margin: '4px 8px 2px', justifyContent: 'flex-start' }}
            onClick={() => { edit({ type: 'listAdd', list: 'chapters' }); setSelectedId(`chapter-${draft.chapters.length}`); }}
          >＋ Add chapter</button>
          <div className={styles.hair} style={{ margin: '12px 6px' }} />
          <div className={styles.panel} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className={styles.kick}>Illustrations</span>
              <span className={styles.serif} style={{ fontSize: 15, color: 'var(--ink)' }}>
                {stats.filled}<span className={styles.muted} style={{ fontSize: 12 }}> / {stats.total}</span>
              </span>
            </div>
            <div className={styles.prog}><i className={styles.progFill} style={{ width: `${stats.total ? (stats.filled / stats.total) * 100 : 0}%` }} /></div>
            <button className={`${styles.btn} ${styles.btnSm}`} disabled title="Batch generation arrives with the image slots">Generate all missing</button>
          </div>
        </div>

        {/* ── Center editing panel ── */}
        <div style={{ flex: 1, minWidth: 0, padding: '22px 26px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <CenterPanel active={active} draft={draft} dispatch={edit} onSelect={setSelectedId} rw={rw} />
        </div>

        {/* ── Live-book preview ── */}
        {collapsed ? (
          <div style={{ flex: '0 0 44px', borderLeft: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 14, background: 'var(--panel)' }}>
            <button
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
              style={{ writingMode: 'vertical-rl', letterSpacing: '.12em' }}
              onClick={() => setCollapsed(false)}
            >⟨ Live book</button>
          </div>
        ) : (
          <>
          <div
            className={`${styles.resizeHandle}${dragging ? ` ${styles.dragging}` : ''}`}
            onPointerDown={startResize}
            role="separator"
            aria-orientation="vertical"
            title="Drag to resize the preview"
          />
          <div style={{ width: previewWidth, flex: `0 0 ${previewWidth}px`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
              <span className={styles.kick}>Live book · what families see</span>
              <button className={`${styles.chip} ${styles.chipInk}`} style={{ cursor: 'pointer' }} onClick={() => setCollapsed(true)}>Collapse ⟩</button>
            </div>
            <div className={styles.stage} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <GoldenStory story={draft} page={page} onPageChange={setPage} embedded />
            </div>
            <div className={styles.stage} style={{ padding: '14px 0 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={() => goToPage(page - 1)} disabled={page <= 0} aria-label="Previous spread"
                  style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(201,169,110,.5)', color: '#e7d5a8', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page <= 0 ? 'default' : 'pointer', opacity: page <= 0 ? 0.4 : 1 }}>‹</button>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {Array.from({ length: count }).map((_, i) => (
                    <button key={i} onClick={() => goToPage(i)} aria-label={`Spread ${i + 1}`}
                      style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 999, border: 'none', cursor: 'pointer', background: i === page ? 'var(--gold)' : 'rgba(231,213,168,.35)' }} />
                  ))}
                </div>
                <button onClick={() => goToPage(page + 1)} disabled={page >= count - 1} aria-label="Next spread"
                  style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(201,169,110,.5)', color: '#e7d5a8', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page >= count - 1 ? 'default' : 'pointer', opacity: page >= count - 1 ? 0.4 : 1 }}>›</button>
              </div>
              <div style={{ color: 'rgba(231,213,168,.6)', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' }}>
                Spread {page + 1} · {pageLabel}
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* ── AI: generate story text (screen ③) ── */}
      {showAI && (
        <AIPanel
          personName={draft.name || 'This person'}
          briefJob={briefJob}
          onGenerate={startBook}
          onRetryGenerate={() => { const j = briefJob; setBriefJob(null); if (j) void dismissJob(j.id).catch(() => {}); startBook(true); }}
          onDismissBrief={dismissBriefJob}
          genState={genState}
          genPending={genPending}
          hasBrief={hasBrief}
          goldenThread={goldenThread}
          onSaveGoldenThread={saveGoldenThread}
          characterSheet={characterSheet}
          rewriteCount={Object.keys(rewrites).length}
          onClose={() => setShowAI(false)}
        />
      )}

      {/* ── Publish confirm ── */}
      {publishConfirm && (
        <div onClick={() => setPublishConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(36,26,12,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1.5rem' }}>
          <div onClick={(e) => e.stopPropagation()} className={styles.panel} style={{ background: 'var(--ground)', padding: 24, width: 'min(440px, 100%)' }}>
            <div className={styles.serif} style={{ fontSize: 21, color: 'var(--ink)', marginBottom: 10 }}>Publish to families?</div>
            <p className={styles.muted} style={{ fontSize: 13, lineHeight: 1.55, margin: '0 0 18px' }}>
              <strong style={{ color: 'var(--ink)' }}>{draft.name}</strong> will go live immediately — appearing on their story page and in Born Today on {born ? born.replace('born ', '') : 'their birthday'}.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setPublishConfirm(false)} disabled={pubPending}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnGold}`} onClick={() => applyPublish(true)} disabled={pubPending}>{pubPending ? 'Publishing…' : 'Publish now'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Center panel: the selected section's fields ──────────────────────────────

function CenterPanel({ active, draft, dispatch, onSelect, rw }: {
  active: Section; draft: EditorPerson; dispatch: React.Dispatch<DraftAction>; onSelect: (id: string) => void; rw: RewriteApi;
}) {
  const set = (key: keyof EditorPerson) => (value: string) => dispatch({ type: 'field', key, value });
  const rowInput = (placeholder: string, value: string, onChange: (v: string) => void, extra?: React.CSSProperties, list?: string) => (
    <input className={styles.field} list={list} style={{ padding: '9px 12px', fontSize: 13, ...extra }} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  );

  switch (active.kind) {
    case 'cover':
      return (
        <>
          <div><Kick>Cover · identity</Kick></div>
          <TextField label="Name" value={draft.name ?? ''} onChange={set('name')} serif />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
            <TextField label="Role (epithet)" value={draft.role ?? ''} onChange={set('role')} placeholder="Painter, Inventor & Endless Dreamer" />
            <TextField label="Field" value={draft.field ?? ''} onChange={set('field')} placeholder="Art & Science" />
            <TextField label="Country" value={draft.country ?? ''} onChange={set('country')} placeholder="Italy" />
            <TextField label="Story title" value={draft.story_title ?? ''} onChange={set('story_title')} placeholder={draft.name ?? ''} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Kick>Birth date <span style={{ color: 'var(--red)' }}>*</span></Kick>
              <input type="date" className={styles.field} style={{ padding: '10px 14px' }}
                value={draft.birth_date ?? ''} onChange={(e) => dispatch({ type: 'field', key: 'birth_date', value: e.target.value })} />
              <div className={styles.muted} style={{ fontSize: 10.5, color: draft.birth_date ? 'var(--brown2)' : 'var(--red)' }}>
                Required — Born Today surfaces a person by their birth month-day.
              </div>
            </div>
            <DeathDateControl value={draft.death_date ?? ''} onChange={(v) => dispatch({ type: 'field', key: 'death_date', value: v })} />
          </div>
          <TextField label="Famous quote" value={draft.famous_quote ?? ''} onChange={set('famous_quote')} placeholder="Learning never exhausts the mind." />
          <CoverImageCard src={draft.image_url} />
        </>
      );
    case 'childhood':
      return (
        <>
          <TextField label="Childhood page · title" value={draft.story_childhood_title ?? ''} onChange={set('story_childhood_title')} serif placeholder="A Little Boy in Vinci" />
          <NarrativeField label="Narrative" value={draft.story_childhood ?? ''} onChange={set('story_childhood')} fieldPath="story_childhood" rw={rw} />
        </>
      );
    case 'chapter': {
      const i = active.chapterIndex!;
      const ch = draft.chapters[i];
      const artOnly = ch?.page_span === 'image';
      const addChapter = () => { dispatch({ type: 'listAdd', list: 'chapters' }); onSelect(`chapter-${draft.chapters.length}`); };
      const duplicate = () => { dispatch({ type: 'listDuplicate', list: 'chapters', index: i }); onSelect(`chapter-${i + 1}`); };
      const remove = () => { dispatch({ type: 'listDelete', list: 'chapters', index: i }); onSelect(draft.chapters.length > 1 ? `chapter-${Math.max(0, i - 1)}` : 'cover'); };
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Kick>Chapter {ch?.number ?? i + 1} of {draft.chapters.length}</Kick>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`${styles.btn} ${styles.btnSm}`} onClick={addChapter}>＋ Add</button>
              <button className={`${styles.btn} ${styles.btnSm}`} onClick={duplicate}>⧉ Duplicate</button>
              <button className={`${styles.btn} ${styles.btnSm}`} onClick={remove} style={{ color: 'var(--red)', borderColor: 'rgba(181,83,58,.42)' }}>🗑 Delete</button>
            </div>
          </div>
          {artOnly && (
            <div className={styles.callout} style={{ padding: '10px 12px', fontSize: 11.5, color: 'var(--brown)' }}>
              This chapter is a wordless full-page illustration — its narrative is written but not shown.
            </div>
          )}
          <TextField label="Chapter title" value={ch?.title ?? ''} onChange={(v) => dispatch({ type: 'chapterField', index: i, key: 'title', value: v })} serif />
          <NarrativeField label="Narrative" value={ch?.narrative ?? ''} onChange={(v) => dispatch({ type: 'chapterField', index: i, key: 'narrative', value: v })} fieldPath={`chapters.${i}.narrative`} rw={rw} />
          <LayoutPicker
            span={ch?.page_span} blend={ch?.blend} fade={ch?.fade}
            onSpan={(v) => dispatch({ type: 'chapterField', index: i, key: 'page_span', value: v })}
            onBlend={(v) => dispatch({ type: 'chapterField', index: i, key: 'blend', value: v })}
            onFade={(v) => dispatch({ type: 'chapterField', index: i, key: 'fade', value: v })}
          />
        </>
      );
    }
    case 'modern':
      return (
        <>
          <TextField label={'“If … were 10 today” · title'} value={draft.modern?.title ?? ''} onChange={(v) => dispatch({ type: 'objField', key: 'modern', field: 'title', value: v })} serif />
          <NarrativeField label="Narrative" value={draft.modern?.narrative ?? ''} onChange={(v) => dispatch({ type: 'objField', key: 'modern', field: 'narrative', value: v })} fieldPath="modern.narrative" rw={rw} />
          <LayoutPicker
            span={draft.modern?.page_span} blend={draft.modern?.blend} fade={draft.modern?.fade}
            onSpan={(v) => dispatch({ type: 'objField', key: 'modern', field: 'page_span', value: v })}
            onBlend={(v) => dispatch({ type: 'objField', key: 'modern', field: 'blend', value: v })}
            onFade={(v) => dispatch({ type: 'objField', key: 'modern', field: 'fade', value: v })}
          />
        </>
      );
    case 'after':
      return (
        <>
          <TextField label="Gifts That Live On · title" value={draft.after_treasures?.title ?? ''} onChange={(v) => dispatch({ type: 'objField', key: 'after_treasures', field: 'title', value: v })} serif />
          <NarrativeField label="Narrative" value={draft.after_treasures?.narrative ?? ''} onChange={(v) => dispatch({ type: 'objField', key: 'after_treasures', field: 'narrative', value: v })} fieldPath="after_treasures.narrative" rw={rw} />
          {/* Rendered as a single leaf on the Treasures spread — only blend + wash apply. */}
          <div className={styles.panel} style={{ padding: 16, display: 'flex', gap: 26, flexWrap: 'wrap' }}>
            <div>
              <div className={styles.muted} style={{ fontSize: 11, marginBottom: 9, fontWeight: 700 }}>Blend</div>
              <div className={styles.seg}>
                <button className={!(draft.after_treasures?.blend === 'normal') ? styles.segOn : ''} onClick={() => dispatch({ type: 'objField', key: 'after_treasures', field: 'blend', value: 'multiply' })}>Multiply</button>
                <button className={draft.after_treasures?.blend === 'normal' ? styles.segOn : ''} onClick={() => dispatch({ type: 'objField', key: 'after_treasures', field: 'blend', value: 'normal' })}>Normal</button>
              </div>
            </div>
            <div>
              <div className={styles.muted} style={{ fontSize: 11, marginBottom: 9, fontWeight: 700 }}>Text wash</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <button className={`${styles.sw}${draft.after_treasures?.fade !== false ? '' : ` ${styles.swOff}`}`} onClick={() => dispatch({ type: 'objField', key: 'after_treasures', field: 'fade', value: draft.after_treasures?.fade === false })} aria-label="Toggle text wash" />
                <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700 }}>{draft.after_treasures?.fade !== false ? 'Fade on' : 'Fade off'}</span>
              </div>
            </div>
          </div>
        </>
      );
    case 'takeaway':
      return <NarrativeField label="Takeaway · one closing line" value={draft.story_takeaway ?? ''} onChange={set('story_takeaway')} fieldPath="story_takeaway" rw={rw} />;
    case 'timeline':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Kick>Life timeline · milestones</Kick>
          <RowList
            count={draft.timeline.length} addLabel="Add milestone"
            onAdd={() => dispatch({ type: 'listAdd', list: 'timeline' })}
            onDelete={(i) => dispatch({ type: 'listDelete', list: 'timeline', index: i })}
            onReorder={(from, to) => dispatch({ type: 'listReorder', list: 'timeline', from, to })}
            renderRow={(i) => (
              <div style={{ display: 'flex', gap: 8 }}>
                {rowInput('Year', draft.timeline[i].year ?? '', (v) => dispatch({ type: 'listItemField', list: 'timeline', index: i, key: 'year', value: v }), { flex: '0 0 88px' })}
                {rowInput('Caption', draft.timeline[i].caption ?? '', (v) => dispatch({ type: 'listItemField', list: 'timeline', index: i, key: 'caption', value: v }), { flex: 1 })}
              </div>
            )}
          />
        </div>
      );
    case 'treasures':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Kick>Treasures · their gifts to the world</Kick>
          <RowList
            count={draft.treasures.length} addLabel="Add treasure"
            onAdd={() => dispatch({ type: 'listAdd', list: 'treasures' })}
            onDelete={(i) => dispatch({ type: 'listDelete', list: 'treasures', index: i })}
            onReorder={(from, to) => dispatch({ type: 'listReorder', list: 'treasures', from, to })}
            renderRow={(i) => rowInput('Name', draft.treasures[i].name ?? '', (v) => dispatch({ type: 'listItemField', list: 'treasures', index: i, key: 'name', value: v }))}
          />
        </div>
      );
    case 'lessons':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Kick>Lessons · what can we learn</Kick>
          <datalist id="lesson-icons">
            {LESSON_ICONS.map((ic) => <option key={ic} value={ic} />)}
          </datalist>
          <RowList
            count={draft.lessons.length} addLabel="Add lesson"
            onAdd={() => dispatch({ type: 'listAdd', list: 'lessons' })}
            onDelete={(i) => dispatch({ type: 'listDelete', list: 'lessons', index: i })}
            onReorder={(from, to) => dispatch({ type: 'listReorder', list: 'lessons', from, to })}
            renderRow={(i) => (
              <div style={{ display: 'flex', gap: 8 }}>
                {rowInput('curiosity', draft.lessons[i].icon_name ?? '', (v) => dispatch({ type: 'listItemField', list: 'lessons', index: i, key: 'icon_name', value: v }), { flex: '0 0 130px' }, 'lesson-icons')}
                {rowInput('The lesson…', draft.lessons[i].lesson ?? '', (v) => dispatch({ type: 'listItemField', list: 'lessons', index: i, key: 'lesson', value: v }), { flex: 1 })}
              </div>
            )}
          />
        </div>
      );
    default:
      return null;
  }
}
