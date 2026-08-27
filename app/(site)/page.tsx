'use client';

/**
 * PAGE 1 — HOME  /
 *
 * The editorial front door, redrawn 2026-08-27 onto components/ds. Same
 * page, same words: every section, every heading and every line of copy that
 * was here before is still here, in the same order. What changed is that none
 * of it dresses itself any more.
 *
 * ── What this used to be ──────────────────────────────────────────────────
 *
 * A 265-line wall of inline `style={{ fontFamily: 'var(--font-serif)',
 * fontSize: 'clamp(…)', color: 'var(--brown)' }}`, spelled out once per
 * element, against the LEGACY token block at the top of globals.css — the
 * base44 palette (--ivory #FAF7F2, --gold #C9A96E, --brown, --taupe) that
 * predates the design system and cannot be re-scoped by anything. It was the
 * last front-facing room in the house still doing that: Daily Gold, the front
 * door and the admin desk were all migrated to the primitives, and the page a
 * visitor sees FIRST was the one still speaking the old language.
 *
 * So: no font stacks, no clamp() ladders and no colours in this file. Type is
 * the §2.2 tokens through Heading/Prose/Eyebrow, controls are Button and
 * Field, grounds are SectionSurface, and the horizontal measure is Container.
 * Everything a section needs to know about its own colour arrives from the
 * `data-surface` scope it sits in — which is why the espresso and navy bands
 * below hand their children no props at all.
 *
 * ── The rhythm ────────────────────────────────────────────────────────────
 *
 * Parchment, parchment, ESPRESSO, sand, parchment, NAVY, parchment. The page
 * breathes light → dark → light twice, and the two dark bands are the §3.2
 * cinematic interludes (grain up a step, vignette, gold-bright accent), not
 * a hex. The old page put its two dark sections back to back in the same
 * #2C2416 with no seam between them, which read as one long tunnel; they are
 * now the page's two punctuation marks instead, with the Goldprint's call to
 * action on the first and the Eames quote on the second.
 *
 * ── The pictures ──────────────────────────────────────────────────────────
 *
 * The hero used to be a single base44-hosted PNG on a domain this project
 * does not own. The five plates that replace it are generated from prompts
 * that live in the repo (scripts/generate-home-art.mjs) and are served from
 * public/site/. They feather into their ground by mask rather than by a
 * painted gradient — see MaisonPlate — so the same picture is correct on
 * parchment, on sand and on espresso.
 *
 * ── Still true from before ────────────────────────────────────────────────
 *
 * The legacy page hydrated several sections from a base44 backend
 * (DailyGoldDrop, BlogPost, OracleMessage, WaitlistSignup). That backend does
 * not exist in this project, so the data-driven sections fall back to their
 * static editorial copy. The newsletter form works locally; wire `subscribe`
 * to a real endpoint when one exists.
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
import Link from 'next/link';
import {
  Button,
  buttonClasses,
  Card,
  Container,
  Eyebrow,
  Field,
  Heading,
  Prose,
  Quote,
  Rule,
  SectionSurface,
} from '@/components/ds';
import MMonogram from '@/components/maison/MMonogram';
import MaisonFooter from '@/components/maison/MaisonFooter';
import MaisonBrandName from '@/components/maison/MaisonBrandName';
import MaisonPlate from '@/components/maison/MaisonPlate';

/* Copy first, markup second. Every string below is verbatim from the page
   this replaces — the redesign is a change of dress, not of editorial. */

const EDITORIAL = [
  {
    kicker: 'Daily Inspiration',
    title: 'Today’s golden thought',
    body: 'A moment of reflection awaits.',
  },
  {
    kicker: 'Goldprint Academy',
    title: 'Empowering Minds. Inspiring Futures.',
    body: 'Building Legacies. A bespoke education woven around your child’s unique Goldprint.',
  },
  {
    kicker: 'Rituals',
    title: 'Sacred Daily Practice',
    body: 'Anchored moments that return you to yourself.',
  },
];

const GOLDPRINT = [
  { label: 'Family Members', sub: 'Profiles & roles' },
  { label: 'Assessments', sub: 'Know yourselves deeply' },
  { label: 'Goldprint Academy', sub: 'Learning & legacy' },
  { label: 'Connection & Growth', sub: 'Together, always' },
];

/* The triptych. `plate` and `alt` are the only new fields on this page —
   the three columns were type-only before, and the pictures were written
   for these three headings (scripts/generate-home-art.mjs). */
const EXPERIENCE = [
  {
    title: 'Timeless Elegance',
    body: 'Rooted in heritage, expressed through beauty. Every detail chosen with intention.',
    plate: '/site/elegance.webp',
    alt: 'Hand-hemmed ivory linen with an antique gold thimble resting on it',
  },
  {
    title: 'Intentional Living',
    body: 'A slower, richer approach to the everyday. Rituals, seasons, and sacred rhythm.',
    plate: '/site/living.webp',
    alt: 'A newly lit beeswax candle beside a small bowl of sea salt and a sprig of rosemary',
  },
  {
    title: 'Infinite Impact',
    body: 'Education and legacy woven together. What we build here lasts generations.',
    plate: '/site/impact.webp',
    alt: 'A hand-bound notebook and a young olive seedling in a terracotta pot',
  },
];

