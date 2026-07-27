import DGValuesStrip from '@/components/dailygold/DGValuesStrip';

// A fixed band of the Maison's four values. No props — the words are the
// component. Shown on the page ground it actually sits on.

export function Values() {
  return (
    <div style={{ background: 'var(--ivory)', padding: '2rem 0' }}>
      <DGValuesStrip />
    </div>
  );
}
