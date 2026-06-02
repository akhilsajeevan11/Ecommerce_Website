import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * ColorSwatch — renders a small circular swatch for a given color value.
 *
 * The color value is used directly as a CSS `background-color` via an inline
 * style on the swatch circle. This is the ONLY allowed inline style in this
 * component — it is a dynamic value that cannot be expressed as a static
 * Tailwind class.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 9.4)
 *
 * @param {object} props
 * @param {string[]} [props.colors]   Array of CSS color strings (e.g. "#000", "Black", "rgb(…)")
 * @param {number}  [props.max=5]     Maximum swatches to show before "+N more" overflow
 * @param {string}  [props.className]
 */
const ColorSwatch = React.forwardRef(function ColorSwatch(
  { colors = [], max = 5, className, ...rest },
  ref
) {
  if (!colors || colors.length === 0) return null;

  const visible = colors.slice(0, max);
  const overflow = colors.length - visible.length;

  return (
    <div
      ref={ref}
      className={cn('flex items-center gap-1', className)}
      aria-label={`Available colors: ${colors.join(', ')}`}
      {...rest}
    >
      {visible.map((color, idx) => (
        <span
          key={`${color}-${idx}`}
          className="inline-block h-3 w-3 rounded-full border border-border ring-offset-background"
          style={{ backgroundColor: color }}
          title={color}
          aria-hidden="true"
        />
      ))}
      {overflow > 0 && (
        <span className="font-mono text-[0.625rem] text-muted-foreground leading-none">
          +{overflow}
        </span>
      )}
    </div>
  );
});

export { ColorSwatch };
export default ColorSwatch;
