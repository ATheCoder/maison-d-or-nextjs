'use client';
/**
 * The image status board (screen ④): every slot at a glance in a 6-column grid,
 * fed by the same slot model the cards use. "Generate all missing" starts the
 * batch renderer; a failure banner offers per-slot retry and completed slots
 * are always kept. Clicking a tile opens its slot card.
 */
import type { SlotView } from './imageSlots';
import styles from './PersonEditor.module.css';

const TILE: Record<SlotView['status'], { th: string; chip?: { cls: string; label: string }; dot?: string }> = {
  empty: { th: styles.thEmpty, chip: { cls: styles.chipInk, label: 'empty' } },
  'prompt-ready': { th: styles.thEmpty, chip: { cls: styles.chipGold, label: 'ready' } },
  generating: { th: styles.thGen, chip: { cls: styles.chipAmber, label: 'gen…' } },
  generated: { th: styles.thArt, dot: styles.dDone },
  uploaded: { th: styles.thArt, chip: { cls: styles.chipInk, label: 'uploaded' } },
  failed: { th: styles.thFail, chip: { cls: styles.chipRed, label: 'retry' } },
};

export default function ImageStatusBoard({ slots, batchRunning, onStartBatch, onOpenSlot, onClose }: {
  slots: SlotView[];
  batchRunning: boolean;
  onStartBatch: (files?: string[]) => void;
  onOpenSlot: (file: string) => void;
  onClose: () => void;
}) {
  const total = slots.length;
  const done = slots.filter((s) => s.status === 'generated' || s.status === 'uploaded').length;
  const failed = slots.filter((s) => s.status === 'failed');
  const missing = slots.filter((s) => s.status === 'empty' || s.status === 'prompt-ready');
  const generatable = missing.filter((s) => s.hasPrompt);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(36,26,12,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 65, padding: '1.5rem' }}>
      <div onClick={(e) => e.stopPropagation()} className={styles.panel} style={{ background: 'var(--ground)', padding: 22, width: 'min(940px, 100%)', maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className={styles.kick}>Illustrations · book-wide</div>
            <div className={styles.serif} style={{ fontSize: 20, fontWeight: 600, marginTop: 5, color: 'var(--ink)' }}>Generate all missing images</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`${styles.chip} ${batchRunning ? styles.chipAmber : styles.chipInk}`}>{done} of {total} done{batchRunning ? ' · running' : ''}</span>
            {failed.length > 0
              ? <button className={`${styles.btn} ${styles.btnGold}`} onClick={() => onStartBatch(failed.map((s) => s.file))} disabled={batchRunning}>Retry failed ({failed.length})</button>
              : <button className={`${styles.btn} ${styles.btnGold}`} onClick={() => onStartBatch()} disabled={batchRunning || generatable.length === 0} title={generatable.length === 0 ? 'Every renderable slot is filled' : undefined}>Generate all missing ({generatable.length})</button>}
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onClose}>✕</button>
          </div>
        </div>

        {failed.length > 0 && (
          <div className={styles.panel} style={{ marginTop: 14, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(181,83,58,.07)', borderColor: 'rgba(181,83,58,.3)', flexWrap: 'wrap' }}>
            <span className={`${styles.dot} ${styles.dWarn}`} style={{ background: 'var(--red)' }} />
            <span style={{ fontSize: 12.5, color: 'var(--brown)' }}>
              <b>{failed.map((s) => s.file.replace('.png', '')).join(', ')}</b> failed to render — completed slots are kept.
            </span>
            {failed.map((s) => (
              <button key={s.file} className={`${styles.btn} ${styles.btnSm}`} onClick={() => onStartBatch([s.file])} disabled={batchRunning}>↻ Retry {s.shortLabel}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginTop: 16 }}>
          {slots.map((s) => {
            const t = TILE[s.status];
            return (
              <button key={s.file} className={styles.slotTile} style={s.status === 'failed' ? { borderColor: 'rgba(181,83,58,.5)' } : undefined} onClick={() => onOpenSlot(s.file)} title={`Open ${s.label}`}>
                <div className={`${styles.slotTh} ${t.th}`} style={{ backgroundImage: (s.status === 'generated' || s.status === 'uploaded') && s.imageUrl ? `url(${s.imageUrl})` : undefined }}>
                  {s.status === 'failed' && <span style={{ color: 'var(--red)', fontSize: 15 }}>↻</span>}
                  {s.status === 'generating' && <span className={`${styles.saveDot} ${styles.saveDotSaving}`} />}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.shortLabel}</span>
                  {t.dot ? <span className={`${styles.dot} ${t.dot}`} /> : <span className={`${styles.chip} ${t.chip!.cls}`} style={{ fontSize: 8, padding: '3px 6px' }}>{t.chip!.label}</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className={styles.muted} style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><span className={`${styles.dot} ${styles.dDone}`} />generated</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><span className={`${styles.chip} ${styles.chipInk}`} style={{ fontSize: 8, padding: '3px 6px' }}>uploaded</span>from an outside tool</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><span className={`${styles.dot} ${styles.dWarn}`} />generating</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><span className={`${styles.dot} ${styles.dEmpty}`} />empty · renders a labeled placeholder</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><span className={styles.dot} style={{ background: 'var(--red)' }} />failed · one-click retry</span>
        </div>
      </div>
    </div>
  );
}
