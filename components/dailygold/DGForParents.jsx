'use client';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import { SECTION_LABELS } from '@/lib/analytics-events';

/**
 * `exploration` is the server's roll-up of what this child actually did today
 * (app/analytics/actions.ts) — or null when there is no reader in session and
 * when the roll-up could not be read. There is no placeholder behind it: a card
 * showing "3 topics" to a parent whose child has not opened the paper today
 * would be a lie, so an absent roll-up shows "--" and no chips.
 */
export default function DGForParents({ edition, exploration = null }) {
  const router = useRouter();
  const { theme } = useTheme();

  const goldBorder = `${theme.accentGold}40`;
  const goldBg = `${theme.accentGold}14`;

  const dest = edition?.destination?.name || 'World Journey';
  // Chips carry the child's own words for each part of the paper, never the
  // internal section ids; an id with no display name (a vocabulary that grew
  // past this map) still shows rather than vanishing.
  const topics = (exploration?.sections ?? []).map((s) => SECTION_LABELS[s.section] ?? s.section);
  const time = exploration?.totalMinutes ?? 0;

  return (
    <section style={{
      padding: '5rem clamp(1.5rem, 5vw, 4rem)',
      background: 'transparent',
      borderTop: `1px solid ${goldBorder}`,
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
            <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 0.5rem' }}>
              Private · Family intelligence
            </p>
            <h2 style={{ fontFamily: theme.fontHeadline, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: theme.textBody, margin: '0 0 1rem', lineHeight: 1.2 }}>
              For Parents
            </h2>
            <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.95rem', color: theme.textMuted, margin: '0 0 2.5rem', lineHeight: 1.8 }}>
              See your child&rsquo;s world through curiosity, not comparison.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
              {[
                { svg: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accentGold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>, label: 'Exploration Summary', desc: 'What they discovered today' },
                { svg: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accentGold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, label: 'Curiosity Themes', desc: 'Topics that sparked interest' },
                { svg: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accentGold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>, label: 'Growth Insights', desc: 'Patterns over time' },
                { svg: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accentGold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label: 'Family Conversation Starters', desc: 'Questions to ask at dinner' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: goldBg,
                    border: `1px solid ${goldBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.svg}
                  </div>
                  <div>
                    <p style={{ fontFamily: theme.fontBody, fontSize: '0.82rem', fontWeight: 400, color: theme.textBody, margin: 0 }}>
                      {item.label}
                    </p>
                    <p style={{ fontFamily: theme.fontBody, fontSize: '0.72rem', fontWeight: 300, color: theme.textMuted, margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push('/parent-observatory')}
              style={{
                minHeight: 44,
                padding: '12px 32px',
                background: 'transparent',
                border: `1px solid ${theme.accentGold}`,
                borderRadius: 30,
                fontFamily: theme.fontBody,
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: theme.accentGold,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = goldBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Open Parent View
            </button>
          </div>

          {/* Right: today's snapshot card */}
          <div style={{
            background: theme.bgSoft,
            borderRadius: theme.radius,
            border: `1px solid ${goldBorder}`,
            padding: '2rem',
            boxShadow: theme.shadowSoft,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.accentGold, margin: 0 }}>
                Today&rsquo;s Exploration
              </p>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accentGold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            </div>

            {/* Destination highlight */}
            <div style={{
              background: goldBg,
              border: `1px solid ${goldBorder}`,
              borderRadius: theme.radiusSmall,
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}>
              <p style={{ fontFamily: theme.fontHeadline, fontSize: '1.2rem', fontWeight: 600, color: theme.textBody, margin: '0 0 0.25rem' }}>
                {dest}
              </p>
              <p style={{ fontFamily: theme.fontBody, fontSize: '0.72rem', color: theme.textMuted, margin: 0 }}>
                Today&rsquo;s destination
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: theme.bgCard, borderRadius: theme.radiusSmall, padding: '0.85rem 1rem', border: `1px solid ${goldBorder}` }}>
                <p style={{ fontFamily: theme.fontHeadline, fontSize: '1.4rem', color: theme.accentGold, margin: '0 0 0.2rem', fontWeight: 300 }}>
                  {time > 0
                    ? `${time} min`
                    : <span role="img" aria-label="Not yet explored">--</span>}
                </p>
                <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', color: theme.textMuted, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Time exploring
                </p>
              </div>
              <div style={{ background: theme.bgCard, borderRadius: theme.radiusSmall, padding: '0.85rem 1rem', border: `1px solid ${goldBorder}` }}>
                <p style={{ fontFamily: theme.fontHeadline, fontSize: '1.4rem', color: theme.accentGold, margin: '0 0 0.2rem', fontWeight: 300 }}>
                  {topics.length}
                </p>
                <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', color: theme.textMuted, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Topics explored
                </p>
              </div>
            </div>

            {/* Topics */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {topics.map(t => (
                <span key={t} style={{
                  padding: '4px 14px',
                  background: goldBg,
                  border: `1px solid ${goldBorder}`,
                  borderRadius: 20,
                  fontFamily: theme.fontBody,
                  fontSize: '0.7rem',
                  color: theme.textMuted,
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
