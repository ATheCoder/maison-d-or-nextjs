'use client';
import { useRouter } from 'next/navigation';

const C = {
  gold: '#C8A96B',
  goldBorder: 'rgba(200,169,107,0.25)',
  goldBg: 'rgba(200,169,107,0.08)',
  parchment: '#F5F0E7',
  linen: '#EDE3D0',
  mocha: '#4A3B2A',
  clay: '#8B7355',
  sage: '#7C8770',
};

export default function DGForParents({ child, edition, timeSpent, topicsExplored }) {
  const router = useRouter();

  const dest = edition?.destination?.name || 'World Journey';
  const topics = topicsExplored || ['Geography', 'History', 'Good News'];
  const time = timeSpent || 0;

  return (
    <section style={{
      padding: '5rem clamp(1.5rem, 5vw, 4rem)',
      background: 'transparent',
      borderTop: `1px solid ${C.goldBorder}`,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: '3rem',
          alignItems: 'center',
        }}>
          {/* Left: description */}
          <div>
            <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: C.sage, margin: '0 0 0.5rem' }}>
              Private · Family intelligence
            </p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: C.mocha, margin: '0 0 1rem', lineHeight: 1.2 }}>
              For Parents
            </h2>
            <p style={{ fontFamily: 'Lato, sans-serif', fontWeight: 300, fontSize: '0.95rem', color: C.clay, margin: '0 0 2.5rem', lineHeight: 1.8 }}>
              See your child's world through curiosity, not comparison.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
              {[
                { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>, label: 'Exploration Summary', desc: 'What they discovered today' },
                { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, label: 'Curiosity Themes', desc: 'Topics that sparked interest' },
                { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>, label: 'Growth Insights', desc: 'Patterns over time' },
                { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label: 'Family Conversation Starters', desc: 'Questions to ask at dinner' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: C.goldBg,
                    border: `1px solid ${C.goldBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.svg}
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.82rem', fontWeight: 400, color: C.mocha, margin: 0 }}>
                      {item.label}
                    </p>
                    <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.72rem', fontWeight: 300, color: C.clay, margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push('/parent-observatory')}
              style={{
                padding: '12px 32px',
                background: 'transparent',
                border: `1px solid ${C.gold}`,
                borderRadius: 30,
                fontFamily: 'Lato, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: C.gold,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.goldBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Open Parent View
            </button>
          </div>

          {/* Right: today's snapshot card */}
          <div style={{
            background: C.linen,
            borderRadius: 20,
            border: `1px solid ${C.goldBorder}`,
            padding: '2rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.gold, margin: 0 }}>
                Today's Exploration
              </p>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            </div>

            {/* Destination highlight */}
            <div style={{
              background: C.goldBg,
              border: `1px solid ${C.goldBorder}`,
              borderRadius: 12,
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}>
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 600, color: C.mocha, margin: '0 0 0.25rem' }}>
                {dest}
              </p>
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.72rem', color: C.clay, margin: 0 }}>
                Today's destination
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '0.85rem 1rem', border: `1px solid ${C.goldBorder}` }}>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: C.gold, margin: '0 0 0.2rem', fontWeight: 300 }}>
                  {time > 0 ? `${time} min` : '--'}
                </p>
                <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', color: C.clay, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Time exploring
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '0.85rem 1rem', border: `1px solid ${C.goldBorder}` }}>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: C.gold, margin: '0 0 0.2rem', fontWeight: 300 }}>
                  {topics.length}
                </p>
                <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', color: C.clay, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Topics explored
                </p>
              </div>
            </div>

            {/* Topics */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {topics.map(t => (
                <span key={t} style={{
                  padding: '4px 14px',
                  background: C.goldBg,
                  border: `1px solid ${C.goldBorder}`,
                  borderRadius: 20,
                  fontFamily: 'Lato, sans-serif',
                  fontSize: '0.65rem',
                  color: C.clay,
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}