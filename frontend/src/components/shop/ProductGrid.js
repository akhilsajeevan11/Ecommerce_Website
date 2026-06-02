import * as React from 'react';
import ProductCard from '../ProductCard';
import Skeleton from '../primitives/Skeleton';
import EmptyShopState from './EmptyShopState';
import { cn } from '../../lib/utils';

/**
 * ProductGrid — the responsive grid that renders product cards on the
 * Shop_Page (and reused by Featured/Curated collections elsewhere).
 *
 * Spec: Requirement 6.10, 6.11, 14.9
 *   - While the Products_API request is in flight, render 12 skeleton
 *     cards that preserve the grid's aspect ratio — Tailwind
 *     `aspect-[3/4]` matches ProductCard's image footprint so reveal
 *     contributes 0 CLS.
 *   - When the response is empty (and the fetch has completed), render
 *     `<EmptyShopState clearAll={clearAll} />`.
 *
 * Density:
 *   - "comfy" → 1-col mobile, 2-col `sm:`, 3-col `lg:` (default)
 *   - "compact" → 1-col mobile, 2-col `sm:`, 3-col `lg:`, 4-col `xl:`
 *
 * Props:
 *   `items` is the canonical list of product objects (per Products_API
 *   `items[]`). `isLoading` drives the skeleton view. `clearAll` is
 *   forwarded to the empty state. `density` is supplied by the
 *   Shop_Page's local DensityToggle.
 *
 * a11y posture:
 *   - The grid is a plain `<ul>` with `<li>` items so screen-readers can
 *     announce list semantics. Each ProductCard renders a `<Link>` so the
 *     primary affordance is correctly conveyed.
 *   - Skeletons set `aria-hidden="true"` (via the Skeleton primitive) and
 *     the wrapper carries `aria-busy="true"` while loading so AT users
 *     hear a single "loading" announcement.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {Array<object>} [props.items]
 * @param {boolean} [props.isLoading]
 * @param {() => void} [props.clearAll]
 * @param {"comfy"|"compact"} [props.density="comfy"]
 * @param {number} [props.skeletonCount=12]
 * @param {string} [props.className]
 */
function ProductGrid({
  items,
  isLoading,
  clearAll,
  density = 'comfy',
  skeletonCount = 12,
  className,
  ...rest
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const gridClasses = density === 'compact' ? COMPACT_GRID : COMFY_GRID;

  if (isLoading) {
    return (
      <ul
        aria-busy="true"
        aria-live="polite"
        className={cn('grid w-full', gridClasses, className)}
        data-testid="product-grid-loading"
        {...rest}
      >
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <li key={`skeleton-${idx}`} className="flex flex-col gap-3">
            {/* Image skeleton — preserves the 3/4 footprint of the real
                ProductCard image so layout doesn't shift on reveal. */}
            <Skeleton className="aspect-[3/4] w-full" />
            <div className="flex flex-col gap-2 px-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
              <div className="mt-1 flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (safeItems.length === 0) {
    return <EmptyShopState clearAll={clearAll} className={className} />;
  }

  return (
    <ul
      className={cn('grid w-full', gridClasses, className)}
      data-testid="product-grid"
      {...rest}
    >
      {safeItems.map((product) => (
        <li key={product.id ?? product.slug ?? product.name} className="min-w-0">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

// Density variants. Both share the mobile (1-col) and `sm:` (2-col) base.
// Comfy peaks at 3-col on `lg+`. Compact adds a 4-col stop at `xl+` so wider
// screens can show more density without the cards becoming cramped on
// mid-range desktops.
const BASE_GAP = 'gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:gap-x-6 lg:gap-y-12';
const COMFY_GRID = `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${BASE_GAP}`;
const COMPACT_GRID = `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${BASE_GAP}`;

export { ProductGrid };
export default ProductGrid;
