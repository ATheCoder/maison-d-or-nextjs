'use client';

/**
 * PAGE 1 — HOME  /
 * Full editorial homepage, migrated from the legacy base44 project
 * (base44-eject/src/pages/MdoHome.jsx).
 *
 * The legacy page hydrated several sections from a base44 backend
 * (DailyGoldDrop, BlogPost, OracleMessage, WaitlistSignup). That
 * backend does not exist in this project, so the data-driven sections
 * fall back to their static editorial copy. The newsletter form works
 * locally; wire `subscribe` to a real endpoint when one exists.
 */
import { useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import MMonogram from '@/components/maison/MMonogram';
import MaisonFooter from '@/components/maison/MaisonFooter';
import MaisonBrandName from '@/components/maison/MaisonBrandName';
import MaisonBlendedImage from '@/components/maison/MaisonBlendedImage';

const NAV_COINS = [
  { label: 'Family', path: '/family-tracker', emoji: '◆' },
  { label: 'Journal', path: '/journal', emoji: '✦' },
  { label: 'Recipes', path: '/recipes', emoji: '✿' },
  { label: 'Academy', path: '/academy', emoji: '◎' },
  { label: 'Wellness', path: '/wellness', emoji: '❤' },
  { label: 'Rituals', path: '/rituals', emoji: '☽' },
  { label: 'Escapes', path: '/escapes', emoji: '✈' },
  { label: 'Almanac', path: '/almanac', emoji: '✦' },
];

const PRESS = ['VOGUE', 'BAZAAR', 'ELLE', 'Forbes', 'AD', 'The New York Times', 'Grazia', 'VANITY FAIR', 'The Times', 'HARPERS'];

export default function MdoHome() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = () => {
    if (!email) return;
    // TODO: POST to a real waitlist endpoint once one exists.
    setSubscribed(true);
  };

  const section: CSSProperties = { padding: 'clamp(4rem, 10vw, 8rem) 6vw' };
  const centred: CSSProperties = { textAlign: 'center' };
  const h2style: CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 300, letterSpacing: '0.15em', fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', color: 'var(--brown)', textTransform: 'uppercase', lineHeight: 1.2 };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)', color: 'var(--brown)' }}>
      {/* ── HERO ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', background: 'var(--ivory)', gap: '2rem' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(3rem, 8vw, 7rem) clamp(2rem, 6vw, 6rem)', gap: 'clamp(2rem, 4vw, 3rem)' }}>
          <p style={{ fontFamily: 'var(--font-script)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'var(--gold)', lineHeight: 1, fontWeight: 300, letterSpacing: '0.05em' }}>
            Welcome to
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.2rem, 5vw, 4.2rem)', fontWeight: 300, letterSpacing: '0.08em', margin: 0, lineHeight: 1.15, color: 'var(--brown)' }}>
            <MaisonBrandName />
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', color: 'var(--taupe)', fontWeight: 300, maxWidth: '28rem', lineHeight: 1.9 }}>
            A living world for people who want to feel more alive inside their own lives.
          </p>
          <div style={{ marginTop: 'clamp(1rem, 3vw, 2rem)' }}>
            <Link href="/journal" className="mdo-btn" style={{ alignSelf: 'flex-start' }}>Enter the Maison</Link>
          </div>
          <MMonogram size={60} style={{ marginTop: 'clamp(1.5rem, 4vw, 3rem)' }} />
        </div>
        {/* Right — Hero image, blended into page */}
        <MaisonBlendedImage
          src="https://media.base44.com/images/public/69dba1f66d3b6e4e9e515e5c/3bf92bc7b_generated_image.png"
          alt="Maison d'Ore — Mediterranean olive branches and quiet elegance"
          objectPos="center top"
          fadeLeft={true}
          fadeRight={false}
          fadeTop={true}
          fadeBottom={true}
          fadeStrength={38}
          animate={true}
          style={{ minHeight: '100vh' }}
        />
      </section>

      {/* ── COIN NAVIGATION ── */}
      <section style={{ padding: 'clamp(2.5rem, 5vw, 4rem) 6vw', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 'clamp(1.5rem, 3vw, 2.5rem)', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {NAV_COINS.map((coin, i) => (
            <Link key={i} href={coin.path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                border: '1px solid var(--gold)', background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', color: 'var(--gold)',
                boxShadow: '0 2px 12px rgba(201,169,110,0.15)',
              }}>{coin.emoji}</div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--taupe)', fontWeight: 400 }}>
                {coin.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── EXPLORE COLLECTIONS ── */}
      <section style={{ ...section, ...centred, background: 'var(--surface)' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 'clamp(0.8rem, 2vw, 1.5rem)', fontWeight: 300 }}>Our World</p>
        <h2 style={h2style}>EXPLORE OUR COLLECTIONS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'clamp(1.5rem, 3vw, 2.5rem)', maxWidth: '58rem', margin: 'clamp(2.5rem, 5vw, 4rem) auto' }}>
          {[
            { label: 'Journal', emoji: '✦', path: '/journal' },
            { label: 'Recipes', emoji: '✿', path: '/recipes' },
            { label: 'Rituals', emoji: '☽', path: '/rituals' },
            { label: 'Academy', emoji: '◎', path: '/academy' },
          ].map(item => (
            <Link key={item.label} href={item.path} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(0.8rem, 2vw, 1.2rem)' }}>
              <div style={{
                width: 'clamp(68px, 12vw, 80px)', height: 'clamp(68px, 12vw, 80px)', borderRadius: '50%', border: '1px solid var(--gold)',
                background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', color: 'var(--gold)', transition: 'all 0.3s',
              }}>{item.emoji}</div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.61rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--taupe)', fontWeight: 300 }}>{item.label}</span>
            </Link>
          ))}
        </div>
        <Link href="/journal" className="mdo-btn">DISCOVER MORE →</Link>
      </section>

      {/* ── THREE EDITORIAL CARDS ── */}
      <section style={{ ...section }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(1.5rem, 3vw, 2.5rem)', maxWidth: '74rem', margin: '0 auto' }}>
          {/* Daily Inspiration */}
          <div className="mdo-card" style={{ borderTop: '1px solid var(--gold)', padding: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300 }}>Daily Inspiration</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.2rem, 2.5vw, 1.4rem)', color: 'var(--brown)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300, lineHeight: 1.3 }}>
              Today&apos;s golden thought
            </h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--taupe)', lineHeight: 1.75, fontWeight: 300, marginBottom: 'clamp(1.2rem, 3vw, 1.8rem)' }}>
              A moment of reflection awaits.
            </p>
            <Link href="/journal" className="mdo-btn" style={{ fontSize: '0.61rem', padding: '8px 18px' }}>READ MORE →</Link>
          </div>
          {/* Goldprint Academy */}
          <div className="mdo-card" style={{ borderTop: '1px solid var(--gold)', padding: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300 }}>Goldprint Academy</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.2rem, 2.5vw, 1.4rem)', color: 'var(--brown)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300, lineHeight: 1.3 }}>
              Empowering Minds. Inspiring Futures.
            </h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--taupe)', lineHeight: 1.75, fontWeight: 300, marginBottom: 'clamp(1.2rem, 3vw, 1.8rem)' }}>
              Building Legacies. A bespoke education woven around your child&apos;s unique Goldprint.
            </p>
            <Link href="/academy" className="mdo-btn" style={{ fontSize: '0.61rem', padding: '8px 18px' }}>EXPLORE →</Link>
          </div>
          {/* Rituals */}
          <div className="mdo-card" style={{ borderTop: '1px solid var(--gold)', padding: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300 }}>Rituals</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.2rem, 2.5vw, 1.4rem)', color: 'var(--brown)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300, lineHeight: 1.3 }}>
              Sacred Daily Practice
            </h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--taupe)', lineHeight: 1.75, fontWeight: 300, marginBottom: 'clamp(1.2rem, 3vw, 1.8rem)' }}>
              Anchored moments that return you to yourself.
            </p>
            <Link href="/rituals" className="mdo-btn" style={{ fontSize: '0.61rem', padding: '8px 18px' }}>DISCOVER →</Link>
          </div>
        </div>
      </section>

      {/* ── YOUR FAMILY GOLDPRINT ── */}
      <section style={{ background: '#2C2416', padding: 'clamp(4rem, 8vw, 6rem) 6vw', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(3rem, 6vw, 5rem)', alignItems: 'center' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.58rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 'clamp(1rem, 2vw, 1.5rem)', fontWeight: 300 }}>Your Family</p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 300, letterSpacing: '0.08em', color: 'var(--ivory)', margin: 0, marginBottom: 'clamp(1.2rem, 3vw, 1.8rem)', lineHeight: 1.2 }}>
            Everything about your family lives here.
          </h2>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(0.9rem, 1.8vw, 1rem)', color: 'rgba(250,247,242,0.7)', lineHeight: 1.9, marginBottom: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 300, maxWidth: '34rem' }}>
            Profiles. Assessments. Learning paths. Ceremonies. Legacy. The Goldprint is not a feature. It is your family&apos;s living record.
          </p>
          <Link href="/family-tracker" style={{
            display: 'inline-block', textDecoration: 'none',
            padding: '13px 32px',
            border: '1px solid var(--gold)', color: 'var(--gold)',
            fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>
            Open Goldprint →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(1rem, 2vw, 1.5rem)' }}>
          {[
            { label: 'Family Members', sub: 'Profiles & roles' },
            { label: 'Assessments', sub: 'Know yourselves deeply' },
            { label: 'Goldprint Academy', sub: 'Learning & legacy' },
            { label: 'Connection & Growth', sub: 'Together, always' },
          ].map(item => (
            <div key={item.label} style={{
              padding: 'clamp(1rem, 2vw, 1.5rem)',
              border: '1px solid rgba(201,169,110,0.2)',
              borderRadius: 2,
              background: 'rgba(201,169,110,0.05)',
            }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(0.9rem, 1.5vw, 1rem)', color: 'var(--gold)', margin: '0 0 0.4rem', fontWeight: 300 }}>{item.label}</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.61rem', color: 'rgba(250,247,242,0.5)', margin: 0, fontWeight: 300, letterSpacing: '0.02em' }}>{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── RECIPES FEATURE ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '60vh', background: 'var(--linen)', gap: '2rem' }}>
        <MaisonBlendedImage
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80"
          alt="seasonal food on linen"
          fadeLeft={false}
          fadeRight={true}
          fadeTop={true}
          fadeBottom={true}
          fadeStrength={38}
          animate={true}
          style={{ minHeight: '60vh' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(3rem, 6vw, 5rem) clamp(2rem, 6vw, 6rem)', gap: 'clamp(1.2rem, 3vw, 2rem)' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 300 }}>The Kitchen</p>
          <h2 style={{ ...h2style, textTransform: 'uppercase' }}>RECIPES WITH HERITAGE</h2>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(0.95rem, 1.8vw, 1.05rem)', color: 'var(--taupe)', fontWeight: 300, lineHeight: 1.8 }}>
            Nourishing traditions, made for today.
          </p>
          <div style={{ marginTop: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <Link href="/recipes" className="mdo-btn">EXPLORE RECIPES →</Link>
          </div>
        </div>
      </section>

      {/* ── Maison Experience (dark) ── */}
      <section style={{ background: '#2C2416', color: 'var(--ivory)', padding: 'clamp(4rem, 8vw, 7rem) 6vw', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)', fontWeight: 300, letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: 'clamp(3rem, 6vw, 4rem)', lineHeight: 1.3, textTransform: 'none' }}>
          The Maison d&apos;Ore Experience
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'clamp(2.5rem, 5vw, 3.5rem)', maxWidth: '74rem', margin: '0 auto clamp(3rem, 6vw, 4rem)' }}>
          {[
            { title: 'Timeless Elegance', body: 'Rooted in heritage, expressed through beauty. Every detail chosen with intention.' },
            { title: 'Intentional Living', body: 'A slower, richer approach to the everyday. Rituals, seasons, and sacred rhythm.' },
            { title: 'Infinite Impact', body: 'Education and legacy woven together. What we build here lasts generations.' },
          ].map(col => (
            <div key={col.title}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.1rem, 2vw, 1.3rem)', color: 'var(--gold-light)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300, letterSpacing: '0.08em' }}>{col.title}</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'rgba(250,247,242,0.75)', lineHeight: 1.85, fontWeight: 300, letterSpacing: '0.01em' }}>{col.body}</p>
            </div>
          ))}
        </div>
        <Link href="/about" className="mdo-btn" style={{ borderColor: 'var(--gold)', color: 'var(--gold-light)' }}>LEARN MORE →</Link>
      </section>

      {/* ── OUR PILLARS ── */}
      <section style={{ ...section, ...centred }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 'clamp(1rem, 2vw, 1.5rem)', fontWeight: 300 }}>What we stand for</p>
        <h2 style={h2style}>OUR PILLARS</h2>
        <div style={{ display: 'flex', gap: 'clamp(2rem, 4vw, 3.5rem)', justifyContent: 'center', flexWrap: 'wrap', marginTop: 'clamp(2.5rem, 5vw, 4rem)' }}>
          {[
            { label: 'Heritage', emoji: '🌿' },
            { label: 'Elegance', emoji: '✦' },
            { label: 'Education', emoji: '◎' },
            { label: 'Empowerment', emoji: '🔥' },
            { label: 'Impact', emoji: '☀' },
          ].map(p => (
            <div key={p.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(0.8rem, 1.5vw, 1.2rem)' }}>
              <div style={{ width: 'clamp(70px, 12vw, 80px)', height: 'clamp(70px, 12vw, 80px)', borderRadius: '50%', border: '1px solid var(--gold)', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(1.5rem, 2.5vw, 1.8rem)' }}>
                {p.emoji}
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--taupe)', fontWeight: 300 }}>{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUOTE ── */}
      <section style={{ ...section, ...centred, background: 'var(--surface)' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', color: 'var(--gold)', lineHeight: 1.8, maxWidth: '50rem', margin: '0 auto', fontWeight: 300, letterSpacing: '0.02em' }}>
          &ldquo;The details are not the details. They make the design.&rdquo;
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--taupe)', marginTop: 'clamp(1.2rem, 2vw, 1.8rem)', letterSpacing: '0.12em', fontWeight: 300 }}>
          — Charles Eames
        </p>
      </section>

      {/* ── STAY CONNECTED ── */}
      <section style={{ ...section, ...centred, background: 'var(--linen)' }}>
        <h2 style={h2style}>STAY CONNECTED</h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--taupe)', marginTop: 'clamp(1rem, 2vw, 1.5rem)', marginBottom: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '0.06em', fontWeight: 300, lineHeight: 1.75 }}>
          Be the first to know about new collections, events and inspiration.
        </p>
        {subscribed ? (
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(1rem, 1.8vw, 1.1rem)', color: 'var(--gold)', lineHeight: 1.6 }}>Thank you for joining us.</p>
        ) : (
          <div style={{ display: 'flex', gap: '0', maxWidth: '450px', margin: '0 auto' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email address"
              className="mdo-input"
              style={{ borderRadius: 0, flex: 1, fontSize: 'clamp(0.85rem, 1.5vw, 0.95rem)' }}
            />
            <button onClick={subscribe} className="mdo-btn" style={{ borderLeft: 'none', borderRadius: 0, whiteSpace: 'nowrap', fontSize: 'clamp(0.58rem, 1vw, 0.68rem)' }}>
              SUBSCRIBE →
            </button>
          </div>
        )}
      </section>

      {/* ── PRESS ── */}
      <section style={{ padding: 'clamp(2.5rem, 5vw, 4rem) 6vw', textAlign: 'center', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.58rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 300 }}>AS SEEN IN</p>
        <div style={{ display: 'flex', gap: 'clamp(1.8rem, 3vw, 2.8rem)', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          {PRESS.map(name => (
            <span key={name} style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(0.8rem, 1.2vw, 0.85rem)', color: 'var(--taupe)', letterSpacing: '0.06em', opacity: 0.7, fontWeight: 300 }}>{name}</span>
          ))}
        </div>
      </section>

      <MaisonFooter />
    </div>
  );
}
