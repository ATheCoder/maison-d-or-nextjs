/**
 * The design-system primitives. Import from
 * the barrel — `import { Card, Heading, Prose } from '@/components/ds'` —
 * so a call site names what it uses rather than where it lives.
 *
 * Everything here is surface-scoped: the same markup is correct on
 * parchment, in the four soft atmospheres and on the two cinematic
 * interludes, with no per-surface props. Nothing here may carry a raw
 * --palette-* value or a hex literal; if a primitive needs a colour it does
 * not have, the answer is a semantic token in globals.css, not a prop.
 *
 * There is exactly one carve-out, and it is Avatar. The child emblems in
 * lib/avatars.ts are CONTENT — an illustration table, the way a photograph's
 * pixels are — not palette, and they must NOT re-scope: a fox on peach is a
 * fox on peach in the evening room too. Everything the house owns about that
 * component (the ring, the monogram's ground and ink) is still a token. A
 * second entry on this line should have to be argued for.
 */
export { default as Avatar } from './Avatar';
export { default as Button, buttonClasses } from './Button';
export { default as Card } from './Card';
export { default as Chip } from './Chip';
export { default as Code } from './Code';
export { default as Confirm } from './Confirm';
export { default as Container } from './Container';
export { default as Eyebrow } from './Eyebrow';
export { default as Field } from './Field';
export { default as FieldShell } from './FieldShell';
export type { FieldControlProps } from './FieldShell';
export { default as Heading } from './Heading';
export { default as HeartToggle } from './HeartToggle';
export { default as ListRow } from './ListRow';
export { default as Meter } from './Meter';
export { default as Note } from './Note';
export { default as Overlay } from './Overlay';
export { default as PageHeader } from './PageHeader';
export { default as PageSection } from './PageSection';
export { default as Prose } from './Prose';
export { default as Quote } from './Quote';
export { default as Rule } from './Rule';
export { default as SectionSurface } from './SectionSurface';
export { default as SelectPill, selectPillClasses } from './SelectPill';
export { default as Stat } from './Stat';
export { default as Swatch } from './Swatch';
export { default as TextLink } from './TextLink';
export { default as ThemeDot } from './ThemeDot';
