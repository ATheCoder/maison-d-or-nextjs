'use client';
/**
 * The image slot (screen ② of the design), opened as a modal over the editor.
 * Parameter chips, the decomposed prompt (🔒 fixed blocks collapsed, editable
 * scene with the character-sheet span highlighted, "Edit full prompt" escape
 * hatch), and the two interchangeable paths: Path A generates here (staging
 * preview on the parchment with the slot's real blend → Regenerate/Revert/
 * Accept), Path B copies the prompt + parameters and takes a PNG/webp back via
 * the drop zone (corner-pixel check warns, never blocks, on multiply slots).
 */
import { useRef, useState } from 'react';
import { fixedBlocksFor } from '@/lib/golden-story/slots';
import type { GenerationJobRow } from '@/src/db/schema';
import {
  saveSlotScene, saveSlotFullPrompt, generateSlot,
  acceptSlotRender, revertSlotRender, uploadSlotImage,
} from '@/app/admin/people/imageActions';
import type { SlotView } from './imageSlots';
import styles from './PersonEditor.module.css';

const STATUS_CHIP: Record<SlotView['status'], { cls: string; label: string }> = {
  empty: { cls: styles.chipInk, label: 'empty' },
  'prompt-ready': { cls: styles.chipGold, label: 'prompt ready' },
  generating: { cls: styles.chipAmber, label: 'generating…' },
  generated: { cls: styles.chipGreen, label: '✓ generated' },
  uploaded: { cls: styles.chipInk, label: '⤓ uploaded' },
  failed: { cls: styles.chipRed, label: 'failed' },
};

// Highlight the character-sheet prefix inside the scene, the way the design
// shades the verbatim anchor.
function SceneWithAnchor({ scene, characterSheet }: { scene: string; characterSheet: string }) {
  const cs = characterSheet.trim();
  if (cs && scene.trim().toLowerCase().startsWith(cs.toLowerCase())) {
    const head = scene.slice(0, cs.length);
    const tail = scene.slice(cs.length);
    return (
      <>
        <span style={{ background: 'rgba(125,138,78,.16)', borderRadius: 3, padding: '0 2px' }}>{head}</span>{tail}
      </>
    );
  }
  return <>{scene}</>;
}

// Sample the four corner pixels; returns true when every corner reads near-white
// (the flat background multiply slots need). Runs entirely client-side.
async function cornersAreWhite(file: File): Promise<boolean> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return true; // can't check — don't warn
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  ctx.drawImage(bitmap, 0, 0);
  const pts = [[0, 0], [bitmap.width - 1, 0], [0, bitmap.height - 1], [bitmap.width - 1, bitmap.height - 1]];
  return pts.every(([x, y]) => {
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    return r >= 244 && g >= 244 && b >= 244;
  });
}

