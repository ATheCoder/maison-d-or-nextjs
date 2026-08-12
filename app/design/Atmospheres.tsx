import type { ReactNode } from 'react';
import Button from '@/components/ds/Button';
import Eyebrow from '@/components/ds/Eyebrow';
import HeartToggle from '@/components/ds/HeartToggle';
import Quote from '@/components/ds/Quote';
import Rule from '@/components/ds/Rule';
import SectionSurface from '@/components/ds/SectionSurface';
import TextLink from '@/components/ds/TextLink';

/**
 * §5 addendum — the PO's approval gate for the rebalance: the three soft
 * families demonstrated as ENVIRONMENTS, not labels. Each trial section is a
 * full SectionSurface on the family's pale ground with real-feeling content:
 * eyebrow, display heading, body with a live link, a tinted aside, a raised
 * card wearing the heart, a quote and the house buttons. Everything is the
 * same primitives with zero per-section logic — only the surface prop
 * changes, which is the §1.2 architecture carrying its fourth, fifth and
 * sixth surface. Sections butt with the fine rule (composition's job); the
 * rule tints itself to each family because border-fine is scoped.
 */
type Trial = {
  surface: 'sage' | 'rose' | 'lavender';
  eyebrow: string;
  title: string;
  body: ReactNode;
  aside: string;
  card: { title: string; caption: string };
  quote: string;
  attribution: string;
  primary: string;
  ghost: string;
  ornament: string;
};

const TRIALS: Trial[] = [
  {
    surface: 'sage',
    eyebrow: 'The garden · grounding',
    title: 'Where the rosemary grows taller than the children.',
    body: (
      <>
        The garden keeps its own calendar. The beds by the south wall come into
        their season without being asked, the tortoise knows the fig tree&rsquo;s
        schedule better than anyone in the house, and the paths are exactly long
        enough for a question to find its answer. What grows here this month is
        kept in <TextLink href="#">the garden almanac</TextLink>.
      </>
    ),
    aside: 'The greenhouse door stays unlocked in summer. Mind the basil — it bruises if you look at it too fast.',
    card: { title: 'The tortoise, at her own pace', caption: 'A resident of the lower garden' },
    quote: 'She ate from my hand. She was not in a hurry, so neither was I.',
    attribution: 'A young gardener, aged six',
    primary: 'Walk the garden path',
    ghost: 'Sit a while first',
    ornament: '❧',
  },
  {
    surface: 'rose',
    eyebrow: 'The family album · memory',
    title: 'The table remembers every birthday.',
    body: (
      <>
        Some rooms hold their people even when the people are elsewhere. The
        album keeps the small evidence — a recipe in a grandmother&rsquo;s hand,
        the pencil marks on the door frame, the song everyone pretends not to
        know the words to. New pages are added gently, in
        <TextLink href="#"> the family&rsquo;s own words</TextLink>.
      </>
    ),
    aside: 'Sunday lunch photographs, 1962 to now. The chairs have changed four times; the seating argument has not.',
    card: { title: 'The soup that tastes like a story', caption: 'Recorded at the kitchen table' },
    quote: 'Grandma’s soup tastes like the story she tells while it cooks.',
    attribution: 'A granddaughter, reporting faithfully',
    primary: 'Open the album',
    ghost: 'Add a memory',
    ornament: '♥',
  },
  {
    surface: 'lavender',
    eyebrow: 'The evening room · imagination',
    title: 'Some doors in the Maison only open after dusk.',
    body: (
      <>
        When the house quiets, a different set of rooms wakes up — the
        observatory, the shelf of unlikely maps, the drawer that is always
        locked except when it isn&rsquo;t. Evening discoveries are gentler than
        daytime lessons and twice as well remembered. Tonight&rsquo;s door is
        listed in <TextLink href="#">the evening register</TextLink>.
      </>
    ),
    aside: 'The telescope is pointed at Jupiter until Thursday. After that, the moon has an appointment.',
    card: { title: 'The house, humming at night', caption: 'Heard from the top of the stairs' },
    quote: 'I heard the house humming. It was the fridge, but it was also magic.',
    attribution: 'A night listener, aged eight',
    primary: 'Step inside',
    ghost: 'Leave the door ajar',
    ornament: '☾',
  },
];

export default function Atmospheres() {
  return (
    <div>
      {TRIALS.map((trial, i) => (
        <SectionSurface
          key={trial.surface}
          surface={trial.surface}
          className={i > 0 ? 'border-t border-fine' : ''}
        >
          <div className="mx-auto max-w-3xl space-y-8 px-6">
            <Eyebrow>{trial.eyebrow}</Eyebrow>

            <p role="heading" aria-level={3} className="type-display-section text-primary">
              {trial.title}
            </p>

            <p className="type-body max-w-[38rem] text-secondary">{trial.body}</p>

            <div className="flex flex-wrap gap-6">
              {/* The tinted aside — surface-tint as the family's deeper wash. */}
              <div className="min-w-56 flex-1 rounded-md bg-surface-tint p-5">
                <p className="type-body-ui text-primary">{trial.aside}</p>
              </div>
              {/* The raised card — surface-raised lifting toward ivory, with
                  the heart proving the wax red holds its 3.0 floor here. */}
              <div className="flex min-w-56 flex-1 items-center gap-4 rounded-md border border-fine bg-surface-raised p-5">
                <HeartToggle variant="chip" aria-label="Save this" defaultPressed />
                <div>
                  <p className="type-body-ui text-primary">{trial.card.title}</p>
                  <p className="type-caption text-faint">{trial.card.caption}</p>
                </div>
              </div>
            </div>

            <Quote attribution={trial.attribution}>{trial.quote}</Quote>

            <div className="flex flex-wrap items-center gap-4">
              <Button>{trial.primary}</Button>
              <Button variant="ghost">{trial.ghost}</Button>
            </div>

            <Rule ornament={<span className="type-caption text-accent">{trial.ornament}</span>} />
          </div>
        </SectionSurface>
      ))}
    </div>
  );
}
