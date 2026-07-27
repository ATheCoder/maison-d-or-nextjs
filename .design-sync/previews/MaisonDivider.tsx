import MaisonDivider from '@/components/maison/MaisonDivider';

// A section rule is invisible on its own, so each story frames it the way the
// pages actually use it: between two blocks of editorial copy.

export function BetweenSections() {
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '1rem 0' }}>
      <p style={{ textAlign: 'center', color: 'var(--taupe)' }}>
        Every morning, a new page is set in type and sent to the family.
      </p>
      <MaisonDivider />
      <p style={{ textAlign: 'center', color: 'var(--taupe)' }}>
        The almanac remembers what the world did on this day.
      </p>
    </div>
  );
}

export function WithExtraSpace() {
  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', fontSize: '1.5rem' }}>The Living Almanac</h2>
      <MaisonDivider style={{ margin: '3rem 0' }} />
      <h2 style={{ textAlign: 'center', fontSize: '1.5rem' }}>Golden Escapes</h2>
    </div>
  );
}
