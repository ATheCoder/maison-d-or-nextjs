'use client';
/**
 * DGMoreToExplore — the closed rooms: parts of the Maison that have not opened
 * yet, hung dimmed rather than dressed up as cards.
 *
 * Brightness and a scrim say "not open" more plainly than a "coming soon"
 * eyebrow on a fully lit card does — and, unlike a card, a dimmed work cannot
 * be mistaken for something to press. The dimming is in GALLERY_CSS because it
 * has to invert: a closed room fades TOWARDS the wall, which on the five lit
 * grounds means brighter, not darker.
 *
 * These destinations are not routes yet: /escapes, /academy and /recipes do
 * not exist in app/. `path` and `prompt` stay as authored intent for the day
 * they do.
 */
import Wall from '@/components/dailygold/gallery/Wall';
import Work from '@/components/dailygold/gallery/Work';
import Label from '@/components/dailygold/gallery/Label';

// The real Daily Gold house style. Nothing here renders any more — it is kept
// as the source of truth for lib/daily-gold/prompts.ts, which harvests it, and
// for the per-room scene text below it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MASTER_STYLE = "Fine art oil painting, luminous and painterly, in the style of a luxurious illustrated storybook. Rich warm natural light, soft visible brushstrokes, depth and atmosphere, golden hour glow. Warm cream, gold, sage, and earth tones. Elegant, serene, emotionally warm, museum-quality illustration. Soft focus background, beautiful composition. NOT flat, NOT cartoon, NOT vector, NOT simple graphic art. Oil on canvas texture, fine detail, painterly realism with a dreamy quality. No text, no watermarks, no logos.";

// The composition every closed room is painted against. It is not the same ask
// as lib/daily-gold/prompts.ts makes of a live wall: these three hang small,
// three across at roughly 370px, and they hang DIMMED — `.gl-cw` lays a 55%
// page-coloured scrim over the paint and pulls saturation to 0.82 on the five
// lit grounds, and drops brightness to 0.55 on dark and navy (galleryCss.ts).
// Art that carries on fine detail or delicate colour dies under that; art built
// on big shapes and a wide gap between its lights and darks survives it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CLOSED_COMPOSITION = "Landscape composition filling a 4:3 frame completely, edge to edge, with no empty margin, no vignette and no dead band anywhere. One clear subject, centred and kept well inside the frame: the image is centre-cropped, so the outer left and right edges are the first thing lost. It is hung small, about 370 pixels wide, and shown deliberately faded beneath a pale wash with its colour pulled down, so build the picture on large simple shapes and a strong difference between its lights and its darks rather than on fine detail or subtle colour. A soft warm sheen already falls across the upper-left corner of the frame, so keep the brightest passage of the painting out of that corner. No close-up faces, nothing busy or cluttered. No frame, no border, no text, no lettering, no numerals, no handwriting that could be read, no signature.";

// Rendered with openai/gpt-image-2 at quality "low", 1536x1152 — already 4:3,
// so the frame's cover-crop takes nothing off the sides. Compressed to WebP at
// q82 (8.37MB -> 578KB for the three); the source PNGs are kept in
// art/originals/dg/, which is gitignored and outside public/ so they are
// neither served nor deployed. Same convention as scripts/compress-story-images.mjs.
const CLOSED_ROOMS = [
  {
    label: 'Golden Escapes',
    description: 'Dream destinations for curious hearts',
    path: '/escapes',
    prompt: `A child of about seven kneeling on a warm wooden floor in a pool of low lamplight, an enormous old world map unrolled open in front of them, its corners held down by a brass compass and a smooth grey stone. A small leather suitcase waits in the soft shadow behind. The map is painted as coastlines, warm ochre landmasses and pale sea — its markings are painterly marks only, with no readable words or names anywhere on it. Seen from slightly above and behind the child, so the map is the largest and brightest shape in the picture and the child reads as a small dark silhouette leaning into it.`,
    image_url: '/dg/golden-escapes.webp',
  },
  {
    label: 'Languages',
    description: 'One word a day opens a new world',
    path: '/academy',
    prompt: `A still life on a wide windowsill in late golden afternoon light: one large book lying open, a fountain pen resting across the gutter, a small glass inkwell catching the sun and throwing a long warm shadow across the pages, a few loose sheets stacked beside it. The ink on the open pages is only a soft suggestion of strokes and never resolves into letters or words — no readable writing, no alphabet, no characters of any kind. The open book fills most of the frame; behind it the window is warm haze.`,
    image_url: '/dg/languages.webp',
  },
  {
    label: 'Recipes',
    description: 'Taste the world together',
    path: '/recipes',
    prompt: `A scrubbed wooden kitchen table in warm Mediterranean midday light, laid for a family meal and seen from a high three-quarter angle: a wide shallow bowl of ripe tomatoes, a glass jug of green-gold olive oil, a torn round loaf on a board, a bunch of fresh herbs, two simple ceramic plates and a folded linen cloth. No people and no hands. Big generous shapes in warm red, ochre, cream and sage against the dark wood, with strong sunlight and clear soft shadows falling across the table.`,
    image_url: '/dg/recipes.webp',
  },
];

export default function DGMoreToExplore() {
  return (
    <Wall
      eyebrow="Coming soon to the journey"
      title="Rooms not yet open"
      lede="Dimmed rather than removed, and not doors. New rooms of the Maison, opening soon."
    >
      <div className="gl-closed">
        {CLOSED_ROOMS.map((room) => (
          <div className="gl-cw" key={room.path}>
            {/* No href, no onClick: a closed room is not a door, so the frame
                is not a control. */}
            <Work aspect="4 / 3" imageUrl={room.image_url} />
            <Label title={room.label} subtitle={room.description} meta="Coming soon" />
          </div>
        ))}
      </div>
    </Wall>
  );
}
