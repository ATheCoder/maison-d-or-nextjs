import Button from '@/components/ds/Button';
import Eyebrow from '@/components/ds/Eyebrow';
import Quote from '@/components/ds/Quote';
import Rule from '@/components/ds/Rule';
import SectionSurface from '@/components/ds/SectionSurface';

/**
 * §5.5 — all five primitives in all variants on all three surfaces. The same
 * specimen is stamped three times; only SectionSurface's surface prop changes.
 * SectionSurface itself is under test here too: its variants ARE the three
 * sections, butted with the fine gold rule (composition's job — shown on the
 * dark→navy seam, per the globals.css §3.2 note about not baking it in).
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

      <div className="space-y-4">
        <Rule />
        <Rule variant="accent" />
        <Rule ornament />
        <Rule variant="accent" ornament={<span className="type-caption text-accent">❦</span>} />
      </div>

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
      <SectionSurface surface="dark">
        <Specimen title="An espresso interlude" />
      </SectionSurface>
      <SectionSurface surface="navy" className="border-t border-accent">
        <Specimen title="A navy interlude" />
      </SectionSurface>
    </div>
  );
}
