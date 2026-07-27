import MaisonBlendedImage from '@/components/maison/MaisonBlendedImage';

// Artwork is an inline data-URI so cards render offline and never 404. It
// stands in for the painterly storybook illustrations the product ships,
// in the same cream/gold/sage palette.
const ART =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F7F0E3"/><stop offset="60%" stop-color="#EADCC2"/>
      <stop offset="100%" stop-color="#D8C199"/>
    </linearGradient>
    <radialGradient id="sun" cx="70%" cy="26%" r="26%">
      <stop offset="0%" stop-color="#FFF8E4"/><stop offset="100%" stop-color="#F3E9D8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="900" height="360" fill="url(#sky)"/>
  <circle cx="630" cy="94" r="120" fill="url(#sun)"/>
  <circle cx="630" cy="94" r="30" fill="#FFF3D6" opacity="0.9"/>
  <path d="M0 214 Q 150 158 300 200 T 600 186 T 900 208 L900 360 L0 360 Z" fill="#7C8770" opacity="0.5"/>
  <path d="M0 258 Q 200 214 420 250 T 900 258 L900 360 L0 360 Z" fill="#8B7355" opacity="0.5"/>
  <path d="M0 306 Q 260 276 520 300 T 900 306 L900 360 L0 360 Z" fill="#4A3B2A" opacity="0.45"/>
  <g fill="#4A3B2A" opacity="0.55">
    <path d="M120 246 l14 -46 l14 46 z"/><path d="M150 250 l10 -34 l10 34 z"/>
    <path d="M742 250 l16 -52 l16 52 z"/><path d="M776 254 l11 -36 l11 36 z"/>
  </g>
</svg>`);

export function Default() {
  return (
    <div style={{ height: 260 }}>
      <MaisonBlendedImage src={ART} alt="A warm painted horizon at dusk" />
    </div>
  );
}

export function FadeAllEdges() {
  return (
    <div style={{ height: 260 }}>
      <MaisonBlendedImage src={ART} alt="Artwork faded on every edge" fadeLeft fadeRight fadeTop fadeBottom />
    </div>
  );
}

export function StrongFade() {
  return (
    <div style={{ height: 260 }}>
      <MaisonBlendedImage src={ART} alt="Artwork dissolving heavily into the page" fadeStrength={70} />
    </div>
  );
}

export function NoFade() {
  return (
    <div style={{ height: 260 }}>
      <MaisonBlendedImage
        src={ART}
        alt="Artwork with the blending disabled"
        fadeLeft={false}
        fadeBottom={false}
      />
    </div>
  );
}
