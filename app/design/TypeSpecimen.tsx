/**
 * §5.3 — the complete §2.2 scale with real Maison d'Oré copy, never lorem
 * ipsum. Specimens are <p>, not <h*>: the legacy unlayered h1–h6 rules in
 * globals.css (Playfair, 0.08em tracking, --brown) beat the layered type-*
 * utilities on real heading tags, and this sheet must show the tokens exactly.
 * The grayscale test from §2.2 applies: hero, section, body and label must be
 * unmistakably different at a glance.
 */
const SPECIMENS: { token: string; spec: string; className: string; copy: string }[] = [
  {
    token: 'display-hero',
    spec: 'Fraunces 600 · opsz max · lh 1.05 · ls −0.015em',
    className: 'type-display-hero text-primary',
    copy: 'A new little corner of the world is waiting.',
  },
  {
    token: 'display-section',
    spec: 'Fraunces 560 · lh 1.15',
    className: 'type-display-section text-primary',
    copy: 'This morning the Maison opens in Marrakesh',
  },
  {
    token: 'display-story',
    spec: 'Fraunces 540 · lh 1.25',
    className: 'type-display-story text-primary',
    copy: 'The saffron harvest begins before sunrise',
  },
  {
    token: 'body',
    spec: 'Instrument Sans 400 · lh 1.65',
    className: 'type-body text-primary',
    copy:
      'Each morning the Daily Gold arrives like a small newspaper from somewhere else: one destination, the remarkable lives born on this day, and a piece of news worth telling a child over breakfast.',
  },
  {
    token: 'body-ui',
    spec: 'Instrument Sans 450 · lh 1.5',
    className: 'type-body-ui text-primary',
    copy: 'Save to the treasury · Continue reading · Ask me again tomorrow',
  },
  {
    token: 'label-editorial',
    spec: 'Instrument Sans 560 · uppercase · ls 0.14em',
    className: 'type-label-editorial text-accent',
    copy: 'Where in the world',
  },
  {
    token: 'quote',
    spec: 'Fraunces Italic 460 · lh 1.45',
    className: 'type-quote text-primary',
    copy: 'The house smelled of cedar and far-away rain.',
  },
  {
    token: 'caption',
    spec: 'Instrument Sans 400 · text-secondary',
    className: 'type-caption',
    copy: 'The harbour at Essaouira, photographed a little after dawn.',
  },
];

export default function TypeSpecimen() {
  return (
    <div>
      {SPECIMENS.map(({ token, spec, className, copy }) => (
        <div key={token} className="border-b border-fine py-6 first:pt-0 last:border-b-0">
          <p className="type-caption mb-3">
            {token} <span className="text-faint">— {spec}</span>
          </p>
          <p className={`max-w-[38rem] ${className}`}>{copy}</p>
        </div>
      ))}

      {/* §2.3 numerals: oldstyle where decorative, tabular in aligned data. */}
      <div className="pt-6">
        <p className="type-caption mb-3">
          numerals <span className="text-faint">— Fraunces oldstyle (decorative) vs tabular (aligned data)</span>
        </p>
        <p
          className="type-display-story text-primary"
          style={{ fontVariantNumeric: 'oldstyle-nums' }}
        >
          Born on 14 March 1879 · 226 countries · 365 mornings
        </p>
        <div
          className="type-body-ui mt-3 max-w-56 text-secondary"
          style={{ fontFamily: 'var(--face-display)', fontVariantNumeric: 'tabular-nums' }}
        >
          <p className="flex justify-between"><span>Stories kept</span> <span>1,048</span></p>
          <p className="flex justify-between"><span>Flags raised</span> <span>87</span></p>
          <p className="flex justify-between"><span>Mornings</span> <span>365</span></p>
        </div>
      </div>
    </div>
  );
}
