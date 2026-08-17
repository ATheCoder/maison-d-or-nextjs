// @ts-nocheck — untyped .jsx from before checkJs was on; 9 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * DGModal — the one modal shell for Daily Gold overlays.
 *
 * Replaces the copy-pasted modal scaffolding in DGGoodNews, DGGreatestMoments
 * and DGDestination with a single accessible implementation: dialog semantics,
 * Escape to close, focus trap + focus restore, body scroll lock, labelled
 * close button, and a responsive panel (no fixed pixel heights — content
 * scrolls within min(90vh) and the backdrop padding collapses on phones).
 *
 * Usage:
 *   {open && (
 *     <DGModal label="Good news story" onClose={...}>
 *       ...content (first child may be a hero image)...
 *     </DGModal>
 *   )}
 *
 * Callers render it conditionally, so mount is the open and unmount is the
 * close — which is what makes the optional `tracking` prop below a complete
 * account of how long the child had the content in front of them.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
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
 *   tracking?: { contentType: string, contentId: string, label?: string | null, section?: string } | null,
 *   children: import('react').ReactNode,
 * }} props
 * `tracking` is opt-in: without it this is exactly the modal it was before, and
 * the modals on /passport and /treasury — which render with no provider at all
 * — keep costing nothing.
 */
export default function DGModal({ onClose, label, maxWidth = 680, tracking = null, children }) {
  const { enabled, track, attention, subscribeAttention, registerFlushCollector } = useInstrumentation();
  const panelRef = useRef(null);

  // Destructured out of the object so the effect below depends on values, not
  // on the fresh literal every caller rebuilds each render.
  const trackedType = tracking?.contentType ?? null;
  const trackedId = tracking?.contentId ?? null;
  const trackedLabel = tracking?.label ?? null;
  const trackedSection = tracking?.section ?? null;

  /**
   * Content dwell, kept deliberately apart from the focus/escape effect below:
   * that one must re-run whenever `onClose` changes identity, and restarting
   * the clock — or worse, re-emitting the open — every time a parent
   * re-renders would make the numbers fiction.
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

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    panel?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const focusables = panel.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) { e.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'var(--surface-overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'grid', placeItems: 'center',
        padding: 'clamp(0.75rem, 3vw, 2rem)',
        animation: 'dgFadeIn 0.25s ease-out',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth,
          maxHeight: 'min(90vh, 56rem)',
          overflowY: 'auto',
          background: 'var(--surface-raised)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid color-mix(in srgb, var(--accent) 19%, transparent)',
          boxShadow: 'var(--shadow-modal)',
          outline: 'none',
        }}
      >
        {/* Zero-height sticky row so the close button rides above any content,
            including a full-bleed hero image, without affecting flow. */}
        <div style={{ position: 'sticky', top: 0, height: 0, zIndex: 5, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44, borderRadius: '50%',
              margin: '10px 10px 0 0',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
              background: 'var(--surface-overlay)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
