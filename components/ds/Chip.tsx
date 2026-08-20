import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';

/**
 * Chip — a small bordered pellet of UI text: a tag, a legend key, a colour
 * sample, a state badge. body-ui ink on the fine hairline at radius-sm, the
 * step §3.4 reserves for "chips, swatches, small tags".
 *
 * It is not a Button and must never be given a click handler dressed as one:
 * a chip that does something is a Button with a className, so it inherits the
 * house choreography and focus ring. Chip is inert by design — the only
 * interactive thing it carries is `as="label"` in a form.
 *
 * Kept deliberately thin: no tone prop. A chip that needs a ground is a Card
 * with `padding="sm"`, and a chip that needs colour (the contrast table's
 * samples) states it in `style`, because those colours are the thing being
 * measured, not a variant of the primitive.
 */
export default function Chip({
  bordered = true,
  as: Tag = 'span' as ElementType,
  className = '',
  style,
  children,
  ...rest
}: {
  bordered?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  const classes = [
    'type-body-ui inline-flex items-center gap-2 rounded-sm px-3 py-1.5',
    bordered ? 'border border-fine' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <Tag className={classes} style={style} {...rest}>
      {children}
    </Tag>
  );
}
