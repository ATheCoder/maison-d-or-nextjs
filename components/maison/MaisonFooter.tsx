import Link from 'next/link';
import MMonogram from './MMonogram';
import MaisonBrandName from './MaisonBrandName';
import CopyrightYear from './CopyrightYear';

// Routes that exist. The legacy footer also listed Journal, The Living
// Almanac, Recipes, Academy, Wellness and Golden Escapes — all 404s here, the
// same cut features the landing page stopped advertising. Add a row back when
// its route ships. The last three sit behind the proxy's auth check, so a
// signed-out visitor lands on /login?next=… rather than a dead end.
const NAV_LINKS: [string, string][] = [
  ['/', 'Home'],
  ['/daily-gold-edition', "Today's Edition"],
  ['/family', 'Family'],
  ['/treasury', 'The Treasury'],
  ['/passport', 'Passport'],
];

export default function MaisonFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--gold-light)', background: 'var(--ivory)', padding: '4rem 6vw 2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
        {/* Left */}
        <div>
          <MMonogram size={48} style={{ marginBottom: '1rem' }} />
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--brown)', marginBottom: '0.5rem' }}>
            <MaisonBrandName />
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '0.85rem', color: 'var(--taupe)', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.6 }}>
            Built for people who still want to feel something.
          </p>
        </div>
        {/* Centre */}
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: '1rem' }}>Navigation</p>
          {NAV_LINKS.map(([path, label]) => (
            <Link key={path} href={path} style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--taupe)', textDecoration: 'none', marginBottom: '0.4rem', fontWeight: 300, letterSpacing: '0.06em' }}>
              {label}
            </Link>
          ))}
        </div>
        {/* Right */}
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: '1rem' }}>Connect</p>
          {['Instagram', 'Pinterest', 'TikTok', 'Facebook'].map(s => (
            <p key={s} style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--taupe)', marginBottom: '0.4rem', fontWeight: 300, letterSpacing: '0.06em', cursor: 'pointer' }}>
              {s}
            </p>
          ))}
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--taupe)', fontWeight: 300, lineHeight: 1.8 }}>
          For people who want to feel more alive inside their own lives.
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--taupe)', marginTop: '0.75rem', opacity: 0.6, letterSpacing: '0.1em' }}>
          © <CopyrightYear /> <MaisonBrandName />. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
