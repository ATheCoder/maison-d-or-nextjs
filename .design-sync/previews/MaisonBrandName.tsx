import MaisonBrandName from '@/components/maison/MaisonBrandName';

// The protected wordmark. Casing and spelling are fixed by the component —
// never wrap it in text-transform, which would break the canonical form.

export function Wordmark() {
  return (
    <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-serif)', padding: '1.5rem' }}>
      <MaisonBrandName />
    </div>
  );
}

export function InAHeading() {
  return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', margin: 0 }}>
        <MaisonBrandName />
      </h1>
      <p style={{ letterSpacing: '0.3em', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--taupe)' }}>
        For people who still want to feel something
      </p>
    </div>
  );
}

export function InlineInCopy() {
  return (
    <p style={{ maxWidth: 520, padding: '1.5rem', color: 'var(--taupe)' }}>
      Every morning <MaisonBrandName /> sets a new page for the family — an almanac of the day, a
      story worth keeping, and somewhere new to wonder about.
    </p>
  );
}
