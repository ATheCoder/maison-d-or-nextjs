import type { ReactNode } from 'react';
import Button from '@/components/ds/Button';
import Eyebrow from '@/components/ds/Eyebrow';
import Field from '@/components/ds/Field';
import HeartToggle from '@/components/ds/HeartToggle';
import Quote from '@/components/ds/Quote';
import Rule from '@/components/ds/Rule';
import SectionSurface from '@/components/ds/SectionSurface';
import TextLink from '@/components/ds/TextLink';

/**
 * §5.5 — all the primitives in all variants, stamped once per surface, and
 * every stamp dressed as a full ENVIRONMENT (the PO's approval gate for the
 * rebalance, folded in from the former Atmospheres section): each surface
 * carries real-feeling content — narrative eyebrow, display heading, body
 * with a live link, a tinted aside, a raised card wearing the heart, quotes
 * and the house buttons — alongside the complete variant coverage: disabled
 * and loading buttons, the four field states, all six hearts, every rule.
 * Only SectionSurface's surface prop changes between stamps, which is the
 * §1.2 architecture carrying all six surfaces with zero per-section logic.
 * Light dominates: parchment first, then the three soft families, then the
 * two cinematic interludes. Sections butt with the fine rule (composition's
 * job — the tinting proves border-fine is scoped); the dark→navy seam wears
 * the accent rule instead, per the globals.css §3.2 note about not baking
 * it in.
 */
type Story = {
  surface: 'light' | 'sage' | 'rose' | 'lavender' | 'dark' | 'navy';
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

const STORIES: Story[] = [
  {
    surface: 'light',
    eyebrow: 'The maison · first light',
    title: 'On parchment',
    body: (
      <>
        Prose keeps its links underlined — like{' '}
        <TextLink href="#">the almanac, page forty-one</TextLink> — so colour is
        never the only thing marking the way through. Parchment is the ground
        the whole house is written on; everything else is a room off this hall.
      </>
    ),
    aside: 'The front door sticks in August. Lift the handle a little — the house prefers to be asked politely.',
    card: { title: 'The key above the lintel', caption: 'Where it has always been' },
    quote: 'The house smelled of cedar and far-away rain.',
    attribution: 'A young explorer, aged seven',
    primary: 'Begin the journey',
    ghost: 'Perhaps later',
    ornament: '❦',
  },
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
  {
    surface: 'dark',
    eyebrow: 'An interlude · espresso',
    title: 'An espresso interlude',
    body: (
      <>
        When the lights come down, the gold does the talking. The interludes are
        the house&rsquo;s cinema: rare, brief, and always followed by daylight.
        What is showing tonight is pinned to{' '}
        <TextLink href="#">the evening programme</TextLink>.
      </>
    ),
    aside: 'The projector hums for ten minutes before it settles. This is considered part of the film.',
    card: { title: 'Reel three, the storm scene', caption: 'Saved for a braver evening' },
    quote: 'In the dark, the whole room leaned forward at the same time.',
    attribution: 'An audience of one, aged nine',
    primary: 'Take a seat',
    ghost: 'Wait for the lights',
    ornament: '❦',
  },
  {
    surface: 'navy',
    eyebrow: 'An interlude · night',
    title: 'A navy interlude',
    body: (
      <>
        Navy is for knowledge after dark — star charts, tide tables, the atlas
        with the corner chewed by someone who is very sorry. The sky keeps its
        appointments; the house writes them down in{' '}
        <TextLink href="#">the night ledger</TextLink>.
      </>
    ),
    aside: 'The observatory chair creaks on purpose. It is how the room says hush.',
    card: { title: 'Jupiter, on schedule', caption: 'Logged from the top landing' },
    quote: 'I counted four shooting stars and one very committed firefly.',
    attribution: 'A night watcher, aged ten',
    primary: 'Climb to the observatory',
    ghost: 'Stay by the window',
    ornament: '✶',
  },
];

function Specimen({ story }: { story: Story }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6">
      <div className="flex flex-wrap items-end gap-10">
        <Eyebrow>{story.eyebrow}</Eyebrow>
        <Eyebrow rule={false}>Without the rule</Eyebrow>
      </div>

      <p role="heading" aria-level={3} className="type-display-section letterpress text-primary">
        {story.title}
      </p>

      <p className="type-body max-w-[38rem] text-secondary">{story.body}</p>

      <div className="flex flex-wrap items-center gap-4">
        <Button>{story.primary}</Button>
        <Button variant="ghost">{story.ghost}</Button>
        <Button variant="link">Read the letter</Button>
        <Button disabled>Disabled</Button>
        <Button variant="ghost" disabled>
          Disabled
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button loading>Gathering wonder</Button>
        <Button variant="ghost" loading>
          Gathering wonder
        </Button>
        <Button variant="link" loading>
          Gathering wonder
        </Button>
      </div>

      {/* The four field states: at rest with a hint, filled, in error, and
          asleep. The error field is genuinely invalid (aria-invalid via the
          error prop) — the danger border and message are the same terracotta
          in every room, rose on the interludes. */}
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field
          label="Your name"
          placeholder="Amélie, of the garden gate"
          hint="As it should appear in the almanac."
        />
        <Field label="A favourite word" defaultValue="Wondersmith" />
        <Field
          label="Guardian's email"
          type="email"
          defaultValue="amelie@the-garden"
          error="That address will not reach anyone — check it once more."
        />
        <Field label="The cellar door code" placeholder="Locked for the season" disabled />
      </div>

      <div className="flex flex-wrap gap-6">
        {/* The tinted aside — surface-tint as the ground's deeper wash: the
            family tint in the atmospheres, sand on parchment, a step into
            the dark on the interludes. */}
        <div className="min-w-56 flex-1 rounded-md bg-surface-tint p-5">
          <p className="type-body-ui text-primary">{story.aside}</p>
        </div>
        {/* The raised card — surface-raised lifting toward ivory, with the
            heart proving the wax red holds its 3.0 floor here. */}
        <div className="flex min-w-56 flex-1 items-center gap-4 rounded-md border border-fine bg-surface-raised p-5">
          <HeartToggle variant="chip" aria-label="Save this" defaultPressed />
          <div>
            <p className="type-body-ui text-primary">{story.card.title}</p>
            <p className="type-caption text-faint">{story.card.caption}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <HeartToggle aria-label="Save this story" />
        <HeartToggle aria-label="Save this story" defaultPressed />
        <HeartToggle variant="chip" aria-label="Save this story" />
        <HeartToggle variant="chip" aria-label="Save this story" defaultPressed />
        <HeartToggle aria-label="Save this story" disabled />
        <HeartToggle variant="chip" aria-label="Save this story" disabled />
      </div>

      <Quote attribution={story.attribution}>{story.quote}</Quote>
      <Quote>Somewhere it is already tomorrow, and the bread is out of the oven.</Quote>

      <div className="space-y-4">
        <Rule />
        <Rule variant="accent" />
        <Rule ornament />
        <Rule variant="accent" ornament={<span className="type-caption text-accent">{story.ornament}</span>} />
      </div>
    </div>
  );
}

export default function PrimitivesShowcase() {
  return (
    <div>
      {STORIES.map((story, i) => (
        <SectionSurface
          key={story.surface}
          surface={story.surface}
          className={
            story.surface === 'navy'
              ? 'border-t border-accent'
              : story.surface === 'dark' || i === 0
                ? ''
                : 'border-t border-fine'
          }
        >
          <Specimen story={story} />
        </SectionSurface>
      ))}
    </div>
  );
}
