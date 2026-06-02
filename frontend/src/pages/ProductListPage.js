import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight } from 'lucide-react';
import axios from 'axios';

import { useShopQuery } from '../hooks/useShopQuery';
import FilterSidebar from '../components/shop/FilterSidebar';
import FilterBottomSheet from '../components/shop/FilterBottomSheet';
import ActiveFilterChips from '../components/shop/ActiveFilterChips';
import SortMenu from '../components/shop/SortMenu';
import ProductGrid from '../components/shop/ProductGrid';
import Pagination from '../components/shop/Pagination';
import DensityToggle from '../components/shop/DensityToggle';
import Heading from '../components/primitives/Heading';
import Text from '../components/primitives/Text';
import { track } from '../lib/analytics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Pagination keys are excluded from `select_filter` analytics emission —
 * paging through results is not a "filter" event semantically (Requirement
 * 16.9 / design.md instrumentation map).
 */
const PAGINATION_FIELDS = new Set(['page', 'limit']);

function patchHasFilterChange(patch) {
  if (!patch || typeof patch !== 'object') return false;
  for (const key of Object.keys(patch)) {
    if (!PAGINATION_FIELDS.has(key)) return true;
  }
  return false;
}

function buildHeadline(q) {
  if (typeof q === 'string' && q.trim() !== '') {
    return `Results for "${q}"`;
  }
  return 'All Products';
}

function buildPageTitle(q) {
  if (typeof q === 'string' && q.trim() !== '') {
    return `Results for "${q}"`;
  }
  return 'Shop';
}

function buildCanonicalUrl(pathname) {
  // Canonical points at the unfiltered route; per SEO best practice the
  // filtered combinations are not all individually crawlable canonical
  // pages. Filter/sort/pagination params are intentionally stripped.
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return `${window.location.origin}${pathname}`;
  }
  return pathname;
}

/**
 * ProductListPage — the URL-driven shop route at `/shop`.
 *
 * Spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md
 *     Requirement 6 (URL state, filters, sorting, pagination)
 *     Requirement 16.9 (analytics emission)
 *     Requirement 1.3 (no inline `style={}` attributes)
 *     Requirement 1.4 (no `window.innerWidth` references — Tailwind
 *                       breakpoints only)
 *   .kiro/specs/storefront-experience-redesign/design.md
 *     Shop_Page wireframe and instrumentation map
 *
 * Composition (top → bottom):
 *   1. <Helmet> per-route title/meta/canonical (Requirement 16.1, 16.2)
 *   2. Breadcrumb — inline `<nav aria-label="Breadcrumb">` (no Breadcrumb
 *      molecule exists in the project yet, so we render the markup inline
 *      to keep this task self-contained)
 *   3. Page header — H1, item count, SortMenu, DensityToggle
 *   4. ActiveFilterChips
 *   5. FilterBottomSheet trigger (below `lg`)
 *   6. Two-column layout:
 *        - FilterSidebar (`hidden lg:block lg:w-64 lg:shrink-0`)
 *        - Results column (ProductGrid + Pagination)
 *
 * State:
 *   - All filter/sort/pagination state lives in the URL via `useShopQuery`
 *     (the only reader/writer of ShopParams).
 *   - Density is local component state — it's a viewing preference, not
 *     part of the shareable filtered view, so it intentionally stays out
 *     of the URL (per task brief).
 *   - Categories are fetched once on mount and passed into FilterSidebar /
 *     FilterBottomSheet via the `availableCategories` prop. Sizes and
 *     colors are hardcoded inside FilterSidebar's defaults.
 *
 * Analytics (Requirement 16.9):
 *   - `view_item_list` fires after every successful results render, keyed
 *     by canonical query string so it emits once per query change rather
 *     than on every re-render.
 *   - `select_filter` fires from the `setParam`/`setParams` wrappers when
 *     the patch touches a non-pagination field. Per the design doc, paging
 *     through results is not a `select_filter` event.
 *
 * Styling: Tailwind utility classes only — every class routes through the
 * design tokens, no raw hex literals or inline `style` attributes.
 */
