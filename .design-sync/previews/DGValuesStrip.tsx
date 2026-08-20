import DGValuesStrip from '@/components/dailygold/DGValuesStrip';
import { GALLERY_CSS } from '@/components/dailygold/galleryCss';

// The five words the Maison is for, in gold caps at the tail of the gallery.
// No props — the words are the component. It was a tinted band with a gradient
// hairline between each word; on a gallery wall the words sit on the same
// ground as everything else with nothing drawn around them, which is why this
// story supplies the ground and GALLERY_CSS rather than a container.

export function Values() {
  return (
    <div className="gl" style={{ background: 'var(--surface-page)', padding: '2rem 0' }}>
      <style>{GALLERY_CSS}</style>
      <DGValuesStrip />
    </div>
  );
}
