import { Suspense } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { THEME_KEYS, THEME_NAMES } from '@/lib/theme-keys';
import ConfirmDemo from './ConfirmDemo';
import FieldShellDemo from './FieldShellDemo';
import OverlayDemo from './OverlayDemo';
import {
  Avatar,
  Button,
  buttonClasses,
  Card,
  Code,
  Container,
  Eyebrow,
  Field,
  HeartToggle,
  Heading,
  ListRow,
  Meter,
  Note,
  PageHeader,
  Prose,
  Quote,
  Rule,
  SectionSurface,
  SelectPill,
  Stat,
  TextLink,
  ThemeDot,
} from '@/components/ds';

/**
 * §5.5 — all the primitives in all variants, stamped once per surface, and
 * every stamp dressed as a full ENVIRONMENT (the PO's approval gate for the
 * rebalance, folded in from the former Atmospheres section): each surface
 * carries real-feeling content — narrative eyebrow, display heading, body
 * with a live link, a tinted aside, a raised card wearing the heart, quotes
 * and the house buttons — alongside the complete variant coverage: disabled
 * and loading buttons, the four field states, all six hearts, every rule.
 * Only SectionSurface's surface prop changes between stamps, which is the
 * §1.2 architecture carrying all seven surfaces with zero per-section logic.
 * Light dominates: parchment first, then the four soft families, then the
 * two cinematic interludes. Sections butt with the fine rule (composition's
 * job — the tinting proves border-fine is scoped); the dark→navy seam wears
 * the accent rule instead, per the globals.css §3.2 note about not baking
 * it in.
 */
