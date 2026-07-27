import MMonogram from '@/components/maison/MMonogram';

// The gold M seal. `size` is the only variant axis.

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1rem' }}>
      {[32, 48, 60, 96].map((size) => (
        <div key={size} style={{ textAlign: 'center' }}>
          <MMonogram size={size} />
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--taupe)', marginTop: 8 }}>
            {size}px
          </div>
        </div>
      ))}
    </div>
  );
}

export function OnLinen() {
  return (
    <div
      style={{
        background: 'var(--linen)',
        padding: '3rem',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <MMonogram size={72} />
    </div>
  );
}
