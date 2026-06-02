import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Icon-only button. Renders a `<button>` whose only child is an icon glyph.
 *
 * Enforces a non-empty `aria-label` so screen-reader users can perceive the
 * action. In development a missing or empty `aria-label` triggers a
 * `console.error` (Requirement 15.4 — every icon-only button SHALL include a
 * non-empty `aria-label`).
 *
 * @param {object} props
 * @param {string} props["aria-label"]                  - REQUIRED. Non-empty.
 * @param {"sm"|"md"|"lg"} [props.size="md"]
 * @param {"default"|"ghost"|"outline"} [props.variant="ghost"]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const VARIANT_CLASSES = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  ghost: 'bg-transparent text-foreground hover:bg-accent',
  outline: 'border border-input bg-background text-foreground hover:bg-accent',
};

const IconButton = React.forwardRef(function IconButton(
  { className, size = 'md', variant = 'ghost', type = 'button', children, ...rest },
  ref
) {
  const ariaLabel = rest['aria-label'];
  if (process.env.NODE_ENV !== 'production') {
    if (typeof ariaLabel !== 'string' || ariaLabel.trim() === '') {
      // eslint-disable-next-line no-console
      console.error(
        '[IconButton] `aria-label` is required and must be a non-empty string. ' +
          'Icon-only buttons are unreachable for screen-reader users without one.'
      );
    }
  }

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.ghost,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export { IconButton };
export default IconButton;
