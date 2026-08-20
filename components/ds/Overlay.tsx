'use client';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import Button from './Button';

/**
 * Overlay — the house dialog shell: scrim, panel, close button, and the four
 * behaviours a modal is not a modal without (Escape to close, focus trap,
 * focus restore, body scroll lock).
 *
 * This is a PROMOTION, not a new primitive. The markup and every effect below
 * come from `components/dailygold/DGModal`, which was already the only
 * `aria-modal` implementation in the app — serving the paper's three content
 * modals, the Treasury item modal, the flag collection and the signup invite.
 * What moved here is the shell; what stayed in DGModal is its content-dwell
 * instrumentation, which is a Daily Gold concern and has no business in a
 * primitive. DGModal now renders this, so all of its call sites are unchanged.
 *
 * NOT the shell for a menu. `ChildSwitcherOverlay` is `role="menu"` — an
 * anchored dropdown that happens to have the word overlay in its name — and
 * it keeps its own positioning. The distinction is real: a dialog takes the
 * whole screen and traps focus, a menu hangs off the control that opened it
 * and returns focus on the first Escape. Do not merge them.
 *
 * Mount IS the open and unmount IS the close: callers render it conditionally
 * (`{open && <Overlay …>}`) rather than passing an `open` prop. That is what
 * lets DGModal's dwell clock be a complete account of how long the content was
 * in front of the reader, and it is why there is no exit animation — a panel
 * that animates out is a panel still on screen after the close.
 */
export default function Overlay({
  onClose,
  label,
  maxWidth = 680,
  children,
}: {
  onClose: () => void;
  /** Names the dialog for screen readers — `aria-label` on the panel. */
  label: string;
  /** The panel's max width in px. The height is always min(90vh, 56rem). */
  maxWidth?: number;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    panel?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Stopped so a dialog opened from inside another closes only itself.
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const focusables = panel.querySelectorAll<HTMLElement>(
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
    // Capture phase: the trap has to see Tab before anything inside the panel
    // can handle and stop it.
    document.addEventListener('keydown', onKeyDown, true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
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
        animation: 'ds-fade-in 0.25s ease-out',
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
          {/* `bare` rather than a raw <button>: the coats are all wrong for a
              44px round scrim button, but the focus ring is not — this used
              to be the one control in the dialog you could tab to and not
              see. */}
          <Button
            variant="bare"
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
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
