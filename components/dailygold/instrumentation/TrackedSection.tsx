'use client';

/**
 * Wraps one region of the paper and reports how long the child actually looked
 * at it (docs/daily-gold-analytics-plan.md §4). "Looked at" is deliberately
 * narrow: at least half the section on screen AND the tab visible and focused.
 * A section scrolled past on the way somewhere else contributes nothing.
 *
 * The clock lives in the effect closure rather than in refs or state — nothing
 * here may cause a render, and a section that re-renders for its own reasons
 * must not restart its dwell.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import type { AnalyticsSection } from '@/lib/analytics-events';
import { useInstrumentation } from './DGInstrumentationProvider';

/** Half the section on screen is the line between "read" and "passed". */
const IN_VIEW_RATIO = 0.5;
/** Anything shorter is scroll-past noise, not a visit. */
const MIN_DWELL_MS = 1000;

export function TrackedSection({ id, children, className }: {
  id: AnalyticsSection;
  children: ReactNode;
  className?: string;
}) {
  const {
    enabled,
    track,
    attention,
    subscribeAttention,
    registerFlushCollector,
    setActiveSection,
    activeSection,
  } = useInstrumentation();
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // No provider or no child: this component is a plain div, and costs like one.
    if (!enabled) return;
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') return;

    let inView = false;
    let since: number | null = null;
    let accrued = 0;

    const startClock = () => {
      if (since === null) since = Date.now();
    };
    const stopClock = () => {
      if (since === null) return;
      accrued += Date.now() - since;
      since = null;
    };

    /**
     * Bank what has accumulated. `discardRemainder` marks an exit: a sub-second
     * visit dies with it. At flush the remainder is kept instead — otherwise a
     * slow reader's dwell would be shaved by up to a second every 20 s.
     */
    const bank = (discardRemainder: boolean) => {
      stopClock();
      if (accrued >= MIN_DWELL_MS) {
        track('section_view', { section: id, durationMs: accrued });
        accrued = 0;
      } else if (discardRemainder) {
        accrued = 0;
      }
      if (inView && attention.current) startClock();
    };

    /** Only surrender the pointer if the next section has not already claimed it. */
    const releaseActiveSection = () => {
      if (activeSection.current === id) setActiveSection(null);
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const nowInView = entry.isIntersecting && entry.intersectionRatio >= IN_VIEW_RATIO;
        if (nowInView === inView) continue;
        inView = nowInView;
        if (inView) {
          setActiveSection(id);
          if (attention.current) startClock();
        } else {
          bank(true);
          releaseActiveSection();
        }
      }
    }, { threshold: [IN_VIEW_RATIO] });
    observer.observe(host);

    const unsubscribeAttention = subscribeAttention((attentive) => {
      if (attentive) {
        if (inView) startClock();
      } else {
        stopClock();
      }
    });

    // Harvest the in-progress segment at every flush, so a long uninterrupted
    // read shows up in the parent's numbers before the child leaves the page.
    // Out of view the accumulator is already empty, so this is a no-op there.
    const unregisterCollector = registerFlushCollector(() => bank(false));

    return () => {
      observer.disconnect();
      unsubscribeAttention();
      unregisterCollector();
      // Unmount is an exit: same rules, including the sub-second discard.
      inView = false;
      bank(true);
      releaseActiveSection();
    };
  }, [
    enabled,
    id,
    track,
    attention,
    subscribeAttention,
    registerFlushCollector,
    setActiveSection,
    activeSection,
  ]);

  return (
    <div ref={hostRef} className={className}>
      {children}
    </div>
  );
}
