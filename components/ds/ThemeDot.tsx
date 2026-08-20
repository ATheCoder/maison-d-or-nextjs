import type { ThemeKey } from '@/lib/theme-keys';

/**
 * ThemeDot — the coloured dot a theme picker shows beside a theme's name
 * (the onboarding wizard, the edition's switcher, the /design gallery).
 *
 * The colour comes from --theme-swatch, which every [data-theme] block in
 * globals.css re-points at its own family's mid tone. That is the whole
 * trick: the dot carries `data-theme` and reads one var, so a picker needs
 * no JS colour map — and when the JS palettes were deleted in favour of CSS
 * scopes, pickers built this way did not notice.
 *
 * aria-hidden: the dot is a redundant restatement of the theme name it sits
 * beside. A picker that shows the dot alone would need a label of its own.
 */
const SIZE = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
} as const;

export default function ThemeDot({
  theme,
  size = 'md',
  className = '',
}: {
  theme: ThemeKey;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-theme={theme}
      className={`inline-block shrink-0 rounded-full border border-fine ${SIZE[size]} ${className}`}
      style={{ background: 'var(--theme-swatch)' }}
    />
  );
}
