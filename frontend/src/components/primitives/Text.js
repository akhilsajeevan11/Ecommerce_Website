import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Body-text primitive with NOIR's three text registers:
 *  - `body`    — Manrope at 1rem, the default reading face
 *  - `caption` — JetBrains Mono at 0.75rem, used for tags and meta lines
 *  - `mono`    — JetBrains Mono at 0.875rem, used for prices and labels
 *  - `micro`   — JetBrains Mono at 0.6875rem, used for badges
 *
 * Renders a `<p>` by default; override via `as` for inline contexts (`span`).
 *
 * @param {object} props
 * @param {"p"|"span"|"div"} [props.as="p"]
 * @param {"body"|"caption"|"mono"|"micro"} [props.variant="body"]
 * @param {"default"|"muted"|"foreground"} [props.tone="default"]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
const VARIANT_CLASSES = {
  body: 'font-body text-base leading-relaxed',
  caption: 'font-mono text-xs uppercase tracking-[0.15em] leading-snug',
  mono: 'font-mono text-sm leading-snug',
  micro: 'font-mono text-[0.6875rem] uppercase tracking-[0.1em] leading-tight',
};

const TONE_CLASSES = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  foreground: 'text-foreground',
};

const Text = React.forwardRef(function Text(
  { as = 'p', variant = 'body', tone = 'default', className, children, ...rest },
  ref
) {
  const Tag = as;
  return (
    <Tag
      ref={ref}
      className={cn(VARIANT_CLASSES[variant] || VARIANT_CLASSES.body, TONE_CLASSES[tone] || TONE_CLASSES.default, className)}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export { Text };
export default Text;
