// §3 Texture (docs/DesignSystemP1.md) — the treatments on their own, ahead of
// the /design playground (§5). Nothing in the app wears these classes yet;
// this file is also what makes Tailwind emit the @utility ones (texture-paper,
// letterpress, rule-fine, rule-accent are reference-triggered). Grain must be
// invisible as "an effect" — compare the two light panels to find it at all.

const panel: React.CSSProperties = {
  padding: '3rem 2.5rem',
  fontFamily: 'var(--face-sans)',
};

function PanelContent({ title }: { title: string }) {
  return (
    <>
      <p className="type-label-editorial" style={{ color: 'var(--accent)', margin: 0 }}>
        Where in the world
      </p>
      <hr className="rule-accent" style={{ margin: '0.5rem 0 1.25rem' }} />
      <h2 className="type-display-section letterpress" style={{ color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </h2>
      <p className="type-body" style={{ color: 'var(--text-secondary)', maxWidth: '34rem' }}>
        A new little corner of the world is waiting. The grain should only be
        noticeable when toggled off; the vignette should read as depth, not as
        an effect.
      </p>
      <hr className="rule-fine" style={{ margin: '1.5rem 0 0' }} />
    </>
  );
}

/* Same parchment panel twice — with and without grain. */
export function PaperGrain() {
  return (
    <div style={{ display: 'grid', gap: '1px' }}>
      <section className="texture-paper" style={{ ...panel, background: 'var(--surface-page)' }}>
        <PanelContent title="With paper grain" />
      </section>
      <section style={{ ...panel, background: 'var(--surface-page)' }}>
        <PanelContent title="No grain — compare" />
      </section>
    </div>
  );
}

/* Dark and navy treatments: re-scoped tokens + grain + vignette, butted
   together with the fine gold rule (composition's job, shown here once). */
export function DarkSections() {
  return (
    <div>
      <section className="section-dark" style={panel}>
        <PanelContent title="An espresso interlude" />
      </section>
      <section className="section-navy" style={{ ...panel, borderTop: '1px solid var(--border-accent)' }}>
        <PanelContent title="A navy interlude" />
      </section>
      {/* letterpress is gated: on this light panel it must do nothing */}
      <section style={{ ...panel, background: 'var(--surface-page)' }}>
        <h2 className="type-display-section letterpress" style={{ color: 'var(--text-primary)', margin: 0 }}>
          Letterpress is inert on light
        </h2>
      </section>
    </div>
  );
}

/* §3.4 radius tokens on raised cards. */
export function Radii() {
  return (
    <div style={{ ...panel, background: 'var(--surface-page)', display: 'flex', gap: '1rem' }}>
      {(['--radius-sm', '--radius-md'] as const).map((r) => (
        <div
          key={r}
          className="type-body-ui"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-fine)',
            borderRadius: `var(${r})`,
            color: 'var(--text-secondary)',
            padding: '1.25rem 1.5rem',
          }}
        >
          {r}
        </div>
      ))}
    </div>
  );
}
