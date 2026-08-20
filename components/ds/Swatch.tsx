import type { CSSProperties, ReactNode } from 'react';

/**
 * Swatch — a colour or surface sample over its name and a line of data: the
 * palette chips, the semantic surface chips, the radius steps. One block,
 * because all three are the same figure — a specimen, labelled, with a
 * measured value under it.
 *
 * The sample is given EITHER as `color` (any CSS colour value, typically a
 * var()) or as `sampleClassName` (a bg-* utility, when the thing on show is
 * a token Tailwind already maps). Both routes keep raw hex out of component
 * code, which §1.2 bans everywhere except the palette sheet itself — and
 * even there the hexes are read from the live stylesheet, never transcribed.
 *
 * `caption` sets tabular figures by default: captions here carry hex codes
 * and pixel values, which are aligned data (§2.3), and a column of them that
 * does not line up reads as a mistake in the values rather than the type.
 */
export default function Swatch({
  color,
  sampleClassName = '',
  height = 'md',
  radius = 'sm',
  bordered = true,
  label,
  caption,
  tabular = true,
  className = '',
  style,
}: {
  color?: string;
  sampleClassName?: string;
  height?: 'sm' | 'md';
  radius?: 'sm' | 'md' | 'lg';
  bordered?: boolean;
  label?: ReactNode;
  caption?: ReactNode;
  tabular?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const sample = [
    height === 'sm' ? 'h-10' : 'h-16',
    radius === 'sm' ? 'rounded-sm' : radius === 'md' ? 'rounded-md' : 'rounded-lg',
    bordered ? 'border border-fine' : '',
    sampleClassName,
  ].filter(Boolean).join(' ');
  return (
    <div className={className} style={style}>
      <div className={sample} style={color ? { backgroundColor: color } : undefined} />
      {label != null && <p className="type-body-ui mt-2 text-primary">{label}</p>}
      {caption != null && (
        <p className={`type-caption ${label == null ? 'mt-1 ' : ''}${tabular ? 'tabular-nums' : ''}`}>
          {caption}
        </p>
      )}
    </div>
  );
}
