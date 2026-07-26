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
 */
import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';

export default function DGModal({ onClose, label, maxWidth = 680, children }) {
  const { theme } = useTheme();
  const panelRef = useRef(null);

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
        background: 'rgba(24,18,10,0.6)',
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
          background: theme.bgCard,
          borderRadius: theme.radius,
          border: `1px solid ${theme.accentGold}30`,
          boxShadow: theme.shadowDeep,
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
              border: `1px solid ${theme.accentGold}40`,
              background: theme.bgOverlay,
              color: theme.textBody,
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
