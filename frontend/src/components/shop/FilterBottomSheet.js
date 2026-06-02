import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { FilterControls, DEFAULT_SIZES, DEFAULT_COLORS } from './FilterSidebar';
import { defaultShopParams } from '../../lib/shopQuery';
import { cn } from '../../lib/utils';

/**
 * FilterBottomSheet — mobile filter sheet for the Shop_Page.
 *
 * Spec: Requirement 6.8
 *   - Below the `lg` breakpoint, the Shop_Page renders a "Filter" trigger
 *     button that opens this sheet.
 *   - The sheet renders the same controls as the FilterSidebar (we reuse
 *     `<FilterControls />` so the two views never drift).
 *
 * Implementation:
 *   - Built on Radix Dialog via the shadcn `<Sheet>` wrapper. Side is
 *     `bottom` so the sheet slides up from below — matches the e-commerce
 *     mobile-pattern of bottom-sheet filters.
 *   - The trigger and the sheet are both hidden at `lg+` so the sticky
 *     sidebar takes over without doubling up the controls.
 *   - The trigger shows an active-filter count chip when at least one
 *     non-default field is set, so users see at-a-glance how many filters
 *     are applied without opening the sheet.
 *
 * a11y posture (design.md a11y table):
 *   - Radix Dialog provides `role="dialog"`, `aria-modal="true"`, focus
 *     trap, and Escape-to-close for free.
 *   - The header carries the `<SheetTitle>` so AT users hear "Filters" on
 *     open.
 *   - The trigger is a real `<button>` with a focus-visible ring.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {import('../../lib/shopQuery').ShopParams} props.params
 * @param {<K extends keyof import('../../lib/shopQuery').ShopParams>(key: K, value: import('../../lib/shopQuery').ShopParams[K]) => void} [props.setParam]
 * @param {(patch: Partial<import('../../lib/shopQuery').ShopParams>) => void} [props.setParams]
 * @param {() => void} [props.clearAll]
 * @param {Array<{id: string|number, name: string, slug?: string, product_count?: number}>} [props.availableCategories]
 * @param {string[]} [props.availableSizes]
 * @param {Array<{name: string, hex?: string}|string>} [props.availableColors]
 * @param {[number, number]} [props.priceBounds]
 * @param {string} [props.className]
 */
function FilterBottomSheet({
  params,
  setParam,
  setParams,
  clearAll,
  availableCategories,
  availableSizes = DEFAULT_SIZES,
  availableColors = DEFAULT_COLORS,
  priceBounds = [0, 10000],
  className,
  ...rest
}) {
  const safeParams = params || defaultShopParams;
  const activeCount = countActiveFilters(safeParams);

  return (
    <div className={cn('lg:hidden', className)} data-testid="filter-bottom-sheet" {...rest}>
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-between border border-border bg-background px-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="filter-bottom-sheet-trigger"
            aria-label={
              activeCount > 0
                ? `Open filters, ${activeCount} active`
                : 'Open filters'
            }
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Filter</span>
            </span>
            {activeCount > 0 ? (
              <span
                className="inline-flex h-5 min-w-[1.25rem] items-center justify-center bg-foreground px-1.5 font-mono text-[0.625rem] font-semibold text-background"
                aria-hidden="true"
              >
                {activeCount}
              </span>
            ) : null}
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="flex max-h-[85vh] flex-col gap-0 rounded-none border-t border-border p-0"
        >
          <SheetHeader className="border-b border-border px-4 py-4 text-left sm:text-left">
            <SheetTitle className="font-heading text-2xl font-bold text-foreground">
              Filters
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
            <FilterControls
              params={safeParams}
              setParam={setParam}
              setParams={setParams}
              availableCategories={availableCategories}
              availableSizes={availableSizes}
              availableColors={availableColors}
              priceBounds={priceBounds}
            />
          </div>

          {/* Footer: Clear all + Close. The Sheet's native close button
              (top-right "X") still works; this row gives the customer a
              comfortable thumb target on mobile. */}
          <div className="flex items-center gap-3 border-t border-border bg-background px-4 py-3">
            <button
              type="button"
              onClick={() => {
                if (typeof clearAll === 'function') clearAll();
              }}
              disabled={activeCount === 0}
              className="inline-flex h-11 flex-1 items-center justify-center border border-border bg-background font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="filter-bottom-sheet-clear"
            >
              Clear all
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/**
 * Count the number of active (non-default) filter fields in a ShopParams
 * object. The trigger chip uses this count, so users see at-a-glance how
 * many filters are applied without opening the sheet.
 *
 * Counting rules (mirrors ActiveFilterChips.buildChips):
 *   - q (search) counts as one
 *   - each element of category / sizes / colors counts as one
 *   - the (min, max) tuple counts as one
 *   - rating counts as one
 *   - inStock counts as one
 *
 * Exported for unit testing if/when added.
 */
export function countActiveFilters(params) {
  if (!params) return 0;
  let n = 0;
  if (typeof params.q === 'string' && params.q !== '') n += 1;
  if (Array.isArray(params.category)) n += params.category.length;
  if (Array.isArray(params.sizes)) n += params.sizes.length;
  if (Array.isArray(params.colors)) n += params.colors.length;
  // Price (min/max) counts as a single filter chip — matches ActiveFilterChips.
  if (
    (params.min !== null && params.min !== undefined) ||
    (params.max !== null && params.max !== undefined)
  ) {
    n += 1;
  }
  if (params.rating !== null && params.rating !== undefined) n += 1;
  if (params.inStock === true) n += 1;
  return n;
}

export { FilterBottomSheet };
export default FilterBottomSheet;
