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
 *
 * The legacy page also sold a lifestyle brand — Recipes, Rituals, Wellness,
 * Escapes, the Journal, the Almanac, an Academy — none of which ship here.
 * The sections that existed only to link at them (the coin rail, "Explore Our
 * Collections", the Recipes feature) are gone, and the remaining calls to
 * action point at the two destinations that are real: the Daily Gold Edition
 * and /family. Same rule as the app's own nav: no control that goes nowhere.
 * Restore a section when its route exists, not before.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import MMonogram from '@/components/maison/MMonogram';
import MaisonFooter from '@/components/maison/MaisonFooter';
import MaisonBrandName from '@/components/maison/MaisonBrandName';
import MaisonBlendedImage from '@/components/maison/MaisonBlendedImage';

const PRESS = ['VOGUE', 'BAZAAR', 'ELLE', 'Forbes', 'AD', 'The New York Times', 'Grazia', 'VANITY FAIR', 'The Times', 'HARPERS'];

export default function MdoHome() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  // Only a *completed* subscription is cleared on the way out; a half-typed
  // address is the visitor's work and Activity is right to keep it.
  const shouldReset = useRef(false);

  const subscribe = () => {
    if (!email) return;
    // TODO: POST to a real waitlist endpoint once one exists.
    setSubscribed(true);
    shouldReset.current = true;
  };

  /**
   * Clear the "Thank you for joining us" banner when the page leaves the
   * screen.
   *
   * Under Cache Components <Activity> hides a route instead of unmounting it,
   * so without this the form stays collapsed behind a thank-you from a visit
   * that may have been several pages ago — and there is no way back to the
   * field to subscribe a second address.
   */
  useLayoutEffect(() => () => {
    if (!shouldReset.current) return;
    shouldReset.current = false;
    setSubscribed(false);
    setEmail('');
  }, []);

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
            <Link href="/daily-gold-edition" className="mdo-btn" style={{ alignSelf: 'flex-start' }}>Enter the Maison</Link>
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

      {/* ── THREE EDITORIAL CARDS ── */}
      <section style={{ ...section, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(1.5rem, 3vw, 2.5rem)', maxWidth: '74rem', margin: '0 auto' }}>
          {/* Daily Inspiration */}
          <div className="mdo-card" style={{ borderTop: '1px solid var(--gold)', padding: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300 }}>Daily Inspiration</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.2rem, 2.5vw, 1.4rem)', color: 'var(--brown)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300, lineHeight: 1.3 }}>
              Today&apos;s golden thought
            </h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--taupe)', lineHeight: 1.75, fontWeight: 300, margin: 0 }}>
              A moment of reflection awaits.
            </p>
          </div>
          {/* Goldprint Academy */}
          <div className="mdo-card" style={{ borderTop: '1px solid var(--gold)', padding: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300 }}>Goldprint Academy</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.2rem, 2.5vw, 1.4rem)', color: 'var(--brown)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300, lineHeight: 1.3 }}>
              Empowering Minds. Inspiring Futures.
            </h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--taupe)', lineHeight: 1.75, fontWeight: 300, margin: 0 }}>
              Building Legacies. A bespoke education woven around your child&apos;s unique Goldprint.
            </p>
          </div>
          {/* Rituals */}
          <div className="mdo-card" style={{ borderTop: '1px solid var(--gold)', padding: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300 }}>Rituals</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.2rem, 2.5vw, 1.4rem)', color: 'var(--brown)', marginBottom: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: 300, lineHeight: 1.3 }}>
              Sacred Daily Practice
            </h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--taupe)', lineHeight: 1.75, fontWeight: 300, margin: 0 }}>
              Anchored moments that return you to yourself.
            </p>
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
          <Link href="/family" style={{
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

      {/* ── Maison Experience (dark) ── */}
      <section style={{ background: '#2C2416', color: 'var(--ivory)', padding: 'clamp(4rem, 8vw, 7rem) 6vw', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)', fontWeight: 300, letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: 'clamp(3rem, 6vw, 4rem)', lineHeight: 1.3, textTransform: 'none' }}>
          The Maison d&apos;Ore Experience
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'clamp(2.5rem, 5vw, 3.5rem)', maxWidth: '74rem', margin: '0 auto' }}>
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
