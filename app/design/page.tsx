import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Eyebrow from '@/components/ds/Eyebrow';
import Rule from '@/components/ds/Rule';
import Atmospheres from './Atmospheres';
import ContrastTable from './ContrastTable';
import GrainToggle from './GrainToggle';
import PrimitivesShowcase from './PrimitivesShowcase';
import SemanticTokens from './SemanticTokens';
import Swatches from './Swatches';
import TypeSpecimen from './TypeSpecimen';

/**
 * §5 — the /design playground. The PO-approval artifact for Phase 1 and the
 * reference the mood boards get compared against. Linked from nowhere and
 * kept out of crawlers; reachable only by typing the URL.
 *
 * The page ground is deliberately UNgrained (plain bg-surface-page, no
 * texture-paper): §5.4's A/B toggle only works if no parent overlay keeps
 * painting grain over the "off" panel. Grain appears where it is on display —
 * the texture demo and the SectionSurface showcase.
 */
export const metadata: Metadata = {
  title: "Design system — Maison d'Oré",
  robots: { index: false, follow: false },
};

/**
 * Headings render as role="heading" on <p>, not <h*>: the legacy unlayered
 * h1–h6 rules in globals.css (Playfair, 0.08em tracking, --brown ink) beat
 * the layered type-* utilities on real heading tags, and this page exists to
 * show the tokens exactly. Same document outline, exact rendering.
 */
function Heading({ level, className, children }: { level: number; className: string; children: ReactNode }) {
  return (
    <p role="heading" aria-level={level} className={className}>
      {children}
    </p>
  );
}

function Section({
  number,
  title,
  lede,
  children,
  bleed = false,
}: {
  number: string;
  title: string;
  lede: string;
  children: ReactNode;
  bleed?: boolean;
}) {
  return (
    <section className="pt-16">
      <div className="mx-auto max-w-5xl px-6">
        <Eyebrow>{`${number} · ${title}`}</Eyebrow>
        <p className="type-body mt-4 mb-8 max-w-[38rem] text-secondary">{lede}</p>
      </div>
      {bleed ? children : <div className="mx-auto max-w-5xl px-6">{children}</div>}
    </section>
  );
}

export default function DesignPage() {
  return (
    <main className="min-h-screen bg-surface-page pb-24 text-primary">
      <header className="mx-auto max-w-5xl px-6 pt-20 pb-4">
        <Eyebrow>Maison d&rsquo;Or&eacute; &middot; Phase one</Eyebrow>
        <Heading level={1} className="type-display-hero mt-6 max-w-[16em] text-primary">
          The design system, laid on the table.
        </Heading>
        <p className="type-body mt-6 max-w-[38rem] text-secondary">
          Tokens, typography, texture and the base primitives — everything Phase 1
          ships, on one page, on every surface: the warm light grounds the Maison
          breathes through, the three soft atmospheres, and the two cinematic
          interludes. Values are tuned by eye here first (in globals.css), then
          adopted by the rooms in later phases.
        </p>
        <Rule ornament className="mt-12" />
      </header>

      <Section
        number="01"
        title="Raw palette"
        lede="The full palette with name and hex, read live from the stylesheet — tune a value in globals.css and this page tells the truth about it."
      >
        <Swatches />
      </Section>

      <Section
        number="02"
        title="Semantic tokens"
        lede="The same markup once per surface; only data-surface changes. Text, accent and borders re-scope themselves — no per-component logic anywhere."
      >
        <SemanticTokens />
      </Section>

      <Section
        number="03"
        title="Type scale"
        lede="Eight tokens, real copy. Squint test: hero, section, body and label must be unmistakably different in grayscale."
      >
        <TypeSpecimen />
      </Section>

      <Section
        number="04"
        title="Texture"
        lede="Paper grain on trial. It should be invisible as an effect — you only notice it when it leaves."
      >
        <GrainToggle />
      </Section>

      <Section
        number="05"
        title="Primitives"
        lede="Eyebrow, Button, TextLink, Rule, SectionSurface, Quote and the heart — every variant, stamped once per surface. Sections butt with the fine rule; no shadows between them."
        bleed
      >
        <PrimitivesShowcase />
      </Section>

      <Section
        number="06"
        title="Atmospheres"
        lede="The soft families as environments, not labels — sage for the garden, rose for the family, lavender for the evening. One dominant atmospheric accent per section; gold keeps meaning action in every room."
        bleed
      >
        <Atmospheres />
      </Section>

      <Section
        number="07"
        title="Contrast"
        lede="Every text/surface pair in use, measured in this browser against its own WCAG floor — 4.5:1 for body and functional text, 3:1 for metadata and non-text. Nothing ships below its floor."
      >
        <ContrastTable />
      </Section>

      <footer className="mx-auto max-w-5xl px-6 pt-16">
        <Rule variant="accent" />
        <p className="type-caption mt-4">
          Phase 1 approval artifact &middot; docs/DesignSystemP1.md &middot; hex values live in
          app/globals.css and are expected to be tuned here by eye.
        </p>
      </footer>
    </main>
  );
}
