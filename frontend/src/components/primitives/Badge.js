import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Small label/tag rendered on product cards, gallery overlays, and cart lines.
 *
 * Variants:
 *  - `default`     — neutral (foreground on background)
 *  - `featured`    — primary (black on white inverse)
 *  - `sale`        — destructive (used for discount markers)
 *  - `outOfStock`  — muted, signals unavailability
 *  - `lowStock`    — warning (zinc-amber)
 *  - `success`     — success (free shipping unlocked, etc.)
 *
 * Renders a non-interactive `<span>` by default. Sharp edges (no rounded
 * corners) match the NOIR brand language; the only exception is `pill` which
 * is reserved for badge dots over images.
 *
 * @param {object} props
 * @param {"default"|"featured"|"sale"|"outOfStock"|"lowStock"|"success"} [props.variant="default"]
 * @param {"square"|"pill"} [props.shape="square"]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
const VARIANT_CLASSES = {
  default: 'bg-foreground text-background',
  featured: 'bg-primary text-primary-foreground',
  sale: 'bg-destructive text-destructive-foreground',
  outOfStock: 'bg-muted text-muted-foreground',
  lowStock: 'bg-warning text-warning-foreground',
  success: 'bg-success text-success-foreground',
};

const SHAPE_CLASSES = {
  square: 'rounded-none',
  pill: 'rounded-full',
};

const Badge = React.forwardRef(function Badge(
  { variant = 'default', shape = 'square', className, children, ...rest },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center font-mono text-[0.6875rem] uppercase tracking-[0.1em] px-2 py-1 leading-none',
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.default,
        SHAPE_CLASSES[shape] || SHAPE_CLASSES.square,
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
});

export { Badge };
export default Badge;
