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
 */
export { default as Button, buttonClasses } from './Button';
export { default as Card } from './Card';
export { default as Chip } from './Chip';
export { default as Container } from './Container';
export { default as Eyebrow } from './Eyebrow';
export { default as Field } from './Field';
export { default as Heading } from './Heading';
export { default as HeartToggle } from './HeartToggle';
export { default as Overlay } from './Overlay';
export { default as PageSection } from './PageSection';
export { default as Prose } from './Prose';
export { default as Quote } from './Quote';
export { default as Rule } from './Rule';
export { default as SectionSurface } from './SectionSurface';
export { default as Swatch } from './Swatch';
export { default as TextLink } from './TextLink';
export { default as ThemeDot } from './ThemeDot';