export default function SlotCard({ slug, slot, characterSheet, slotJob, onClose, onChanged }: {
  slug: string;
  slot: SlotView;
  characterSheet: string;
  slotJob: GenerationJobRow | null; // the current Path-A job, if it targets this slot
  onClose: () => void;
  // Told when something changed: the brief scene ('scene'), an override, or the
  // live image URL — so the editor refreshes its slot data / draft.
  onChanged: (what: 'scene' | 'override' | 'image', payload?: { scene?: string; url?: string }) => void;
}) {
  const [showFixed, setShowFixed] = useState(false);
  const [editingScene, setEditingScene] = useState(false);
  const [sceneDraft, setSceneDraft] = useState(slot.scene);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState(slot.prompt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dropWarn, setDropWarn] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // This card's slice of the Path-A job (only if the running/finished job is ours).
  const mine = slotJob && (
    (slotJob.result as { file?: string } | null)?.file === slot.file
    || !!slotJob.progress?.slots?.[slot.file]
  ) ? slotJob : null;
  const rendering = mine?.state === 'running';
  const staged = mine?.state === 'done' ? (mine.result as { stagingUrl?: string } | null)?.stagingUrl ?? null : null;
  const renderFailed = mine?.state === 'failed';

  const fixed = fixedBlocksFor(slot.placement);
  const chip = STATUS_CHIP[slot.status];

  const run = (fn: () => Promise<void>) => { setBusy(true); setError(null); void fn().finally(() => setBusy(false)); };

  const saveScene = () => run(async () => {
    const res = await saveSlotScene(slug, slot.file, sceneDraft);
    if (!res.ok) { setError(res.error ?? 'Could not save the scene.'); return; }
    setEditingScene(false);
    onChanged('scene', { scene: sceneDraft });
  });

  const savePrompt = () => run(async () => {
    await saveSlotFullPrompt(slug, slot.file, promptDraft);
    setEditingPrompt(false);
    onChanged('override');
  });
  const resetPrompt = () => run(async () => {
    await saveSlotFullPrompt(slug, slot.file, null);
    setEditingPrompt(false);
    onChanged('override');
  });

  const generate = () => run(async () => {
    const res = await generateSlot(slug, slot.file);
    if (!res.ok) setError(res.error);
    else onChanged('override'); // nudge the editor to start polling
  });
  const accept = () => { if (mine) run(async () => {
    const res = await acceptSlotRender(slug, mine.id);
    if (!res.ok) setError(res.error ?? 'Could not accept.');
    else onChanged('image', { url: res.url });
  }); };
  const revert = () => { if (mine) run(async () => {
    await revertSlotRender(slug, mine.id);
    onChanged('override');
  }); };

  const copyPrompt = () => {
    void navigator.clipboard.writeText(slot.copyText).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    });
  };

  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!/\.(png|webp)$/i.test(file.name) && !/image\/(png|webp)/.test(file.type)) {
      setDropWarn('Only PNG or webp files can be uploaded.'); return;
    }
    run(async () => {
      setDropWarn(null);
      if (slot.needsWhiteBg && !(await cornersAreWhite(file))) {
        setDropWarn('Heads up: the corners aren’t pure white, so this multiply slot may show as a box on the page. Uploaded anyway.');
      }
      const form = new FormData();
      form.set('slug', slug); form.set('file', slot.file); form.set('image', file);
      const res = await uploadSlotImage(form);
      if (!res.ok) { setError(res.error ?? 'Upload failed.'); return; }
      onChanged('image', { url: res.url });
    });
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(36,26,12,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '1.5rem' }}>
      <div onClick={(e) => e.stopPropagation()} className={styles.panel} style={{ background: 'var(--ground)', padding: 22, width: 'min(680px, 100%)', maxHeight: '92vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className={styles.kick}>{slot.label} slot</div>
            <div className={styles.serif} style={{ fontSize: 20, fontWeight: 600, marginTop: 5, color: 'var(--ink)' }}>{slot.file}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`${styles.chip} ${chip.cls}`}>{chip.label}</span>
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Parameter chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <span className={`${styles.chip} ${styles.chipInk}`}>{slot.size.replace('x', ' × ')} px</span>
          <span className={`${styles.chip} ${styles.chipInk}`}>{slot.blend}</span>
          {slot.needsWhiteBg && <span className={`${styles.chip} ${styles.chipGold}`}>needs white bg</span>}
        </div>

        {/* Prompt — decomposed */}
        <div style={{ marginTop: 18 }}>
          <div className={styles.kick} style={{ marginBottom: 8 }}>The prompt</div>

          {editingPrompt ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span className={`${styles.chip} ${styles.chipAmber}`}>⌥ full prompt override</span>
                <span className={styles.muted} style={{ fontSize: 11 }}>Editing the whole prompt — the scene no longer drives it until you reset.</span>
              </div>
              <textarea className={styles.field} style={{ padding: '12px 14px', minHeight: 180, fontSize: 12.5, lineHeight: 1.6 }} value={promptDraft} onChange={(e) => setPromptDraft(e.target.value)} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => { setEditingPrompt(false); setPromptDraft(slot.prompt); }} disabled={busy}>Cancel</button>
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGold}`} onClick={savePrompt} disabled={busy}>Save prompt</button>
              </div>
            </>
          ) : (
            <>
              <button className={styles.panel} style={{ width: '100%', textAlign: 'left', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(36,26,12,.04)', cursor: 'pointer' }} onClick={() => setShowFixed((v) => !v)}>
                <span style={{ color: 'var(--brown2)' }}>🔒</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brown)' }}>Fixed style &amp; composition blocks</div>
                  <div className={styles.muted} style={{ fontSize: 11 }}>Applied to every slot — golden-storybook gouache · warm palette · the {slot.placement} bleed.</div>
                </div>
                <span className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}>{showFixed ? 'Hide ▴' : 'Show ▾'}</span>
              </button>
              {showFixed && (
                <div className={styles.field} style={{ padding: '11px 13px', marginTop: 8, fontSize: 11.5, lineHeight: 1.55, color: 'var(--brown2)', whiteSpace: 'pre-wrap' }}>
                  {fixed.style}{'\n\n[ the scene below ]\n\n'}{fixed.composition}
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brown)' }}>Scene — the editable part</span>
                  {slot.hasFullPrompt
                    ? <span className={`${styles.chip} ${styles.chipAmber}`}>⌥ custom full prompt</span>
                    : slot.charSheetIncluded === true ? <span className={`${styles.chip} ${styles.chipGreen}`}>✓ character sheet included</span>
                      : slot.charSheetIncluded === false ? <span className={`${styles.chip} ${styles.chipAmber}`}>consistency may drift</span>
                        : null}
                </div>
                {editingScene ? (
                  <>
                    <textarea className={styles.field} autoFocus style={{ padding: '13px 15px', minHeight: 120, fontSize: 13, lineHeight: 1.65 }} value={sceneDraft} onChange={(e) => setSceneDraft(e.target.value)} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                      <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => { setEditingScene(false); setSceneDraft(slot.scene); }} disabled={busy}>Cancel</button>
                      <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGold}`} onClick={saveScene} disabled={busy}>Save scene</button>
                    </div>
                  </>
                ) : (
                  <div className={styles.field} style={{ padding: '13px 15px', lineHeight: 1.65, fontSize: 13, color: 'var(--brown)', cursor: slot.hasFullPrompt ? 'default' : 'text', minHeight: 60 }} onClick={() => { if (!slot.hasFullPrompt) { setSceneDraft(slot.scene); setEditingScene(true); } }}>
                    {slot.scene
                      ? <SceneWithAnchor scene={slot.scene} characterSheet={characterSheet} />
                      : <span className={styles.muted}>No scene yet — generate the story text, or ⌥ Edit full prompt.</span>}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <span className={styles.muted} style={{ fontSize: 11 }}>Editing the scene re-derives the full prompt.</span>
                  {slot.hasFullPrompt
                    ? <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} style={{ marginLeft: 'auto' }} onClick={resetPrompt} disabled={busy}>↺ Use derived prompt</button>
                    : <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} style={{ marginLeft: 'auto' }} onClick={() => { setPromptDraft(slot.prompt); setEditingPrompt(true); }} disabled={!slot.prompt}>⌥ Edit full prompt</button>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Path A / Path B */}
        <div style={{ display: 'flex', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
          {/* Path A — generate here */}
          <div className={styles.panel} style={{ flex: '1 1 250px', padding: 15, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`${styles.chip} ${styles.chipGold}`}>Path A</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Generate here</span>
            </div>
            <div style={{ minHeight: 120, maxHeight: 280, borderRadius: 7, overflow: 'hidden', background: 'var(--parch, #efe4c8)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {staged
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={staged} alt="" style={{ maxWidth: '100%', maxHeight: 280, width: 'auto', height: 'auto', display: 'block', mixBlendMode: slot.blend === 'multiply' ? 'multiply' : 'normal' }} />
                : rendering ? <span className={styles.muted} style={{ fontSize: 11.5 }}>✦ Rendering… (tens of seconds)</span>
                  : slot.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={slot.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: 280, width: 'auto', height: 'auto', display: 'block', mixBlendMode: slot.blend === 'multiply' ? 'multiply' : 'normal' }} />
                    : <span className={styles.muted} style={{ fontSize: 11 }}>No art yet</span>}
            </div>
            <div className={styles.muted} style={{ fontSize: 10.5 }}>Preview lands on the parchment with the slot’s real {slot.blend} blend.</div>
            {renderFailed && <div style={{ fontSize: 11.5, color: 'var(--red)' }}>{mine?.error ?? 'The render failed.'}</div>}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {staged ? (
                <>
                  <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGold}`} onClick={accept} disabled={busy}>✓ Accept</button>
                  <button className={`${styles.btn} ${styles.btnSm}`} onClick={generate} disabled={busy}>✦ Regenerate</button>
                  <button className={`${styles.btn} ${styles.btnSm}`} onClick={revert} disabled={busy}>Revert</button>
                </>
              ) : (
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGold}`} onClick={generate} disabled={busy || rendering || !slot.prompt} title={!slot.prompt ? 'Add a scene first' : undefined}>
                  {rendering ? 'Rendering…' : renderFailed ? '↻ Try again' : slot.imageUrl ? '✦ Regenerate' : '✦ Generate'}
                </button>
              )}
            </div>
          </div>

          {/* Path B — generate elsewhere */}
          <div className={styles.panel} style={{ flex: '1 1 250px', padding: 15, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`${styles.chip} ${styles.chipInk}`}>Path B</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Generate elsewhere</span>
            </div>
            <button className={`${styles.btn} ${styles.btnGold}`} style={{ justifyContent: 'center' }} onClick={copyPrompt} disabled={!slot.prompt}>{copied ? '✓ Copied' : '⧉ Copy prompt + parameters'}</button>
            <div className={styles.callout} style={{ padding: '9px 11px' }}>
              <div className={styles.mono} style={{ color: 'var(--brown)' }}>size {slot.size.replace('x', '×')}</div>
              {slot.needsWhiteBg && <div style={{ fontSize: 10.5, color: 'var(--brown)', marginTop: 3 }}>Background must be <b>pure flat white</b> — off-white or textured shows as a box on the page.</div>}
            </div>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
              style={{ border: `1.5px dashed ${dragOver ? 'var(--gold-deep)' : 'var(--line2)'}`, borderRadius: 9, padding: 14, textAlign: 'center', color: 'var(--brown2)', fontSize: 11.5, background: dragOver ? 'var(--gold-soft)' : '#fffdf8', cursor: 'pointer', display: 'block' }}
            >
              ⤓ Drop PNG / webp — or click<br />
              <span style={{ fontSize: 10 }}>{slot.needsWhiteBg ? 'corner pixels checked on upload' : 'opaque art — no corner check'}</span>
              <input ref={fileInput} type="file" accept="image/png,image/webp" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} disabled={busy} />
            </label>
            {dropWarn && <div style={{ fontSize: 11, color: 'var(--amber)', lineHeight: 1.45 }}>{dropWarn}</div>}
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  );
}