type Story = {
  surface: 'light' | 'sage' | 'rose' | 'lavender' | 'periwinkle' | 'dark' | 'navy';
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
    surface: 'periwinkle',
    eyebrow: 'The sky study · curiosity',
    title: 'The weather arrives here a little before it arrives anywhere else.',
    body: (
      <>
        The sky study keeps the barometers, the kite with the mended tail, and
        a ledger of clouds nobody has managed to name the same way twice. The
        swallows file their reports at the window; the house copies them into{' '}
        <TextLink href="#">the cloud ledger</TextLink>, spelling and all.
      </>
    ),
    aside: 'The kite flies best on Thursdays. Nobody knows why, and nobody is in a hurry to find out.',
    card: { title: 'A cloud shaped like the tortoise', caption: 'Witnessed from the weather window' },
    quote: 'The wind read my kite like a letter and sent it back with an answer.',
    attribution: 'A sky watcher, aged eight',
    primary: 'Climb to the window',
    ghost: 'Watch from the lawn',
    ornament: '✧',
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
    <Container width="prose" className="space-y-8">
      <div className="flex flex-wrap items-end gap-10">
        <Eyebrow>{story.eyebrow}</Eyebrow>
        <Eyebrow rule={false}>Without the rule</Eyebrow>
      </div>

      <Heading level={3} variant="section" className="letterpress">
        {story.title}
      </Heading>

      <Prose>{story.body}</Prose>

      <div className="flex flex-wrap items-center gap-4">
        <Button>{story.primary}</Button>
        <Button variant="ghost">{story.ghost}</Button>
        {/* Ghost's shape, danger's ink — deliberately quieter than the
            primary beside it, because the loud button on a screen should be
            the one that makes something. Rest is a terracotta hairline over
            nothing; hover fills. On the two interludes both turn to rose, the
            same brightening the heart's wax does. */}
        <Button variant="danger">Delete for ever</Button>
        <Button variant="link">Read the letter</Button>
        <Button disabled>Disabled</Button>
        <Button variant="ghost" disabled>
          Disabled
        </Button>
        <Button variant="danger" disabled>
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

      {/* The same coats at the tool scale. `size="sm"` is the admin desk's
          row: caption type, tighter box, the smaller radius — and otherwise
          the identical button, which is the point of stamping it directly
          under the reading scale rather than on a page of its own. The fill,
          the hover swap, the sheen, the lift and the spinner all re-scope per
          surface exactly as they do above. */}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">{story.primary}</Button>
        <Button variant="ghost" size="sm">
          {story.ghost}
        </Button>
        <Button variant="link" size="sm">
          Read the letter
        </Button>
        <Button size="sm" loading>
          Working
        </Button>
        <Button variant="danger" size="sm">
          Delete
        </Button>
        <Button variant="ghost" size="sm" disabled>
          Disabled
        </Button>
        {/* And the coat on a next/link, via buttonClasses — the admin desk is
            full of navigation shaped like an action, and this is the only way
            it gets the real coat instead of a copy of it. */}
        <Link href="#" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          A link wearing the coat
        </Link>
      </div>

      {/* The same coats on an anchor. `href` swaps the <button> for an <a>
          and changes nothing else — an action that navigates is a link, and
          must keep the middle-click and the copy-link that a <button> throws
          away. Stamped beside the buttons above precisely so the two read as
          one control: if these ever drift apart visually, the house has two
          primary buttons again, which is the thing this replaced. There is no
          disabled stamp because that side of the union does not exist — a
          link that must not be followed has no href, and is a button. */}
      <div className="flex flex-wrap items-center gap-4">
        <Button href="#">{story.primary}</Button>
        <Button variant="ghost" href="#">
          {story.ghost}
        </Button>
        <Button variant="link" href="#">
          Read the letter
        </Button>
      </div>

      {/* The fourth variant, which has no look of its own: `bare` brings the
          focus ring, the pointer and the disabled/loading behaviour, and the
          call site brings everything else. Stamped here dressed two ways —
          as the gallery's micro-link and as a plain hit target — because what
          the stamp has to prove is that the RING re-scopes per surface even
          though nothing else about the button does. Tab to them. */}
      <div className="flex flex-wrap items-center gap-6">
        <Button
          variant="bare"
          className="type-caption uppercase tracking-[0.15em] text-accent-readable hover:text-primary"
        >
          Read the whole story
        </Button>
        <Button variant="bare" className="rounded-sm border border-fine px-3 py-1.5">
          <span className="type-caption text-secondary">A plain hit target</span>
        </Button>
        <Button variant="bare" className="type-caption text-faint" disabled>
          Nothing to open
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
        {/* The other two controls, wearing the same coat, the same label and
            the same message seat as the inputs above — which is the whole
            claim: to someone filling in a form these are one thing, and only
            the answer's shape differs. The select keeps its NATIVE arrow on
            purpose (see Field's docstring); the textarea resizes vertically
            only, so it cannot break the measure it sits in. */}
        <Field as="select" label="Which room" defaultValue="garden" hint="The house will remember.">
          <option value="garden">The garden, by the south wall</option>
          <option value="evening">The evening room</option>
          <option value="sky">The sky study</option>
        </Field>
        <Field
          as="textarea"
          label="What you found there"
          rows={3}
          placeholder="A tortoise, unhurried."
        />
        {/* The label is hidden, not absent — still in the accessibility tree,
            still clickable to focus, still surviving translation tooling, all
            of which `aria-label` on a bare input gives up. For the controls
            whose question is already answered by what surrounds them: the PIN
            box inside a menu that is titled with whose PIN it wants. */}
        <Field
          label="The word at the gate"
          labelHidden
          type="password"
          placeholder="••••"
          hint="Its label is there — read the DOM, or tab to it with a screen reader on."
        />
      </div>

      {/* The same field at the tool scale, matching the buttons above. The
          admin desk asks thirty questions on one screen; `size="sm"` is how
          it does that without either shrinking the coat by hand or giving
          each answer a 44px box. Coat, label, message seat and the invalid
          state are untouched — only the box moves. */}
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-3">
        <Field size="sm" label="Destination" defaultValue="Kyoto" />
        <Field size="sm" as="select" label="Status" defaultValue="draft">
          <option value="draft">Draft</option>
          <option value="ready">Live</option>
        </Field>
        <Field
          size="sm"
          label="Country code"
          defaultValue="JPN"
          error="Two letters, not three."
        />
        {/* All three controls at the small size, not two. The gap is worth a
            line of explanation: this page is what the admin desk is diffed
            against, and a shape that is missing here cannot be found wrong
            there — a small textarea shipped on two admin screens with nothing
            to compare it to, which is exactly how the size once wandered off
            the house's radius. If a surface uses it, it is stamped. */}
        <Field
          size="sm"
          as="textarea"
          label="What happened"
          rows={2}
          className="sm:col-span-3"
          defaultValue="The rosemary came back on its own, taller than last year."
        />
      </div>

      {/* The seat with no Field in it — the same label, gap and message seat
          the eleven controls above wear, around the one control the house
          cannot put inside Field. DatePicker is a 697-line ARIA combobox with
          a coat of its own (the composite exception the contract test argues
          for), and every screen that asks for a birthday used to hand-copy
          these label classes by eye. Now there is one seat with two front
          doors. See FieldShellDemo for what the error side proves. */}
      {/* Behind a boundary because DatePicker reads the clock while it renders
          (its empty calendar has to know what "today" is), and under Cache
          Components the clock is request data: a render with no other request
          data raises next-prerender-current-time. Every real caller — the
          wizard, /family, the admin desk — is already past an auth read when
          it mounts this, so the clock there is honest request-time work.
          /design reads nothing at all, which is the same corner the homepage's
          copyright line was in (see components/maison/CopyrightYear). */}
      <Suspense fallback={<div className="h-24" />}>
        <FieldShellDemo />
      </Suspense>

      {/* The two functional inks, side by side, because the pair is the point:
          an error and a confirmation must be told apart WITHOUT reading them,
          on every one of these grounds. Terracotta and forest on the light
          five; rose and sage on the two interludes, where both of the light
          inks vanish. Neither dresses for the room — an error is an error in
          the garden too. Graded live in §07. */}
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <Prose variant="caption" tone="none" measure={false} className="text-danger-readable">
          That address will not reach anyone &mdash; check it once more.
        </Prose>
        <Prose variant="caption" tone="none" measure={false} className="text-success-readable">
          Saved. The gate will remember it from tonight.
        </Prose>
      </div>

      <div className="flex flex-wrap gap-6">
        {/* The tinted aside — surface-tint as the ground's deeper wash: the
            family tint in the atmospheres, sand on parchment, a step into
            the dark on the interludes. */}
        <Card tone="tint" className="min-w-56 flex-1">
          <Prose variant="body-ui" tone="primary" measure={false}>
            {story.aside}
          </Prose>
        </Card>
        {/* The raised card — surface-raised lifting toward ivory, with the
            heart proving the wax red holds its 3.0 floor here. */}
        <Card className="flex min-w-56 flex-1 items-center gap-4">
          <HeartToggle variant="chip" aria-label="Save this" defaultPressed />
          <div>
            <p className="type-body-ui text-primary">{story.card.title}</p>
            <p className="type-caption text-faint">{story.card.caption}</p>
          </div>
        </Card>
      </div>

      {/* Avatar, in its three readings: a child's chosen emblem, a monogram
          for a name with no emblem behind it, and the key that stands for the
          grown-up in a room with no reader in it. The emblem grounds are the
          one thing on this page that does NOT re-scope, and that is the
          decision, not an oversight — they are content, like a photograph.
          What does re-scope is everything around them: the ring at --accent
          50%, the choice mark at solid --accent, and the monogram's own
          ground and ink. Compare the ring here against the ring seven
          sections down. */}
      <div className="flex flex-wrap items-center gap-4">
        <Avatar avatar="fox" size="lg" />
        <Avatar avatar="whale" ring />
        <Avatar avatar="moon" selected />
        <Avatar avatar="leaf" size="sm" ring />
        <Avatar name="Am&eacute;lie" ring />
        <Avatar ring />
        <Prose variant="caption" measure={false}>
          emblem &middot; ring &middot; selected &middot; small &middot; monogram &middot; nobody
        </Prose>
      </div>

      {/* The dashed aside, and the mono token inside it. A solid edge on this
          ground reads as another section of the form; a dashed one reads as a
          remark about it. Code is deliberately text-primary rather than the
          caption's secondary — a link you have to copy IS the content of the
          panel it sits in. */}
      <Note>
        <Prose variant="caption" measure={false} className="mb-2">
          Share this with <strong>the gardener</strong>{' '}&mdash; it is shown
          once and expires in seven days:
        </Prose>
        <div className="flex items-center gap-2">
          <Code break>https://maisondore.example/invite/9f3c1a7e-4b28-4d51-bb90-6e2a0c7d51f4</Code>
          <Button variant="ghost" size="sm">Copy</Button>
        </div>
      </Note>

      {/* The roster row. Two of them, so the hairline between and the hairline
          under are both visible — and the second one carries verbs, which is
          the case the four utilities kept being retyped for. */}
      <div>
        <ListRow>
          <Avatar avatar="owl" size="sm" />
          <span className="type-body-ui flex-1 text-primary">The tortoise</span>
          <span className="type-caption">resident, lower garden</span>
        </ListRow>
        <ListRow>
          <Avatar name="Beatrice" size="sm" />
          <span className="type-body-ui flex-1 text-primary">Beatrice</span>
          <Button variant="link" size="sm">Rename</Button>
          <Button variant="danger" size="sm">Remove</Button>
        </ListRow>
      </div>

      {/* Stat, at both scales. The unit is its own slot — "of 7", "/ 366", the
          "m" in "4h 20m" — set a step down in secondary ink, because it is the
          denominator, not the reading. Below, the desk scale: a kicker above,
          a caption under, and `tone="accent"` for the one figure that is a
          queue rather than an achievement. Watch that tone across the seven
          surfaces — it is accent-READABLE, the AA tier, because unlike a rule
          or a fill this is text somebody has to read. */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <Stat figure="4h" unit="20m" label="with the paper this week" />
        <Stat figure="6" unit="of 7" label="editions opened" />
        <Stat figure="3" label="editions in a row" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          size="sm"
          eyebrow="Live to families"
          eyebrowTone="secondary"
          figure={214}
          label="dates a family can open"
        />
        <Stat
          size="sm"
          eyebrow="In draft"
          eyebrowTone="secondary"
          figure={38}
          unit="/ 52"
          label="started, not yet published"
        />
        <Stat
          size="sm"
          tone="accent"
          eyebrow="Uncovered days"
          figure={41}
          label="days with nobody yet — your queue"
        />
      </div>

      {/* Meter. The last three are the whole argument for the component: a
          value under half a percent still draws a sliver (minVisible), because
          a real reading that renders as an empty track is indistinguishable
          from no data; `faint` is a reading that has receded, and it is the
          ink scale rather than --danger, because a thing set aside is not an
          error; and only the LAST one has a label, which is what promotes it
          from decoration to an announced progressbar. Tab a screen reader
          through these: three say nothing, one says 62 percent. If you cannot
          write the label, you do not have a progressbar. */}
      <div className="max-w-sm space-y-4">
        <Meter value={72} />
        <Meter value={0.4} minVisible={4} />
        <Meter value={28} tone="faint" />
        <Meter value={62} label="Illustrations painted" />
      </div>

      {/* SelectPill — one choice in a row of choices, and the primitive that
          exists because Chip is inert and Button will not take a pill corner.
          There is no `selected` prop: the coat paints itself from aria-current
          / aria-pressed, so a pill cannot look chosen without saying it is.
          Two variants: `peer`, where the unchosen members are simply not
          chosen, and `offer`, where they are things on offer — dashed and
          faint — rather than peers of where you are. */}
      <div className="flex flex-wrap items-center gap-2.5">
        <SelectPill aria-pressed>
          <Avatar name="Am&eacute;lie" size="sm" className="size-[26px]" ring />
          Am&eacute;lie
        </SelectPill>
        <SelectPill>
          <Avatar avatar="fox" size="sm" className="size-[26px]" ring />
          Beatrice
        </SelectPill>
        <SelectPill>The third child</SelectPill>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SelectPill variant="offer" href="#">
          Mon 24
        </SelectPill>
        <SelectPill variant="offer" href="#">
          Tue 25
        </SelectPill>
        <SelectPill variant="offer" href="#" aria-current="page">
          Today
        </SelectPill>
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
    </Container>
  );
}

