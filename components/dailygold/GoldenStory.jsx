'use client';
/**
 * GoldenStory — a children's illustrated biography storybook.
 * Ported from the Maison d'Oré "Golden Story" design template
 * (templates/golden-story/GoldenStory.dc.html). Renders a single
 * born-today person: hero, chapters, timeline, treasures and lessons.
 */
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const SHAPES = ['sh-circle', 'sh-diamond', 'sh-tri', 'sh-square'];

// Strip leading decoration (~, dashes, quotes) the source data sometimes carries.
function cleanQuote(str) {
  if (!str) return '';
  return String(str).replace(/^[\s~"'“”‚‘’\-–—]+/, '').replace(/[\s"'“”]+$/, '').trim();
}

function titleCase(str) {
  if (!str) return '';
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

function splitParas(narrative) {
  if (!narrative) return [];
  return String(narrative).split(/\n\n+/).map(p => p.trim()).filter(Boolean);
}

// Portrait fill: use the provided image, else generate one (mirrors DGBornToday).
function useHeroPortrait(story, editionId, index) {
  const [imgUrl, setImgUrl] = useState(story?.image_url || null);

  useEffect(() => {
    if (imgUrl || !story?.name) return;
    let alive = true;
    base44.functions.invoke('generatePortraitImage', {
      person_name: story.name,
      field: story.field || story.role || '',
      edition_id: editionId || null,
      person_index: index ?? 0,
    })
      .then(res => {
        const url = res?.data?.image_url || res?.image_url;
        if (alive && url) setImgUrl(url);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return imgUrl;
}

// Image frame — real image if available, else the parchment placeholder.
function Frame({ src, tag, className }) {
  if (src) {
    return (
      <div className={`ph ${className || ''}`} style={{ padding: 0 }}>
        <img src={src} alt={tag || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div className={`ph ${className || ''}`}>
      <span className="ph-tag">{tag}</span>
    </div>
  );
}

export default function GoldenStory({ story, editionId, index = 0 }) {
  const heroImg = useHeroPortrait(story, editionId, index);

  if (!story) return null;

  const name = story.name || 'A Golden Life';
  const firstName = name.split(' ')[0];
  const role = story.role || story.field || '';
  const storyTitle = story.story_title || name;
  const quote = cleanQuote(story.famous_quote);
  const childhood = story.story_childhood || '';
  const takeaway = cleanQuote(story.story_takeaway);
  const modern = story.modern_interpretation || '';
  const editionNo = String((index ?? 0) + 1).padStart(2, '0');

  const metaLine = [
    role,
    story.country,
    story.birth_date ? `b. ${story.birth_date}${story.death_year ? ` – ${story.death_year}` : ''}` : '',
  ].filter(Boolean).join('  ·  ');

  const chapters = (story.chapters || []).map((c, i) => ({
    number: String(c.number ?? i + 1),
    title: c.title || '',
    revClass: i % 2 === 1 ? 'rev' : '',
    paras: splitParas(c.narrative),
    image_url: c.image_url || null,
  }));

  const timeline = story.timeline || [];
  const treasures = (story.treasures || []).map((t, i) => ({
    name: t.name || '',
    description: t.description || '',
    index: String(i + 1),
    image_url: t.image_url || null,
  }));
  const lessons = (story.lessons || []).map((l, i) => ({
    icon: titleCase(l.icon_name),
    lesson: l.lesson || '',
    shape: SHAPES[i % SHAPES.length],
  }));

  return (
    <div className="gs-page">
      <style>{CSS}</style>

      <header className="gs-hero">
        <div className="gs-hero-wash" />
        <div className="gs-wrap gs-hero-inner">
          <div className="hero-text">
            <div className="hero-eyebrow"><i />
              <span>A Golden Story &#183; No. {editionNo}</span>
            </div>
            <h1 className="gs-title">{storyTitle}</h1>
            <p className="hero-name">{name}</p>
            {metaLine && <p className="hero-meta">{metaLine}</p>}
            {quote && <blockquote className="hero-quote">{quote}</blockquote>}
          </div>
          <div className="hero-portrait">
            <Frame src={heroImg} tag={`Portrait · ${name}`} />
            {role && <div className="hero-badge"><i />{role}</div>}
          </div>
        </div>
      </header>

      {childhood && (
        <section className="gs-intro">
          <div className="gs-wrap">
            <p className="lead">{childhood}</p>
            <div className="divider"><i /><b>&#10022;</b><i /></div>
          </div>
        </section>
      )}

      {chapters.length > 0 && (
        <section className="gs-chapters">
          <div className="gs-wrap">
            {chapters.map((ch, i) => (
              <article key={i} className={`chapter ${ch.revClass}`}>
                <div className="ch-media">
                  <div className="ch-numbadge">{ch.number}</div>
                  <Frame src={ch.image_url} tag={`Ch. ${ch.number} scene · ${ch.title}`} />
                </div>
                <div className="ch-text">
                  <p className="ch-num"><i />Chapter {ch.number}</p>
                  <h2 className="ch-title">{ch.title}</h2>
                  <div className="ch-body">
                    {ch.paras.map((para, j) => <p key={j}>{para}</p>)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {timeline.length > 0 && (
        <section className="gs-timeline">
          <div className="gs-wrap">
            <div className="gs-section-head">
              <div className="eyebrow"><i /><span>A Life in Moments</span><i /></div>
              <h2>The Journey</h2>
              <p className="sub">Follow the footsteps, year by year</p>
            </div>
            <div className="tl-track">
              {timeline.map((t, i) => (
                <div key={i} className="tl-item">
                  <Frame src={t.image_url} tag={t.year} />
                  <div className="tl-dot" />
                  <p className="tl-year">{t.year}</p>
                  <p className="tl-cap">{t.caption}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {treasures.length > 0 && (
        <section className="gs-treasures">
          <div className="gs-wrap">
            <div className="gs-section-head">
              <div className="eyebrow"><i /><span>Treasures Left Behind</span><i /></div>
              <h2>Gifts to the World</h2>
              <p className="sub">The wonders this life gave to all of us</p>
            </div>
            <div className="tr-grid">
              {treasures.map((tr, i) => (
                <article key={i} className="tr-card">
                  <Frame src={tr.image_url} tag={`Treasure · ${tr.name}`} />
                  <div className="tr-body">
                    <div className="tr-seal">{tr.index}</div>
                    <h3 className="tr-name">{tr.name}</h3>
                    <p className="tr-desc">{tr.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {lessons.length > 0 && (
        <section className="gs-lessons">
          <div className="gs-wrap">
            <div className="gs-section-head">
              <div className="eyebrow"><i /><span>What We Learn</span><i /></div>
              <h2>Little Golden Lessons</h2>
            </div>
            <div className="ls-grid">
              {lessons.map((l, i) => (
                <div key={i} className="ls-card">
                  <div className="ls-ic"><span className={l.shape} /></div>
                  <div>
                    {l.icon && <p className="ls-label">{l.icon}</p>}
                    <p className="ls-text">{l.lesson}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {modern && (
        <section className="gs-modern">
          <div className="gs-wrap">
            <div className="modern-card">
              <span className="kicker">If {firstName} were ten today&#8230;</span>
              <h3>A young explorer for our times</h3>
              <p>{modern}</p>
            </div>
          </div>
        </section>
      )}

      <footer className="gs-closing">
        <div className="gs-wrap">
          <div className="star">&#10022;</div>
          {takeaway && <p className="take">&#8220;{takeaway}&#8221;</p>}
          <div className="foot"><i /><span>A Golden Story &#183; {name}</span><i /></div>
        </div>
      </footer>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Lato:wght@300;400;700&display=swap');

.gs-page {
  --ivory: #F5F0E7; --card: #FBF8F1; --gold: #C8A96B; --gold-deep: #A8884A;
  --gold-light: #D4BF8A; --mocha: #4A3B2A; --clay: #8B7355; --sage: #7C8770;
  --sand: #EADCC2; --ink: #2C1F0E;
  --serif: "Playfair Display", Georgia, serif;
  --sans: Lato, "Source Sans 3", sans-serif;
  font-family: var(--sans);
  color: var(--mocha);
  background-color: var(--ivory);
  background-image:
    radial-gradient(ellipse at 12% 18%, rgba(139,115,80,0.06) 0%, transparent 52%),
    radial-gradient(ellipse at 88% 82%, rgba(100,75,45,0.04) 0%, transparent 45%);
  overflow-x: hidden;
  min-height: 100vh;
}
.gs-page * { box-sizing: border-box; }
.gs-wrap { max-width: 1080px; margin: 0 auto; padding: 0 clamp(1.25rem, 4vw, 3rem); }

.gs-page .ph {
  position: relative;
  background-color: var(--sand);
  background-image: repeating-linear-gradient(45deg, rgba(168,136,74,0.10) 0 11px, transparent 11px 22px);
  border: 1px solid rgba(201,169,110,0.30);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.gs-page .ph-tag {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.6rem; letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--gold-deep);
  background: rgba(251,248,241,0.88);
  padding: 5px 12px; border-radius: 30px;
  border: 1px solid rgba(201,169,110,0.35);
  text-align: center; max-width: 82%; line-height: 1.5;
}

.gs-hero { position: relative; padding: clamp(3rem,7vw,5.5rem) 0 clamp(2.5rem,5vw,4rem); }
.gs-hero-wash {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 55% 45% at 50% 22%, rgba(212,175,55,0.16) 0%, transparent 68%);
  pointer-events: none;
}
.gs-hero-inner { position: relative; z-index: 2; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: clamp(1.5rem,4vw,3.5rem); align-items: center; }
.hero-eyebrow { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 1.25rem; }
.hero-eyebrow i { height: 1px; width: 32px; background: var(--gold); display: block; }
.hero-eyebrow span { font-size: 0.6rem; letter-spacing: 0.30em; text-transform: uppercase; color: var(--sage); }
.gs-title {
  font-family: var(--serif); font-weight: 700; line-height: 1.02; margin: 0 0 1.25rem;
  font-size: clamp(2.4rem, 5.5vw, 4rem); letter-spacing: -0.015em;
  background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 48%, var(--gold-deep) 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.hero-name { font-family: var(--serif); font-size: 1.5rem; font-weight: 600; color: var(--ink); margin: 0 0 0.3rem; }
.hero-meta { font-family: var(--serif); font-style: italic; font-size: 0.95rem; color: var(--clay); margin: 0 0 1.75rem; }
.hero-quote {
  position: relative; padding-left: 1.1rem; margin: 0;
  border-left: 2px solid var(--gold-light);
  font-family: var(--serif); font-style: italic; font-size: 1.02rem; color: var(--mocha); line-height: 1.7;
}
.hero-portrait { position: relative; }
.hero-portrait .ph { aspect-ratio: 4 / 5; border-radius: 26px; box-shadow: 0 18px 44px rgba(90,60,20,0.18); }
.hero-badge {
  position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 1.35rem; background: var(--card);
  border: 1px solid rgba(201,169,110,0.4); border-radius: 30px;
  box-shadow: 0 6px 18px rgba(90,60,20,0.12);
  font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-deep); white-space: nowrap;
}
.hero-badge i { width: 7px; height: 7px; border-radius: 50%; background: var(--gold); display: block; }

.gs-intro { padding: clamp(2.5rem,5vw,4rem) 0; text-align: center; }
.gs-intro .lead { font-family: var(--serif); font-style: italic; font-size: clamp(1.05rem,2.1vw,1.4rem); color: var(--clay); line-height: 1.8; max-width: 760px; margin: 0 auto; }
.divider { display: flex; align-items: center; gap: 0.85rem; justify-content: center; margin: 2.5rem 0; }
.divider i { height: 1px; width: 60px; background: rgba(201,169,110,0.45); display: block; }
.divider b { color: var(--gold); font-size: 1.05rem; line-height: 1; }

.gs-chapters { padding: 1rem 0 3rem; }
.chapter { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1.5rem,4vw,3.25rem); align-items: center; margin-bottom: clamp(3.5rem,7vw,6rem); }
.chapter.rev .ch-media { order: 2; }
.ch-num { font-family: var(--serif); font-weight: 700; font-size: 0.72rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--gold); margin: 0 0 0.6rem; display: flex; align-items: center; gap: 0.7rem; }
.ch-num i { height: 1px; width: 30px; background: var(--gold-light); display: block; }
.ch-title { font-family: var(--serif); font-weight: 700; font-size: clamp(1.7rem,3.4vw,2.4rem); color: var(--ink); margin: 0 0 1.25rem; line-height: 1.12; letter-spacing: -0.01em; }
.ch-body p { font-weight: 300; font-size: 1rem; color: var(--mocha); line-height: 1.9; margin: 0 0 1rem; }
.ch-body p:first-child::first-letter {
  font-family: var(--serif); font-weight: 700; font-size: 3.2rem; float: left;
  line-height: 0.82; padding: 0.28rem 0.7rem 0 0; color: var(--gold);
}
.ch-media { position: relative; }
.ch-media .ph { aspect-ratio: 5 / 6; border-radius: 24px; box-shadow: 0 14px 38px rgba(90,60,20,0.16); }
.ch-media .ch-numbadge {
  position: absolute; top: 14px; left: 14px; z-index: 3;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(251,248,241,0.94); border: 1.5px solid rgba(201,169,110,0.6);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--serif); font-weight: 700; font-size: 1.1rem; color: var(--gold-deep);
  box-shadow: 0 4px 12px rgba(90,60,20,0.14);
}

.gs-section-head { text-align: center; margin-bottom: 3rem; }
.gs-section-head .eyebrow { display: flex; align-items: center; gap: 0.7rem; justify-content: center; margin-bottom: 0.75rem; }
.gs-section-head .eyebrow i { height: 1px; width: 34px; background: rgba(201,169,110,0.5); display: block; }
.gs-section-head .eyebrow span { font-size: 0.58rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--sage); }
.gs-section-head h2 { font-family: var(--serif); font-weight: 700; font-size: clamp(1.9rem,4vw,2.8rem); color: var(--gold); margin: 0; line-height: 1.12; }
.gs-section-head .sub { font-family: var(--serif); font-style: italic; font-size: 0.95rem; color: var(--clay); margin: 0.6rem 0 0; }

.gs-timeline { padding: clamp(3rem,6vw,5rem) 0; background: linear-gradient(to bottom, transparent, rgba(234,220,194,0.35), transparent); }
.tl-track { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; }
.tl-track::before { content: ""; position: absolute; top: 118px; left: 6%; right: 6%; height: 2px; background: repeating-linear-gradient(to right, var(--gold-light) 0 8px, transparent 8px 16px); }
.tl-item { display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; z-index: 2; }
.tl-item .ph { width: 100%; aspect-ratio: 1/1; border-radius: 18px; margin-bottom: 1rem; box-shadow: 0 8px 22px rgba(90,60,20,0.14); }
.tl-dot { width: 16px; height: 16px; border-radius: 50%; background: var(--card); border: 3px solid var(--gold); margin-bottom: 0.85rem; box-shadow: 0 2px 8px rgba(90,60,20,0.15); }
.tl-year { font-family: var(--serif); font-weight: 700; font-size: 1.15rem; color: var(--gold-deep); margin: 0 0 0.4rem; }
.tl-cap { font-weight: 300; font-size: 0.76rem; color: var(--clay); margin: 0; line-height: 1.55; max-width: 15ch; }

.gs-treasures { padding: clamp(3rem,6vw,5rem) 0; }
.tr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.tr-card { background: var(--card); border: 1px solid rgba(201,169,110,0.18); border-radius: 22px; overflow: hidden; box-shadow: 0 6px 22px rgba(90,60,20,0.09); display: flex; flex-direction: column; transition: transform .25s ease, box-shadow .25s ease; }
.tr-card:hover { transform: translateY(-5px); box-shadow: 0 16px 36px rgba(90,60,20,0.16); }
.tr-card .ph { aspect-ratio: 3/2; }
.tr-body { padding: 1.35rem 1.4rem 1.6rem; }
.tr-seal { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FAF7F2 0%, #EDE0CC 55%, #D8CCBA 100%); border: 2px solid rgba(201,169,110,0.6); color: var(--gold-deep); font-family: var(--serif); font-weight: 700; font-size: 0.8rem; margin-bottom: 0.85rem; box-shadow: inset 0 1px 0 rgba(255,255,255,0.7); }
.tr-name { font-family: var(--serif); font-weight: 600; font-size: 1.12rem; color: var(--gold); margin: 0 0 0.55rem; line-height: 1.25; }
.tr-desc { font-weight: 300; font-size: 0.86rem; color: var(--mocha); margin: 0; line-height: 1.7; }

.gs-lessons { padding: clamp(3rem,6vw,5rem) 0; background: linear-gradient(135deg, rgba(201,169,110,0.14) 0%, rgba(232,220,195,0.22) 50%, rgba(201,169,110,0.10) 100%); border-top: 1px solid rgba(201,169,110,0.22); border-bottom: 1px solid rgba(201,169,110,0.22); }
.ls-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; max-width: 880px; margin: 0 auto; }
.ls-card { display: flex; gap: 1.1rem; align-items: flex-start; background: rgba(251,248,241,0.72); border: 1px solid rgba(201,169,110,0.22); border-radius: 18px; padding: 1.4rem 1.5rem; }
.ls-ic { flex-shrink: 0; width: 46px; height: 46px; border-radius: 14px; background: rgba(201,169,110,0.16); border: 1px solid rgba(201,169,110,0.4); display: flex; align-items: center; justify-content: center; }
.ls-ic span { width: 18px; height: 18px; display: block; }
.ls-ic .sh-diamond { transform: rotate(45deg); border: 2px solid var(--gold-deep); }
.ls-ic .sh-circle { border-radius: 50%; border: 2px solid var(--gold-deep); }
.ls-ic .sh-square { border-radius: 4px; border: 2px solid var(--gold-deep); }
.ls-ic .sh-tri { width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 17px solid var(--gold-deep); }
.ls-label { font-size: 0.56rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold-deep); margin: 0 0 0.45rem; }
.ls-text { font-family: var(--serif); font-size: 1rem; color: var(--mocha); margin: 0; line-height: 1.55; }

.gs-modern { padding: clamp(3rem,6vw,5rem) 0; }
.modern-card { max-width: 820px; margin: 0 auto; background: var(--card); border: 1px solid rgba(201,169,110,0.2); border-radius: 26px; padding: clamp(2rem,4vw,3rem); box-shadow: 0 10px 30px rgba(90,60,20,0.1); text-align: center; }
.modern-card .kicker { display: inline-block; font-size: 0.58rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--sage); margin-bottom: 1rem; }
.modern-card h3 { font-family: var(--serif); font-weight: 700; font-size: clamp(1.4rem,3vw,2rem); color: var(--gold); margin: 0 0 1.25rem; line-height: 1.2; }
.modern-card p { font-weight: 300; font-size: 1rem; color: var(--mocha); line-height: 1.85; margin: 0; }

.gs-closing { padding: clamp(3.5rem,7vw,6rem) 0; text-align: center; }
.gs-closing .star { color: var(--gold); font-size: 1.4rem; margin-bottom: 1.25rem; }
.gs-closing .take { font-family: var(--serif); font-style: italic; font-weight: 600; font-size: clamp(1.5rem,3.6vw,2.5rem); color: var(--gold); line-height: 1.4; max-width: 720px; margin: 0 auto 2rem; }
.gs-closing .foot { display: flex; align-items: center; gap: 1rem; justify-content: center; }
.gs-closing .foot i { height: 1px; width: 60px; background: rgba(201,169,110,0.35); display: block; }
.gs-closing .foot span { font-family: var(--serif); font-size: 0.85rem; color: rgba(139,115,85,0.7); letter-spacing: 0.08em; }

@media (max-width: 820px) {
  .gs-hero-inner { grid-template-columns: 1fr; }
  .hero-portrait { max-width: 360px; margin: 0 auto; }
  .chapter, .chapter.rev { grid-template-columns: 1fr; }
  .chapter.rev .ch-media { order: 0; }
  .tr-grid { grid-template-columns: 1fr 1fr; }
  .tl-track { grid-template-columns: repeat(2, 1fr); gap: 2rem; }
  .tl-track::before { display: none; }
  .ls-grid { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .tr-grid { grid-template-columns: 1fr; }
  .tl-track { grid-template-columns: 1fr; }
}
`;
