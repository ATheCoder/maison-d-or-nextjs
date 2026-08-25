import type { Metadata } from 'next';
import { Container, Eyebrow, Heading, PageSection, Prose, Rule } from '@/components/ds';
import ContrastTable from './ContrastTable';
import Foundations from './Foundations';
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

export default function DesignPage() {
  return (
    <main className="min-h-screen bg-surface-page pb-24 text-primary">
      <Container as="header" className="pt-20 pb-4">
        <Eyebrow>Maison d&rsquo;Or&eacute; &middot; Phase one</Eyebrow>
        <Heading level={1} className="mt-6 max-w-[16em]">
          The design system, laid on the table.
        </Heading>
        <Prose className="mt-6">
          Tokens, typography, texture and the base primitives — everything Phase 1
          ships, on one page, on every surface: the warm light grounds the Maison
          breathes through, the four soft atmospheres, and the two cinematic
          interludes. Values are tuned by eye here first (in globals.css), then
          adopted by the rooms in later phases.
        </Prose>
        <Rule ornament className="mt-12" />
      </Container>

      <PageSection
        eyebrow="01 · Raw palette"
        lede="The full palette with name and hex, read live from the stylesheet — tune a value in globals.css and this page tells the truth about it."
      >
        <Swatches />
      </PageSection>

      <PageSection
        eyebrow="02 · Semantic tokens"
        lede="The same markup once per surface; only data-surface changes. Text, accent and borders re-scope themselves — no per-component logic anywhere."
      >
        <SemanticTokens />
      </PageSection>

      <PageSection
        eyebrow="03 · Type scale"
        lede="Eight tokens, real copy. Squint test: hero, section, body and label must be unmistakably different in grayscale."
      >
        <TypeSpecimen />
      </PageSection>

      <PageSection
        eyebrow="04 · Texture"
        lede="Paper grain on trial. It should be invisible as an effect — you only notice it when it leaves."
      >
        <GrainToggle />
      </PageSection>

      <PageSection
        eyebrow="05 · Primitives"
        lede="Eyebrow, Button, Field, TextLink, Rule, SectionSurface, Quote and the heart — every variant, stamped once per surface, and every stamp a full environment: parchment, then sage for the garden, rose for the family, lavender for the evening, periwinkle for the sky, then the two cinematic interludes. One dominant atmospheric accent per section; gold keeps meaning action and errors keep their terracotta (rose on the interludes) in every room. Sections butt with the fine rule; no shadows between them. Three primitives are stamped once rather than seven times, at the end: Overlay, because a dialog is page-level rather than surface-level; Heading without a size, because that is a mechanism and not a colour; and the glass Card, on the photograph it exists for. This page is the whole inventory of components/ds by design — if a primitive is not stamped here, the rooms have no business using it."
        bleed
      >
        <PrimitivesShowcase />
      </PageSection>

      <PageSection
        eyebrow="06 · Foundations"
        lede="Rules the primitives already obey, written down: the radius steps, the dress of a link, and the house timing — including what remains when a visitor asks for reduced motion. Radius values are read live from the stylesheet; the motion is demonstrated by the primitives themselves."
      >
        <Foundations />
      </PageSection>

      <PageSection
        eyebrow="07 · Contrast"
        lede="Every text/surface pair in use, measured in this browser against its own WCAG floor — 4.5:1 for body and functional text, 3:1 for metadata and non-text. Nothing ships below its floor."
      >
        <ContrastTable />
      </PageSection>

      <Container as="footer" className="pt-16">
        <Rule variant="accent" />
        <Prose variant="caption" measure={false} className="mt-4">
          Phase 1 approval artifact &middot; hex values live in
          app/globals.css and are expected to be tuned here by eye.
        </Prose>
      </Container>
    </main>
  );
}