/* The seven page-wide themes, each chip re-scoped by its own data-theme
   attribute — the same blocks the [data-surface] stories above exercise, plus
   --theme-swatch, which is what the live pickers (wizard, edition switcher)
   render their dots from. */
function ThemeGallery() {
  return (
    <Container width="prose" className="space-y-8">
      <Eyebrow>The seven themes · page-wide scopes</Eyebrow>
      <Prose>
        A theme is one of the surface re-scopes applied to a whole page by{' '}
        <code>data-theme</code> — parchment is the house default (the bare-root
        tokens), and the other six share their declarations with the sections
        above, so what is measured there is what ships here.
      </Prose>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THEME_KEYS.map((key) => (
          <Card key={key} data-theme={key} tone="page">
            <div className="flex items-center gap-3">
              <ThemeDot theme={key} />
              <p className="type-body-ui text-primary">{THEME_NAMES[key]}</p>
            </div>
            <Card bordered={false} elevation="card" padding="sm" className="mt-4">
              <p className="type-caption text-accent-readable">{key}</p>
              <p className="type-body-ui text-primary">The raised card</p>
              <p className="type-caption text-faint">and its faint caption</p>
            </Card>
            <Rule variant="accent" />
          </Card>
        ))}
      </div>
    </Container>
  );
}