/* The glyphs are the page's own — kept exactly as they were. Two of the five
   are colour emoji and will not take the gold ink the other three do; that is
   the content's shape, and swapping them for typographic ornaments would be
   an editorial change this redesign is not making. */
const PILLARS = [
  { label: 'Heritage', glyph: '🌿' },
  { label: 'Elegance', glyph: '✦' },
  { label: 'Education', glyph: '◎' },
  { label: 'Empowerment', glyph: '🔥' },
  { label: 'Impact', glyph: '☀' },
];

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

  return (
    <>
      <main className="bg-surface-page">
        {/* ── HERO + the three editorial cards ─────────────────────────────
            One parchment ground, one grain layer, no seam between them: the
            cards are the bottom of the hero, not a second room. */}
        <SectionSurface surface="light" padding="none">
          <div className="grid items-stretch lg:min-h-[92svh] lg:grid-cols-[1.02fr_1fr]">
            <div className="order-2 flex flex-col justify-center px-6 pt-14 pb-20 sm:px-10 lg:order-1 lg:py-24 xl:pl-[7vw]">
              <Eyebrow>Welcome to</Eyebrow>
              <Heading level={1} className="mt-7">
                <MaisonBrandName />
              </Heading>
              <Prose className="mt-7">
                A living world for people who want to feel more alive inside their own lives.
              </Prose>
              <div className="mt-10">
                <Link href="/daily-gold-edition" className={buttonClasses()}>
                  Enter the Maison
                </Link>
              </div>
              <div className="mt-14">
                <MMonogram size={56} />
              </div>
            </div>

            {/* The plate was composed for this box — empty lit wall in the top
                two thirds, the still life low and to the right — so it is
                cropped from the top on the narrow phone band and shown whole
                beside the headline from `lg` up. */}
            <div className="relative order-1 h-[46svh] lg:order-2 lg:h-auto">
              <MaisonPlate
                src="/site/hero.webp"
                alt="A sunlit corner of an old Mediterranean house — olive branches in a terracotta vessel on a walnut table, a linen curtain diffusing the afternoon"
                feather={['left', 'bottom', 'top']}
                position="center 55%"
                loading="eager"
                /* Absolute so the plate takes the row's height rather than
                   setting it: in flow, its 2:3 intrinsic ratio makes the hero
                   1200px tall on a wide screen and the `min-h` never applies. */
                className="absolute inset-0"
              />
            </div>
          </div>

          <Container width="wide" className="pb-20 lg:pb-28">
            <Rule />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {EDITORIAL.map((card) => (
                <Card
                  key={card.kicker}
                  tone="raised"
                  elevation="card"
                  padding="lg"
                  /* The gold top edge the old cards had, kept — but as the
                     accent token, so it is sage in a garden and gold-bright on
                     an interlude if this card is ever reused in one. */
                  className="border-t-2"
                  style={{ borderTopColor: 'var(--accent)' }}
                >
                  <Eyebrow rule={false}>{card.kicker}</Eyebrow>
                  <Heading level={3} className="mt-4">
                    {card.title}
                  </Heading>
                  <Prose variant="body-ui" measure={false} className="mt-4">
                    {card.body}
                  </Prose>
                </Card>
              ))}
            </div>
          </Container>
        </SectionSurface>

        {/* ── YOUR FAMILY GOLDPRINT — the first interlude ──────────────────
            The plate is the ground here rather than a picture in a column: it
            was written with its still life held to the left third and the rest
            falling into espresso shadow, which is the room the copy stands in. */}
        <SectionSurface surface="dark" padding="none" className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <MaisonPlate
              src="/site/goldprint.webp"
              alt=""
              position="left center"
              className="opacity-80"
            />
            {/* Two scrims, one per shape of the section. Narrow: the copy runs
                the full width, so the veil is flat and heavy. Wide: the copy
                sits in the right seven columns, so the veil ramps across and
                leaves the album lit. */}
            <div
              className="absolute inset-0 lg:hidden"
              style={{
                background:
                  'linear-gradient(to bottom, color-mix(in srgb, var(--surface-page) 45%, transparent) 0%, color-mix(in srgb, var(--surface-page) 88%, transparent) 45%, var(--surface-page) 85%)',
              }}
            />
            <div
              className="absolute inset-0 hidden lg:block"
              style={{
                background:
                  'linear-gradient(to right, transparent 0%, transparent 28%, color-mix(in srgb, var(--surface-page) 55%, transparent) 44%, color-mix(in srgb, var(--surface-page) 92%, transparent) 62%, var(--surface-page) 76%)',
              }}
            />
          </div>

          <Container width="wide" className="py-24 lg:py-32">
            <div className="lg:grid lg:grid-cols-12">
              <div className="lg:col-span-7 lg:col-start-6">
                <Eyebrow>Your Family</Eyebrow>
                <Heading level={2} className="mt-6">
                  Everything about your family lives here.
                </Heading>
                <Prose className="mt-6">
                  Profiles. Assessments. Learning paths. Ceremonies. Legacy. The Goldprint is not a
                  feature. It is your family&apos;s living record.
                </Prose>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {GOLDPRINT.map((item) => (
                    <Card key={item.label} tone="tint" bordered padding="md">
                      <Heading level={3} tone="none" className="text-accent">
                        {item.label}
                      </Heading>
                      <Prose variant="caption" measure={false} className="mt-1">
                        {item.sub}
                      </Prose>
                    </Card>
                  ))}
                </div>

                <div className="mt-10">
                  <Link href="/family" className={buttonClasses()}>
                    Open Goldprint &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </SectionSurface>

        {/* ── THE MAISON D'ORE EXPERIENCE ──────────────────────────────────
            Sand, between the two interludes, so the page has a warm middle
            rather than a second long stretch of parchment. */}
        <SectionSurface surface="light" padding="none">
          <div className="border-y border-fine bg-surface-tint py-20 lg:py-28">
            <Container width="wide">
              <div className="text-center">
                <Rule ornament className="mx-auto max-w-xs" />
                <Heading level={2} className="mt-8">
                  The Maison d&apos;Ore Experience
                </Heading>
              </div>
              <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
                {EXPERIENCE.map((col) => (
                  <div key={col.title}>
                    <div className="aspect-4/3 overflow-hidden rounded-lg md:aspect-square">
                      <MaisonPlate src={col.plate} alt={col.alt} />
                    </div>
                    <Heading level={3} className="mt-6">
                      {col.title}
                    </Heading>
                    <Prose variant="body-ui" measure={false} className="mt-3">
                      {col.body}
                    </Prose>
                  </div>
                ))}
              </div>
            </Container>
          </div>
        </SectionSurface>

        {/* ── OUR PILLARS ──────────────────────────────────────────────────── */}
        <SectionSurface surface="light" padding="none">
          <Container width="wide" className="py-20 text-center lg:py-28">
            <Eyebrow className="[&_hr]:mx-auto">What we stand for</Eyebrow>
            <Heading level={2} className="mt-6">
              OUR PILLARS
            </Heading>
            <ul className="mt-14 flex flex-wrap justify-center gap-x-10 gap-y-8 sm:gap-x-14">
              {PILLARS.map((pillar) => (
                <li key={pillar.label} className="flex w-24 flex-col items-center gap-4">
                  <span
                    aria-hidden
                    className="text-accent flex size-20 items-center justify-center rounded-full border border-accent bg-surface-raised text-2xl leading-none"
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  >
                    {pillar.glyph}
                  </span>
                  <span className="type-label-editorial text-secondary">{pillar.label}</span>
                </li>
              ))}
            </ul>
          </Container>
        </SectionSurface>

        {/* ── QUOTE — the second interlude ─────────────────────────────────
            Left-aligned rather than centred, because the Quote primitive hangs
            its opening mark into the left margin and a centred block leaves it
            floating off the first line. */}
        <SectionSurface surface="navy" padding="none">
          <Container width="prose" className="py-24 lg:py-32">
            <Quote attribution="Charles Eames">
              The details are not the details. They make the design.
            </Quote>
          </Container>
        </SectionSurface>

        {/* ── STAY CONNECTED ───────────────────────────────────────────────── */}
        <SectionSurface surface="light" padding="none">
          <Container width="prose" className="py-20 lg:py-28">
            <Card tone="raised" elevation="raised" padding="lg" className="text-center">
              <Heading level={2}>STAY CONNECTED</Heading>
              <Prose className="mx-auto mt-5">
                Be the first to know about new collections, events and inspiration.
              </Prose>

              {subscribed ? (
                <Prose
                  role="status"
                  tone="none"
                  measure={false}
                  className="text-accent-readable mt-8"
                >
                  Thank you for joining us.
                </Prose>
              ) : (
                <form
                  className="mx-auto mt-8 flex max-w-md flex-col gap-3 text-left sm:flex-row sm:items-start"
                  onSubmit={(e) => {
                    e.preventDefault();
                    subscribe();
                  }}
                >
                  <Field
                    label="Your email address"
                    labelHidden
                    type="email"
                    autoComplete="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" className="shrink-0">
                    SUBSCRIBE &rarr;
                  </Button>
                </form>
              )}
            </Card>
          </Container>
        </SectionSurface>

        {/* ── PRESS ────────────────────────────────────────────────────────── */}
        <SectionSurface surface="light" padding="none">
          <div className="border-t border-fine bg-surface-tint py-12 lg:py-16">
            <Container width="wide" className="text-center">
              <Eyebrow rule={false} tone="secondary">
                AS SEEN IN
              </Eyebrow>
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
                {PRESS.map((name) => (
                  <li
                    key={name}
                    className="text-faint font-display text-[length:var(--type-body)] tracking-[0.06em]"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </Container>
          </div>
        </SectionSurface>

      </main>
      <MaisonFooter />
    </>
  );
}
