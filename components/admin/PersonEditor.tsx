'use client';
/**
 * PersonEditor (screen ① of the approved design): top bar / 232px section rail /
 * center editing panel / 512px live-book preview. Phase 3 delivers the shell,
 * the derived section rail with completeness dots, debounced autosave, the
 * Draft/Publish control, and the real <GoldenStory> preview flipping in lockstep
 * with the rail. The richer per-section editors (layout pickers, row editors,
 * image slots) arrive in Phases 4–6; the center panel here edits the text
 * fields, which is enough to drive autosave and the live preview.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import GoldenStory, { spreadCount } from '@/components/dailygold/GoldenStory';
import { savePerson, setPublished as setPublishedAction, type EditorPerson } from '@/app/admin/people/actions';
import { deriveSections, type Section, type SectionStatus } from './personSections';
import styles from './PersonEditor.module.css';

const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Lato:wght@300;400;700&family=Great+Vibes&display=swap';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DOT_CLASS: Record<SectionStatus, string> = {
  done: styles.dDone, part: styles.dPart, empty: styles.dEmpty, warn: styles.dWarn,
};

// ── Draft reducer ────────────────────────────────────────────────────────────

type DraftAction =
  | { type: 'field'; key: keyof EditorPerson; value: unknown }
  | { type: 'chapter'; index: number; key: 'title' | 'narrative'; value: string }
  | { type: 'obj'; key: 'modern' | 'after_treasures'; field: 'title' | 'narrative'; value: string };

function draftReducer(state: EditorPerson, action: DraftAction): EditorPerson {
  switch (action.type) {
    case 'field':
      return { ...state, [action.key]: action.value } as EditorPerson;
    case 'chapter':
      return {
        ...state,
        chapters: state.chapters.map((c, i) => (i === action.index ? { ...c, [action.key]: action.value } : c)),
      };
    case 'obj': {
      const cur = state[action.key] ?? {};
      return { ...state, [action.key]: { ...cur, [action.field]: action.value } } as EditorPerson;
    }
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

function NarrativeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const words = wordCount(value);
  const tone = words > 75 ? styles.chipRed : words > 70 ? styles.chipAmber : styles.chipInk;
  const chipText = words > 75 ? `Over the leaf · ${words} words` : words > 70 ? `Leaf nearly full · ${words} words` : `${words} words`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Kick>{label}</Kick>
        <span className={`${styles.chip} ${tone}`}>{chipText}</span>
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
    </div>
  );
}

// A read-only summary for the row-based sections whose editors land in Phase 4.
function RowSummaryPanel({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Kick>{title}</Kick>
      {rows.length === 0 ? (
        <div className={styles.muted} style={{ fontSize: 13 }}>{empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((r, i) => (
            <div key={i} className={styles.panel} style={{ padding: '9px 12px', fontSize: 13, color: 'var(--brown)' }}>{r}</div>
          ))}
        </div>
      )}
      <div className={styles.callout} style={{ padding: '9px 12px', fontSize: 11.5, color: 'var(--brown)' }}>
        Row editing (add · reorder · per-row art) arrives with the section editors.
      </div>
    </div>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────

export default function PersonEditor({ initialPerson }: { initialPerson: EditorPerson }) {
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
    const t = setTimeout(() => { void doSave(draft); }, 2000);
    return () => clearTimeout(t);
  }, [draft, doSave]);

  // Warn before leaving with unsaved work.
  useEffect(() => {
    const dirty = save.status === 'dirty' || save.status === 'saving';
    const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [save.status]);

  const selectSection = (sec: Section) => { setSelectedId(sec.id); setPage(sec.spreadIndex); };
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
          {sections.map((s) => (
            <button
              key={s.id}
              className={`${styles.navrow}${s.id === active?.id ? ` ${styles.navrowOn}` : ''}`}
              onClick={() => selectSection(s)}
            >
              <span className={`${styles.dot} ${DOT_CLASS[s.status]}`} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              {s.note && (
                <span style={{ marginLeft: 'auto', font: '700 9px/1 var(--sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--amber)' }}>{s.note}</span>
              )}
              {s.count && <span style={{ marginLeft: 'auto' }} className={`${styles.muted} ${styles.mono}`}>{s.count}</span>}
            </button>
          ))}
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
          <CenterPanel active={active} draft={draft} dispatch={edit} />
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

function CenterPanel({ active, draft, dispatch }: {
  active: Section; draft: EditorPerson; dispatch: React.Dispatch<DraftAction>;
}) {
  const set = (key: keyof EditorPerson) => (value: string) => dispatch({ type: 'field', key, value });

  switch (active.kind) {
    case 'cover':
      return (
        <>
          <div><Kick>Cover · identity</Kick></div>
          <TextField label="Name" value={draft.name ?? ''} onChange={set('name')} serif />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <TextField label="Role (epithet)" value={draft.role ?? ''} onChange={set('role')} placeholder="Painter, Inventor & Endless Dreamer" />
            <TextField label="Field" value={draft.field ?? ''} onChange={set('field')} placeholder="Art & Science" />
            <TextField label="Country" value={draft.country ?? ''} onChange={set('country')} placeholder="Italy" />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Kick>Birth date</Kick>
              <input type="date" className={styles.field} style={{ padding: '10px 14px' }}
                value={draft.birth_date ?? ''} onChange={(e) => dispatch({ type: 'field', key: 'birth_date', value: e.target.value })} />
            </label>
            <TextField label="Death date (year or full date, blank if living)" value={draft.death_date ?? ''} onChange={set('death_date')} placeholder="1519" />
            <TextField label="Story title" value={draft.story_title ?? ''} onChange={set('story_title')} placeholder={draft.name ?? ''} />
          </div>
          <TextField label="Famous quote" value={draft.famous_quote ?? ''} onChange={set('famous_quote')} placeholder="Learning never exhausts the mind." />
          <div className={styles.callout} style={{ padding: '10px 12px', fontSize: 11.5, color: 'var(--brown)' }}>
            The cover illustration is edited in its image slot (arriving with the art tools).
          </div>
        </>
      );
    case 'childhood':
      return (
        <>
          <TextField label="Childhood page · title" value={draft.story_childhood_title ?? ''} onChange={set('story_childhood_title')} serif placeholder="A Little Boy in Vinci" />
          <NarrativeField label="Narrative" value={draft.story_childhood ?? ''} onChange={set('story_childhood')} />
        </>
      );
    case 'chapter': {
      const i = active.chapterIndex!;
      const ch = draft.chapters[i];
      const artOnly = ch?.page_span === 'image';
      return (
        <>
          <div><Kick>Chapter {ch?.number ?? i + 1} of {draft.chapters.length}</Kick></div>
          {artOnly && (
            <div className={styles.callout} style={{ padding: '10px 12px', fontSize: 11.5, color: 'var(--brown)' }}>
              This chapter is a wordless full-page illustration — its narrative is written but not shown.
            </div>
          )}
          <TextField label="Chapter title" value={ch?.title ?? ''} onChange={(v) => dispatch({ type: 'chapter', index: i, key: 'title', value: v })} serif />
          <NarrativeField label="Narrative" value={ch?.narrative ?? ''} onChange={(v) => dispatch({ type: 'chapter', index: i, key: 'narrative', value: v })} />
        </>
      );
    }
    case 'modern':
      return (
        <>
          <TextField label={'“If … were 10 today” · title'} value={draft.modern?.title ?? ''} onChange={(v) => dispatch({ type: 'obj', key: 'modern', field: 'title', value: v })} serif />
          <NarrativeField label="Narrative" value={draft.modern?.narrative ?? ''} onChange={(v) => dispatch({ type: 'obj', key: 'modern', field: 'narrative', value: v })} />
        </>
      );
    case 'after':
      return (
        <>
          <TextField label="Gifts That Live On · title" value={draft.after_treasures?.title ?? ''} onChange={(v) => dispatch({ type: 'obj', key: 'after_treasures', field: 'title', value: v })} serif />
          <NarrativeField label="Narrative" value={draft.after_treasures?.narrative ?? ''} onChange={(v) => dispatch({ type: 'obj', key: 'after_treasures', field: 'narrative', value: v })} />
        </>
      );
    case 'takeaway':
      return <NarrativeField label="Takeaway · one closing line" value={draft.story_takeaway ?? ''} onChange={set('story_takeaway')} />;
    case 'timeline':
      return <RowSummaryPanel title="Life timeline" empty="No timeline milestones yet." rows={draft.timeline.map((t) => `${t.year ?? '—'} · ${t.caption ?? ''}`)} />;
    case 'treasures':
      return <RowSummaryPanel title="Treasures" empty="No treasures yet." rows={draft.treasures.map((t) => t.name ?? '—')} />;
    case 'lessons':
      return <RowSummaryPanel title="Lessons" empty="No lessons yet." rows={draft.lessons.map((l) => `${l.icon_name ?? '—'} · ${l.lesson ?? ''}`)} />;
    default:
      return null;
  }
}
