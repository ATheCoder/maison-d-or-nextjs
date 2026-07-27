import MaisonHeader from '@/components/maison/MaisonHeader';

// The sticky top bar mounted in the root layout. It takes no props — the nav
// set is fixed in the component — so the story is the bar itself, shown over
// a scrap of page so the wordmark/nav/actions balance reads correctly.

export function TopBar() {
  return (
    <div style={{ background: 'var(--ivory)', minHeight: 220 }}>
      <MaisonHeader />
      <div style={{ padding: '3rem 6vw', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.25rem', margin: 0 }}>The Living Almanac</h1>
        <p style={{ color: 'var(--taupe)' }}>What the world did on this day.</p>
      </div>
    </div>
  );
}
