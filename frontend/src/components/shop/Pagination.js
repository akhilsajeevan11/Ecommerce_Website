import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Pagination — accessible numbered page-link nav for the Product_Grid.
 *
 * Spec: Requirement 6.13, 15.7
 *   - Renders inside `<nav aria-label="Pagination">`.
 *   - Applies `aria-current="page"` to the current page link.
 *   - Disables previous when on page 1, disables next when on the last page.
 *   - Compresses long ranges with ellipses so we render at most ~7 page
 *     links (1 … current-1 current current+1 … last) — matches the
 *     pseudocode in design.md ("Renders 1..totalPages with truncation:
 *     1 … 4 5 6 … 12").
 *
 * Property 4 (Pagination preserves total and is duplicate-free) is enforced
 * upstream by the backend (stable secondary `Product.id ASC` sort key, see
 * Requirement 7.6) and by `useShopQuery` clamping `page` to ≥ 1. This
 * component contributes the navigational half: every page from 1 to
 * `totalPages` is reachable from any starting page (via prev/next or
 * the numbered links), and the same page is never selectable twice.
 *
 * a11y posture (design.md a11y table):
 *   - The wrapping `<nav>` exposes the region.
 *   - The current page link uses `aria-current="page"` and is rendered as
 *     a `<span>` (non-interactive) so AT users hear "current page, 3" and
 *     don't get the misleading affordance of clicking the page they're on.
 *   - Prev/next buttons are real `<button>`s with non-empty `aria-label`s.
 *   - Ellipses are decorative `<span aria-hidden="true">`.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {number} props.page                              - 1-indexed.
 * @param {number} [props.limit]                           - Used with `total` when `totalPages` is omitted.
 * @param {number} [props.total]                           - Used with `limit` when `totalPages` is omitted.
 * @param {number} [props.totalPages]                      - Pre-computed total pages.
 * @param {(page: number) => void} props.onPageChange
 * @param {number} [props.siblings=1]                      - Pages adjacent to current.
 * @param {string} [props.className]
 */
function Pagination({
  page,
  limit,
  total,
  totalPages: totalPagesProp,
  onPageChange,
  siblings = 1,
  className,
  ...rest
}) {
  const totalPages = computeTotalPages(totalPagesProp, total, limit);
  const safePage = clampPage(page, totalPages);

  if (totalPages <= 1) return null;

  const items = buildPageItems(safePage, totalPages, siblings);
  const onChange = typeof onPageChange === 'function' ? onPageChange : () => {};

  const goPrev = () => {
    if (safePage > 1) onChange(safePage - 1);
  };
  const goNext = () => {
    if (safePage < totalPages) onChange(safePage + 1);
  };

  const prevDisabled = safePage <= 1;
  const nextDisabled = safePage >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1 sm:gap-2', className)}
      data-testid="pagination"
      {...rest}
    >
      <button
        type="button"
        onClick={goPrev}
        disabled={prevDisabled}
        aria-label="Previous page"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center border border-border bg-background text-foreground transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background disabled:hover:text-foreground'
        )}
        data-testid="pagination-prev"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </button>

      <ul className="flex items-center gap-1 sm:gap-2">
        {items.map((item, idx) =>
          item.type === 'gap' ? (
            <li key={`gap-${idx}`}>
              <span
                aria-hidden="true"
                className="inline-flex h-9 min-w-[1.75rem] items-center justify-center px-1 font-mono text-xs text-muted-foreground"
              >
                …
              </span>
            </li>
          ) : item.type === 'current' ? (
            <li key={item.page}>
              <span
                aria-current="page"
                aria-label={`Page ${item.page}, current page`}
                className="inline-flex h-9 min-w-[2.25rem] items-center justify-center bg-foreground px-2 font-mono text-xs font-semibold text-background"
                data-testid={`pagination-current-${item.page}`}
              >
                {item.page}
              </span>
            </li>
          ) : (
            <li key={item.page}>
              <button
                type="button"
                onClick={() => onChange(item.page)}
                aria-label={`Go to page ${item.page}`}
                className="inline-flex h-9 min-w-[2.25rem] items-center justify-center border border-border bg-background px-2 font-mono text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid={`pagination-page-${item.page}`}
              >
                {item.page}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        onClick={goNext}
        disabled={nextDisabled}
        aria-label="Next page"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center border border-border bg-background text-foreground transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background disabled:hover:text-foreground'
        )}
        data-testid="pagination-next"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </nav>
  );
}

/**
 * Compute totalPages from the props. Prefer `totalPages` when supplied;
 * otherwise derive from `total` and `limit`. Always returns at least 1
 * (matches the design's "Compute totalPages = max(1, ceil(total/limit))").
 *
 * @param {number|undefined} totalPagesProp
 * @param {number|undefined} total
 * @param {number|undefined} limit
 * @returns {number}
 */
export function computeTotalPages(totalPagesProp, total, limit) {
  if (Number.isFinite(totalPagesProp) && totalPagesProp >= 1) {
    return Math.floor(totalPagesProp);
  }
  const t = Number(total);
  const l = Number(limit);
  if (!Number.isFinite(t) || !Number.isFinite(l) || l <= 0 || t <= 0) return 1;
  return Math.max(1, Math.ceil(t / l));
}

function clampPage(page, totalPages) {
  const n = Number(page);
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > totalPages) return totalPages;
  return Math.floor(n);
}

/**
 * Build the page-item descriptor list with ellipses. Each descriptor is one
 * of:
 *   { type: 'page', page: number }
 *   { type: 'current', page: number }
 *   { type: 'gap' }
 *
 * Layout: first page, optional gap, sibling-current-sibling window, optional
 * gap, last page. When totalPages ≤ 7 we just emit every page.
 *
 * Exported for unit testing if/when added.
 */
export function buildPageItems(page, totalPages, siblings = 1) {
  const items = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) {
      items.push(i === page ? { type: 'current', page: i } : { type: 'page', page: i });
    }
    return items;
  }

  const left = Math.max(2, page - siblings);
  const right = Math.min(totalPages - 1, page + siblings);

  // First page (always shown).
  items.push(page === 1 ? { type: 'current', page: 1 } : { type: 'page', page: 1 });

  // Left gap.
  if (left > 2) items.push({ type: 'gap' });

  for (let i = left; i <= right; i += 1) {
    items.push(i === page ? { type: 'current', page: i } : { type: 'page', page: i });
  }

  // Right gap.
  if (right < totalPages - 1) items.push({ type: 'gap' });

  // Last page (always shown).
  items.push(
    page === totalPages
      ? { type: 'current', page: totalPages }
      : { type: 'page', page: totalPages }
  );

  return items;
}

export { Pagination };
export default Pagination;
