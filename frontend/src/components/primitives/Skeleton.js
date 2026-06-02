import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Layout-preserving loading placeholder.
 *
 * Skeletons preserve the destination's footprint via Tailwind utility classes
 * so that revealing real content adds zero CLS. The default surface is the
 * muted token (`bg-muted`) with a `animate-pulse` shimmer.
 *
 * For aspect-ratio-locked surfaces (image cards, gallery thumbs) callers should
 * wrap this primitive in an `aspect-[3/4]` (or similar) wrapper or set the
 * intended Tailwind size classes via `className`.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
const Skeleton = React.forwardRef(function Skeleton({ className, ...rest }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('bg-muted animate-pulse', className)}
      {...rest}
    />
  );
});

export { Skeleton };
export default Skeleton;
