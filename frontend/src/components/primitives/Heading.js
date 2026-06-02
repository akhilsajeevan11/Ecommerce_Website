import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Semantic heading primitive bound to the NOIR Bodoni Moda display family.
 *
 * Renders one of `h1`–`h6` (chosen via `as`) with a Tailwind size scale that
 * mirrors `noir.tokens.js` `fontSize` keys. Visual size is independent of
 * semantic level so a marketing `h2` can render at display scale without
 * sacrificing document outline.
 *
 * @param {object} props
 * @param {"h1"|"h2"|"h3"|"h4"|"h5"|"h6"} [props.as="h2"]
 * @param {"display"|"h1"|"h2"|"h3"} [props.size="h2"] - Visual size; defaults to match `as`.
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
const SIZE_CLASSES = {
  display: 'text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-tight',
  h1: 'text-[clamp(2rem,5vw,4rem)] leading-none tracking-tight',
  h2: 'text-[clamp(1.5rem,3vw,2.5rem)] leading-tight tracking-tight',
  h3: 'text-xl leading-snug',
};

const Heading = React.forwardRef(function Heading(
  { as = 'h2', size, className, children, ...rest },
  ref
) {
  const Tag = as;
  const visualSize = size || (SIZE_CLASSES[as] ? as : 'h2');
  return (
    <Tag
      ref={ref}
      className={cn(
        'font-heading font-bold text-foreground',
        SIZE_CLASSES[visualSize] || SIZE_CLASSES.h2,
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export { Heading };
export default Heading;
