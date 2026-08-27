import Link from 'next/link';
import { Chip, selectPillClasses } from '@/components/ds';
import type { ObservatoryData } from '@/app/(dg)/parent-observatory/actions';
import { weekdayForKey } from '@/lib/family-time';
import { formatMinutes } from '@/lib/observatory/format';
import { EmptyNote } from './EmptyNote';
import { LedgerCard, LedgerCardHead } from './LedgerCard';
import styles from './observatory.module.css';

/**
 * F6 · Edition recap — "what was in the paper that day, and what did she open?"
 *
 * The day chips are links, not buttons: selecting a day re-renders on the
 * server, so the unselected days' data is never shipped to the browser. That is
 * both the cheapest way to honour "no new API routes" and the strictest reading
 * of aggregates-only — the page holds exactly one day's worth of detail at a
 * time.
 *
 * Being links is also why they are not `Chip`, which is inert by design. They
 * are `SelectPill` in its `offer` variant — the unchosen days are dashed and
 * faint because they are days you could open rather than peers of the one you
 * are on, which is exactly what the mock's dashed edge was saying. The chips
 * below them, which only state a figure, ARE Chips.
 *
 * The denominator is what was *printed* that day, so a paper with no Good News
 * column counts out of eight rather than nine and the child is not shown as
 * having skipped something that never existed.
 */
export function EditionRecapCard({
  childId,
  childName,
  recap,
}: {
  childId: string;
  childName: string;
  recap: ObservatoryData['recap'];
}) {
  const { availableDays, selected } = recap;

  return (
    <LedgerCard variant="wide">
      <div className={styles.recapHead}>
        <div>
          <LedgerCardHead
            kick="Edition recap"
            title={selected ? `${weekdayForKey(selected.day)}’s paper` : 'The paper'}
          />
        </div>
        {availableDays.length > 0 ? (
          <nav className={styles.dayChips} aria-label="Choose an edition">
            {/* Oldest on the left, so the row reads like a calendar. */}
            {[...availableDays].reverse().map((day) => {
              const isOn = day.day === selected?.day;
              return (
                <Link
                  key={day.day}
                  href={`/parent-observatory/${childId}?edition=${day.day}`}
                  className={selectPillClasses({ variant: 'offer' })}
                  aria-current={isOn ? 'page' : undefined}
                >
                  {day.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      {selected ? (
        <>
          <p className={`type-caption ${styles.cardnote}`}>
            {childName} opened {selected.visited} of {selected.total} sections
            {selected.opened.length > 0 ? ', and lingered on:' : '.'}
          </p>
          {selected.opened.length > 0 ? (
            <div className={styles.chips}>
              {selected.opened.map((item) => (
                <Chip key={item.key} className={styles.chip}>
                  {item.label} · {formatMinutes(item.ms)}
                </Chip>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <EmptyNote>No editions opened yet.</EmptyNote>
      )}
    </LedgerCard>
  );
}