/* The primitives the seven environment stamps deliberately do NOT carry.
   A dialog is page-level rather than surface-level, a page header is a whole
   room's masthead and there is only one room per page, `variant="none"` is a
   mechanism rather than a colour, and glass over flat paint demonstrates
   nothing — stamping these seven times would pad the page without proving
   anything. They are stamped once each, on the ground that shows them. */
function Interactive() {
  return (
    <Container width="prose" className="space-y-10">
      <Eyebrow>The rest of the set · dialogs, mastheads, glass, bare semantics</Eyebrow>

      <div className="space-y-4">
        <Heading level={3} variant="story">
          Overlay
        </Heading>
        <Prose>
          The house dialog shell — scrim, panel, close button, and the four
          behaviours a modal is not a modal without: Escape, focus trap, focus
          restore, scroll lock. It was Daily Gold&rsquo;s <code>DGModal</code>
          {' '}until it turned out to be the only <code>aria-modal</code>{' '}
          implementation in the app, serving the paper, the Treasury and the
          flag collection alike; the shell moved here and the dwell clock
          stayed there.
        </Prose>
        <OverlayDemo />
      </div>

      <div className="space-y-4">
        <Heading level={3} variant="story">
          Confirm
        </Heading>
        <Prose>
          &ldquo;Are you sure?&rdquo;, in the house&rsquo;s own voice. It
          replaced two things: <code>window.confirm()</code>, which /family used
          to delete a reader &mdash; unthemeable, unfocusable, and reading as
          though the BROWSER were asking, which is the wrong authority for
          &ldquo;this deletes your child&rsquo;s reading history&rdquo; &mdash;
          and the hand-composed version, which the admin&rsquo;s people library
          had already built out of Overlay, Heading, Prose and a button pair
          before /family started building a second one.
        </Prose>
        <ConfirmDemo />
      </div>

      <div className="space-y-4">
        <Heading level={3} variant="story">
          PageHeader
        </Heading>
        <Prose>
          What a room says before it says anything else: where you are, whose
          it is, and the verbs that belong to the room rather than to any
          section of it. Stamped once because there is one masthead per page.
          The title defaults to <code>variant=&quot;section&quot;</code> and
          not the level&rsquo;s own hero &mdash; a hero runs to 4.75rem, which
          opens a story rather than introducing a working screen, and both call
          sites had already overridden it the same way.
        </Prose>
        <Card tone="tint" padding="lg">
          <PageHeader
            eyebrow="Maison d&rsquo;Or&eacute; &mdash; Your family"
            title="The Beaumont Family"
            actions={
              <>
                <TextLink href="#" className="type-caption">Profiles</TextLink>
                <Button variant="ghost" size="sm">Sign out</Button>
              </>
            }
          />
        </Card>
        <Prose variant="caption">
          The observatory keeps its own masthead on purpose: it is centred, it
          carries a week line and a child-pill nav underneath, and bending this
          to fit would mean two layout modes and an alignment prop one caller
          uses.
        </Prose>
      </div>

      <div className="space-y-4">
        <Heading level={3} variant="story">
          Heading, with no size of its own
        </Heading>
        <Prose>
          <code>variant=&quot;none&quot;</code> renders the heading role and
          level and nothing about the size, for the one case where a stylesheet
          outside the token scale legitimately owns it — the gallery&rsquo;s
          entrance sets its own <code>clamp(40px, 6.6vw, 104px)</code>, and
          shipping a <code>type-display-*</code> class alongside that would mean
          two rules competing to set one property. The line below is a real
          heading at level 3, sized entirely by the call site:
        </Prose>
        <Card tone="tint">
          <Heading
            level={3}
            variant="none"
            className="font-display italic"
            style={{ fontSize: 'clamp(28px, 5vw, 52px)', lineHeight: 1, letterSpacing: '-0.02em' }}
          >
            Today the world is in Kyoto
          </Heading>
        </Card>
        <Prose variant="caption">
          Use it only where such a rule already exists and is documented. A
          heading with no size from anywhere is a bug, not a variant.
        </Prose>
      </div>

      <div className="space-y-4">
        <Heading level={3} variant="story">
          Card, in glass
        </Heading>
        <Prose>
          The card that stands on a photograph rather than on paint — the front
          door&rsquo;s. <code>--surface-glass</code> is derived from{' '}
          <code>--surface-raised</code>, so one declaration follows every theme:
          the glass is ivory over parchment and espresso over the interludes,
          with no props and no second stamp. It composites brighter than the
          wall behind it on purpose, which is what lifts it off the room instead
          of letting it dissolve into it.
        </Prose>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THEME_KEYS.map((key) => (
          <div
            key={key}
            data-theme={key}
            className="rounded-lg bg-cover bg-center p-5"
            style={{ backgroundImage: "url('/auth/maison-drawing-room.webp')" }}
          >
            {/* elevation="modal" is not decoration here: on paint a hairline
                separates a card from its ground, but on a photograph only a
                shadow does. */}
            <Card tone="glass" elevation="modal" radius="lg">
              <p className="type-label-editorial text-accent-readable">{key}</p>
              <p className="type-body-ui mt-2 text-primary">The glass card</p>
              <p className="type-caption text-faint">and the room behind it</p>
            </Card>
          </div>
        ))}
      </div>
    </Container>
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
      <SectionSurface surface="light" className="border-t border-fine">
        <ThemeGallery />
      </SectionSurface>
      <SectionSurface surface="light" className="border-t border-fine">
        <Interactive />
      </SectionSurface>
    </div>
  );
}