const ProductListPage = () => {
  const location = useLocation();

  const {
    params,
    setParam,
    setParams,
    clearAll,
    queryString,
    data,
    isLoading,
    isError,
  } = useShopQuery();

  // Local UI state (not URL-backed):
  //  - density: comfy/compact toggle, viewing preference only.
  const [density, setDensity] = useState('comfy');

  // Categories are fetched once on mount. Failing silently here is the
  // right call: the FilterSidebar gracefully degrades to "No categories
  // available" rather than blocking the entire page.
  const [availableCategories, setAvailableCategories] = useState([]);

  useEffect(() => {
    if (!BACKEND_URL) return undefined;
    let cancelled = false;
    axios
      .get(`${API}/categories`)
      .then((response) => {
        if (cancelled) return;
        const body = response && response.data;
        if (Array.isArray(body)) {
          setAvailableCategories(body);
        }
      })
      .catch((err) => {
        // Silent — sidebar shows the empty-state copy until /api/categories
        // recovers. We log to console so a dev still sees the failure.
        // eslint-disable-next-line no-console
        console.error('[ProductListPage] categories fetch failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------
  // Analytics wrappers around setParam / setParams
  // ---------------------------------------------------------------------

  const trackedSetParam = useCallback(
    (key, value) => {
      if (!PAGINATION_FIELDS.has(key)) {
        track('select_filter', { field: key, value });
      }
      setParam(key, value);
    },
    [setParam]
  );

  const trackedSetParams = useCallback(
    (patch) => {
      if (patchHasFilterChange(patch)) {
        // Emit one event per non-pagination field changed — keeps the
        // event payload simple and matches the per-field semantics that
        // analytics platforms expect.
        Object.entries(patch || {}).forEach(([k, v]) => {
          if (!PAGINATION_FIELDS.has(k)) {
            track('select_filter', { field: k, value: v });
          }
        });
      }
      setParams(patch);
    },
    [setParams]
  );

  // ---------------------------------------------------------------------
  // view_item_list — emit once per successful data render, keyed by the
  // canonical query string so re-renders without a new fetch don't
  // duplicate the event.
  // ---------------------------------------------------------------------

  const lastFiredQueryRef = useRef(null);
  useEffect(() => {
    if (isLoading || !data) return;
    if (lastFiredQueryRef.current === queryString) return;
    lastFiredQueryRef.current = queryString;
    track('view_item_list', {
      params,
      count: Array.isArray(data.items) ? data.items.length : 0,
      total: typeof data.total === 'number' ? data.total : 0,
    });
  }, [isLoading, data, queryString, params]);

  // ---------------------------------------------------------------------
  // Derived rendering values
  // ---------------------------------------------------------------------

  const total = data && typeof data.total === 'number' ? data.total : 0;
  const items = data && Array.isArray(data.items) ? data.items : [];
  const headline = buildHeadline(params.q);
  const pageTitle = buildPageTitle(params.q);
  const canonicalUrl = useMemo(
    () => buildCanonicalUrl(location.pathname),
    [location.pathname]
  );

  const handlePageChange = useCallback(
    (nextPage) => {
      // Pagination is intentionally NOT tracked as `select_filter` — it
      // routes straight through `setParam` so the URL writes happen but no
      // event fires.
      setParam('page', nextPage);
      // After a page change, scroll back to the top of the results so the
      // customer is not stranded mid-grid on a fresh page (matches
      // standard e-commerce UX).
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [setParam]
  );

  const itemsLabel = `${total} ${total === 1 ? 'item' : 'items'}`;

  return (
    <div className="page-transition min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="Browse the NOIR collection — monochrome luxury essentials. Filter by category, size, color, and price."
        />
        <meta property="og:title" content={`${pageTitle} | NOIR`} />
        <meta
          property="og:description"
          content="Browse the NOIR collection — monochrome luxury essentials."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-12 lg:py-16">
        {/* Breadcrumb — Home / Shop. Inline because no Breadcrumb molecule
            ships yet; the markup follows WCAG breadcrumb pattern. */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 lg:mb-8"
          data-testid="shop-breadcrumb"
        >
          <ol className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground">
            <li>
              <Link
                to="/"
                className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
            </li>
            <li>
              <span aria-current="page" className="text-foreground">
                Shop
              </span>
            </li>
          </ol>
        </nav>

        {/* Page header: H1, item count, sort, density */}
        <div className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <Heading
              as="h1"
              size="h1"
              className="font-heading"
              data-testid="page-title"
            >
              {headline}
            </Heading>
            <Text
              variant="caption"
              tone="muted"
              data-testid="shop-result-count"
            >
              {itemsLabel}
            </Text>
          </div>

          <div className="flex items-center gap-3">
            <SortMenu
              value={params.sort}
              onValueChange={(next) => trackedSetParam('sort', next)}
            />
            {/* Density is a luxury at narrow widths — only show at sm+. */}
            <div className="hidden sm:block">
              <DensityToggle value={density} onChange={setDensity} />
            </div>
          </div>
        </div>

        {/* Active filter chips — empty when ShopParams equals defaults */}
        <div className="mb-4 lg:mb-6">
          <ActiveFilterChips
            params={params}
            setParams={trackedSetParams}
            clearAll={clearAll}
          />
        </div>

        {/* Mobile: filter trigger above the grid (hidden at lg+) */}
        <div className="mb-4 lg:hidden">
          <FilterBottomSheet
            params={params}
            setParam={trackedSetParam}
            setParams={trackedSetParams}
            clearAll={clearAll}
            availableCategories={availableCategories}
          />
        </div>

        {/* Two-column layout: sidebar (lg+) + results column */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <FilterSidebar
            params={params}
            setParam={trackedSetParam}
            setParams={trackedSetParams}
            availableCategories={availableCategories}
          />

          <div className="min-w-0 flex-1">
            {isError && !data ? (
              <div
                role="alert"
                className="border border-border bg-background px-4 py-12 text-center"
                data-testid="shop-error-state"
              >
                <Heading as="h2" size="h3" className="mb-2 font-heading">
                  Something went wrong
                </Heading>
                <Text variant="body" tone="muted">
                  We couldn&apos;t load products right now. Please try again
                  in a moment.
                </Text>
              </div>
            ) : (
              <ProductGrid
                items={items}
                isLoading={isLoading}
                clearAll={clearAll}
                density={density}
              />
            )}

            {/* Pagination only renders when there is more than one page. */}
            {!isLoading && total > 0 ? (
              <div className="mt-12 lg:mt-16">
                <Pagination
                  page={params.page}
                  limit={params.limit}
                  total={total}
                  onPageChange={handlePageChange}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductListPage;
