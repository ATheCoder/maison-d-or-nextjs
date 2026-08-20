'use client';
/**
 * DGModal — Daily Gold's content modal: the house `Overlay` plus the one thing
 * that is genuinely Daily Gold's, a content-dwell clock.
 *
 * The shell used to live here — scrim, panel, close button, Escape, focus
 * trap, focus restore, scroll lock — and it was the app's only `aria-modal`
 * implementation, which is exactly why it moved to `components/ds/Overlay`.
 * Nothing about the modal's look or behaviour changed in the move, and no
 * call site did either: this file keeps the same name, the same props and the
 * same semantics (mount is the open, unmount is the close).
 *
 * Usage:
 *   {open && (
 *     <DGModal label="Good news story" onClose={...}>
 *       ...content (first child may be a hero image)...
 *     </DGModal>
 *   )}
 *
 * Reach for `Overlay` directly when a dialog has nothing to measure — the
 * grown-up rooms, the front door. Reach for this one when a *child* is being
 * shown a piece of content and the observatory should know how long they
 * stayed with it.
 */
import { useEffect, useLayoutEffect } from 'react';
import Overlay from '@/components/ds/Overlay';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';

/**
 * The dwell effect must be a layout effect: when the whole subtree is deleted
 * (route change, reader switch) React runs layout cleanups before any passive
 * cleanup, and the provider's final flush is a passive cleanup — a close
 * emitted from a passive cleanup here would land in the buffer after that
 * flush and never be sent. Matched to useEffect on the server, where neither
 * fires and useLayoutEffect would only warn. Same pattern as StorybookView.
 */
const useDwellEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * @param {{
 *   onClose: () => void,
 *   label: string,
 *   maxWidth?: number,
 *   tracking?: {
 *     contentType: import('@/lib/analytics-events').AnalyticsContentType,
 *     contentId: string,
 *     label?: string | null,
 *     section?: import('@/lib/analytics-events').AnalyticsSection,
 *   } | null,
 *   children: import('react').ReactNode,
 * }} props
 * `tracking` is opt-in: without it this is exactly the modal it was before, and
 * the modals on /passport and /treasury — which render with no provider at all
 * — keep costing nothing.
 *
 * `contentType` and `section` are the analytics unions, not bare strings: this
 * file carried a `@ts-nocheck` marker while the shell lived here, and loose
 * JSDoc was four of the errors it was hiding. Naming the unions is what let
 * the marker go.
 */
export default function DGModal({ onClose, label, maxWidth = 680, tracking = null, children }) {
  const { enabled, track, attention, subscribeAttention, registerFlushCollector } = useInstrumentation();

  // Destructured out of the object so the effect below depends on values, not
  // on the fresh literal every caller rebuilds each render.
  const trackedType = tracking?.contentType ?? null;
  const trackedId = tracking?.contentId ?? null;
  const trackedLabel = tracking?.label ?? null;
  const trackedSection = tracking?.section ?? null;

  /**
   * Content dwell. It lived alongside the focus/escape effect before and was
   * deliberately kept apart from it: that one must re-run whenever `onClose`
   * changes identity, and restarting the clock — or worse, re-emitting the
   * open — every time a parent re-renders would make the numbers fiction.
   * That separation is now structural: the focus effect moved into Overlay
   * and this one cannot be entangled with it again by accident.
   *
   * The clock is visibility-paused (§4): time spent with the tab hidden or the
   * window blurred is not time spent reading. Exactly one `content_close` is
   * emitted, at unmount, because the parent roll-up counts those rows as opens.
   */
  useDwellEffect(() => {
    if (!enabled || !trackedType || !trackedId) return;

    track('content_open', {
      contentType: trackedType,
      contentId: trackedId,
      label: trackedLabel,
      section: trackedSection,
    });

    let since = attention.current ? Date.now() : null;
    let accrued = 0;
    const startClock = () => { if (since === null) since = Date.now(); };
    const stopClock = () => {
      if (since === null) return;
      accrued += Date.now() - since;
      since = null;
    };

    const unsubscribeAttention = subscribeAttention((attentive) => {
      if (attentive) startClock(); else stopClock();
    });

    // Bank the running segment at each flush so the accumulator is always
    // current. It emits nothing: the close is one event by contract, so a long
    // read reaches the server when the child closes the modal, not before.
    // Only restarted while the child is actually there — hiding the tab flushes,
    // and a clock restarted here would run on through the time away.
    const unregisterCollector = registerFlushCollector(() => {
      stopClock();
      if (attention.current) startClock();
    });

    return () => {
      unsubscribeAttention();
      unregisterCollector();
      stopClock();
      track('content_close', {
        contentType: trackedType,
        contentId: trackedId,
        label: trackedLabel,
        section: trackedSection,
        durationMs: accrued,
      });
    };
  }, [
    enabled,
    trackedType,
    trackedId,
    trackedLabel,
    trackedSection,
    track,
    attention,
    subscribeAttention,
    registerFlushCollector,
  ]);

  return (
    <Overlay onClose={onClose} label={label} maxWidth={maxWidth}>
      {children}
    </Overlay>
  );
}
