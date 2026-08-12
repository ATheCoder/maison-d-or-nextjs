import Button from '@/components/ds/Button';
import Eyebrow from '@/components/ds/Eyebrow';
import HeartToggle from '@/components/ds/HeartToggle';
import Quote from '@/components/ds/Quote';
import Rule from '@/components/ds/Rule';
import SectionSurface from '@/components/ds/SectionSurface';
import TextLink from '@/components/ds/TextLink';

/**
 * §5.5 — all the primitives in all variants, stamped once per surface; only
 * SectionSurface's surface prop changes. A sage stamp sits among them to
 * prove the primitives on an atmosphere ground with zero extra logic (the
 * full environments live in the Atmospheres section). SectionSurface itself
 * is under test here too: its variants ARE the sections, butted with the
 * fine gold rule (composition's job — shown on the dark→navy seam, per the
 * globals.css §3.2 note about not baking it in).
 */
function Specimen({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6">
      <div className="flex flex-wrap items-end gap-10">
        <Eyebrow>With the rule</Eyebrow>
        <Eyebrow rule={false}>Without the rule</Eyebrow>
      </div>

      <p role="heading" aria-level={3} className="type-display-section letterpress text-primary">
        {title}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <Button>Begin the journey</Button>
        <Button variant="ghost">Perhaps later</Button>
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

      <div className="flex flex-wrap items-center gap-4">
        <HeartToggle aria-label="Save this story" />
        <HeartToggle aria-label="Save this story" defaultPressed />
        <HeartToggle variant="chip" aria-label="Save this story" />
        <HeartToggle variant="chip" aria-label="Save this story" defaultPressed />
        <HeartToggle aria-label="Save this story" disabled />
        <HeartToggle variant="chip" aria-label="Save this story" disabled />
      </div>

      <div className="space-y-4">
        <Rule />
        <Rule variant="accent" />
        <Rule ornament />
        <Rule variant="accent" ornament={<span className="type-caption text-accent">❦</span>} />
      </div>

      <p className="type-body max-w-[38rem] text-secondary">
        Prose keeps its links underlined — like{' '}
        <TextLink href="#">the almanac, page forty-one</TextLink> — so colour is
        never the only thing marking the way through.
      </p>

      <Quote attribution="A young explorer, aged seven">
        The house smelled of cedar and far-away rain.
      </Quote>
      <Quote>Somewhere it is already tomorrow, and the bread is out of the oven.</Quote>
    </div>
  );
}

export default function PrimitivesShowcase() {
  return (
    <div>
      <SectionSurface>
        <Specimen title="On parchment" />
      </SectionSurface>
      <SectionSurface surface="sage" className="border-t border-fine">
        <Specimen title="Out in the garden" />
      </SectionSurface>
      <SectionSurface surface="dark">
        <Specimen title="An espresso interlude" />
      </SectionSurface>
      <SectionSurface surface="navy" className="border-t border-accent">
        <Specimen title="A navy interlude" />
      </SectionSurface>
    </div>
  );
}
