'use client';
/**
 * The compact image-slot affordance shown inside a section editor: a thumbnail,
 * the slot label, a glanceable status chip and "Open slot", which opens the
 * full slot card (screen ②). Replaces the Phase-4 CoverImageCard placeholder
 * and stands in for every other single-image section.
 */
import type { SlotView } from './imageSlots';
import { Button } from '@/components/ds';
import styles from './PersonEditor.module.css';

const CHIP: Record<SlotView['status'], { cls: string; label: string }> = {
  empty: { cls: styles.chipInk, label: 'empty' },
  'prompt-ready': { cls: styles.chipGold, label: 'prompt ready' },
  generating: { cls: styles.chipAmber, label: 'generating…' },
  generated: { cls: styles.chipGreen, label: '✓ set' },
  uploaded: { cls: styles.chipInk, label: '⤓ uploaded' },
  failed: { cls: styles.chipRed, label: 'failed' },
};

export default function SlotChip({ slot, hint, onOpen }: { slot: SlotView; hint?: string; onOpen: () => void }) {
  const chip = CHIP[slot.status];
  return (
    <div className={`${styles.panel} ${styles.slotChip}`}>
      <div className={styles.slotChipTh} style={{ aspectRatio: slot.size.replace('x', ' / '), backgroundImage: slot.imageUrl ? `url(${slot.imageUrl})` : undefined }}>
        {!slot.imageUrl && <span className={styles.muted} style={{ fontSize: 10 }}>No art</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span className={styles.kick} style={{ color: 'var(--brown)' }}>{slot.label}</span>
          <span className={`${styles.chip} ${chip.cls}`}>{chip.label}</span>
        </div>
        <div className={styles.muted} style={{ fontSize: 12, marginTop: 5 }}>{hint ?? `${slot.blend} · ${slot.size.replace('x', '×')}`}</div>
      </div>
      <Button variant="ghost" size="sm" onClick={onOpen}>Open slot ▾</Button>
    </div>
  );
}
