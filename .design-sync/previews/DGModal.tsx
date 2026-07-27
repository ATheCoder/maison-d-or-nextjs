import DGModal from '@/components/dailygold/DGModal';

// A focus-trapping overlay panel. It renders open by definition — there is no
// closed state to show — so the card is set to cardMode "single" in the
// config, with a viewport tall enough for the panel to sit inside the card.

// DGModal is `position: fixed; inset: 0`, so on its own it anchors to the page
// rather than the card and its top gets clipped. A transformed ancestor becomes
// the containing block for fixed descendants, which pins the whole overlay —
// backdrop included — inside this box. Presentation-only; the component is
// rendered exactly as shipped.
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', height: 460, transform: 'translateZ(0)', overflow: 'hidden' }}>
      {children}
    </div>
  );
}

export function ReadingPanel() {
  return (
    <Stage>
      <DGModal label="A forgotten dish grows something extraordinary" onClose={() => {}}>
        <div style={{ padding: '2.5rem' }}>
          <div
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--taupe)',
            }}
          >
            London, England · 1928
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--gold)', margin: '0.75rem 0 1rem' }}>
            A forgotten dish grows something extraordinary
          </h2>
          <p style={{ color: 'var(--taupe)', margin: 0 }}>
            A scientist came back from holiday to a messy laboratory and noticed that a stray mould
            had cleared a ring in a dish of bacteria. Most people would have washed it up. He looked
            closer, and the ring became penicillin.
          </p>
        </div>
      </DGModal>
    </Stage>
  );
}
