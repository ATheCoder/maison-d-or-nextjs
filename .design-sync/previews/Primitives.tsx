// §4 Base primitives (docs/DesignSystemP1.md) — the five components on all
// three surfaces, ahead of the /design playground (§5). Composition (max-width,
// horizontal padding, section-butting gold rules) is done here at the call
// site, exactly as the primitives' contracts demand.

import Button from '../../components/ds/Button';
import Eyebrow from '../../components/ds/Eyebrow';
import Quote from '../../components/ds/Quote';
import Rule from '../../components/ds/Rule';
import SectionSurface from '../../components/ds/SectionSurface';

const inner: React.CSSProperties = {
  maxWidth: '38rem',
  padding: '0 2.5rem',
};

function Specimen({ title }: { title: string }) {
  return (
    <div style={inner}>
      <Eyebrow>Where in the world</Eyebrow>
      <h2 className="type-display-section letterpress" style={{ margin: '1.25rem 0 0.75rem' }}>
        {title}
      </h2>
      <p className="type-body" style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem' }}>
        A new little corner of the world is waiting.
      </p>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Button>Begin the journey</Button>
        <Button variant="ghost">Perhaps later</Button>
        <Button variant="link">Read the letter</Button>
      </div>
      <Rule style={{ margin: '1.5rem 0' }} />
      <Rule variant="accent" ornament style={{ margin: '1.5rem 0' }} />
      <Quote attribution="A young explorer">
        The house smelled of cedar and far-away rain.
      </Quote>
    </div>
  );
}

/* All five primitives, per surface. Sections butt with the fine gold rule —
   composition's job, shown once between dark and navy. */
export function Primitives() {
  return (
    <div>
      <SectionSurface>
        <Specimen title="On parchment" />
      </SectionSurface>
      <SectionSurface surface="dark">
        <Specimen title="An espresso interlude" />
      </SectionSurface>
      <SectionSurface surface="navy" style={{ borderTop: '1px solid var(--border-accent)' }}>
        <Specimen title="A navy interlude" />
      </SectionSurface>
    </div>
  );
}
