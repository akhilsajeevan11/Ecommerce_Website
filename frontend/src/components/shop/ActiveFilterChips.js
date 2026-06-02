import * as React from 'react';
import { X } from 'lucide-react';
import { defaultShopParams } from '../../lib/shopQuery';
import { formatPrice } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/**
 * ActiveFilterChips — renders one dismissible chip per non-default value of
 * ShopParams, plus a "Clear all" action.
 *
 * Spec: Requirement 6.9
 *   - One chip per element of `category`, `sizes`, and `colors`
 *   - One chip for the price range (`min`/`max`)
 *   - One chip for `rating`
 *   - One chip for `inStock`
 *   - One chip for `q`
 *   - "Clear all" sets ShopParams back to `defaultShopParams` via the
 *     `clearAll` callback (which the parent page connects to
 *     `useShopQuery.clearAll`).
 *
 * Removal semantics:
 *   - Removing an array-element chip (category/size/color) drops just that
 *     element via `setParams({ [field]: nextArray })`.
 *   - Removing the price chip resets both `min` and `max` to null.
 *   - Removing rating/inStock/q resets that single field to its default.
 *
 * a11y posture:
 *   - Each chip is a `<button>` whose accessible label spells out the
 *     action ("Remove category Hoodie") so screen-reader users hear what
 *     will happen, not just "× Hoodie".
 *   - Focus-visible ring on each chip and on the Clear-all action.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {import('../../lib/shopQuery').ShopParams} props.params
 * @param {(patch: Partial<import('../../lib/shopQuery').ShopParams>) => void} [props.setParams]
 * @param {() => void} [props.clearAll]
 * @param {string} [props.className]
 */
function ActiveFilterChips({ params, setParams, clearAll, className, ...rest }) {
  const safeParams = params || defaultShopParams;
  const chips = buildChips(safeParams, setParams);

  if (chips.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Active filters"
      className={cn('flex flex-wrap items-center gap-2', className)}
      data-testid="active-filter-chips"
      {...rest}
    >
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          aria-label={chip.ariaLabel}
          className="inline-flex h-8 items-center gap-2 border border-border bg-background px-3 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid={`filter-chip-${chip.id}`}
        >
          <span className="leading-none">{chip.label}</span>
          <X className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
        </button>
      ))}

      {typeof clearAll === 'function' ? (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-8 items-center px-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="filter-chip-clear-all"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}

/**
 * Format the price chip label. Both `min` and `max` may be null. The chip
 * is rendered only when at least one bound is set (the caller filters this
 * out before reaching the formatter).
 */
function formatPriceChipLabel(min, max) {
  if (min !== null && max !== null) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (min !== null) return `${formatPrice(min)} +`;
  if (max !== null) return `Up to ${formatPrice(max)}`;
  return '';
}

/**
 * Build the chip descriptors from a ShopParams object. Each descriptor is
 * `{ id, label, ariaLabel, onRemove }`. Removal callbacks use `setParams`
 * which dispatches through `useShopQuery` and resets `page` to 1 (handled
 * by the hook's non-pagination patch logic).
 *
 * Exported for unit testing (see `__tests__/activeFilterChips.test.js` if/when
 * added). Not part of the public component API.
 */
export function buildChips(params, setParams) {
  const chips = [];
  const set = typeof setParams === 'function' ? setParams : () => {};

  // q — search text chip
  if (typeof params.q === 'string' && params.q !== '') {
    chips.push({
      id: 'q',
      label: `“${params.q}”`,
      ariaLabel: `Remove search ${params.q}`,
      onRemove: () => set({ q: null }),
    });
  }

  // Multi-value string filters: category / sizes / colors.
  // One chip per element so users can drop a single value without
  // re-selecting the rest of the group.
  ['category', 'sizes', 'colors'].forEach((field) => {
    const arr = Array.isArray(params[field]) ? params[field] : [];
    arr.forEach((val) => {
      const singular = field === 'sizes' ? 'size' : field === 'colors' ? 'color' : 'category';
      chips.push({
        id: `${field}:${val}`,
        label: val,
        ariaLabel: `Remove ${singular} ${val}`,
        onRemove: () => set({ [field]: arr.filter((v) => v !== val) }),
      });
    });
  });

  // Price range — single chip for the (min, max) tuple.
  if (params.min !== null || params.max !== null) {
    chips.push({
      id: 'price',
      label: formatPriceChipLabel(params.min, params.max),
      ariaLabel: 'Remove price filter',
      onRemove: () => set({ min: null, max: null }),
    });
  }

  // Rating — single chip ("4★ & up").
  if (params.rating !== null && params.rating !== undefined) {
    chips.push({
      id: 'rating',
      label: `${params.rating}★ & up`,
      ariaLabel: `Remove rating filter ${params.rating} and up`,
      onRemove: () => set({ rating: null }),
    });
  }

  // In stock — single chip.
  if (params.inStock === true) {
    chips.push({
      id: 'inStock',
      label: 'In stock',
      ariaLabel: 'Remove in stock filter',
      onRemove: () => set({ inStock: false }),
    });
  }

  return chips;
}

export { ActiveFilterChips };
export default ActiveFilterChips;
