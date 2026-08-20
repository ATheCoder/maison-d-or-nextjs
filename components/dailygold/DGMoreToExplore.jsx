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

const CLOSED_ROOMS = [
  {
    label: 'Golden Escapes',
    description: 'Dream destinations for curious hearts',
    path: '/escapes',
    prompt: `A child looking at a glowing world map with golden compass, warm adventure atmosphere`,
    image_url: null,
  },
  {
    label: 'Languages',
    description: 'One word a day opens a new world',
    path: '/academy',
    prompt: `Beautiful handwritten letters and ink, warm golden light, book pages, magical atmosphere`,
    image_url: null,
  },
  {
    label: 'Recipes',
    description: 'Taste the world together',
    path: '/recipes',
    prompt: `Beautiful Mediterranean food spread, warm colours, golden light, painterly style`,
    image_url: null,
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
