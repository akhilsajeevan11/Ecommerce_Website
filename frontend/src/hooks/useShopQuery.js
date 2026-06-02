import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  defaultShopParams,
  normalize,
  parseShopParams,
  serializeShopParams,
  toApiParams,
} from '../lib/shopQuery';

/**
 * useShopQuery — the only reader/writer of ShopParams URL state.
 *
 * The Shop_Page treats the URL query string as the canonical state container.
 * Filter, sort, search, and pagination state all flow through this hook so
 * deep-links (e.g. "Hoodies under ₹2000 in Black") reproduce reliably and
 * the back/forward buttons behave correctly. State changes call
 * `navigate({ search }, { replace: true })` — replace, not push, because
 * filter changes should not pollute browser history (Requirement 6.4).
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 6)
 *   .kiro/specs/storefront-experience-redesign/design.md       (URL Query-Param State Schema)
 *   .kiro/specs/storefront-experience-redesign/tasks.md        (task 6.1)
 *
 * Returned shape:
 *   {
 *     params: ShopParams,
 *     setParam(key, value),
 *     setParams(patch),
 *     clearAll(),
 *     queryString: string,        // canonical encoded query string (no leading "?")
 *     data: ProductsResponse|null,
 *     isLoading: boolean,
 *     isError: boolean,
 *   }
 *
 * Fetch behavior:
 *   - Calls `GET /api/products` with the snake_case-mapped query params (see
 *     `toApiParams`). The API envelope `{ items, total, page, limit, has_more }`
 *     is exposed through `data`.
 *   - The fetch is keyed by the canonical query string, not by the params
 *     object reference, so React StrictMode double-invocation does not
 *     refetch and consecutive setParams calls converge cleanly.
 *   - Stale request results are dropped using a per-request token, so a
 *     fast filter-toggle never overwrites a newer response with an older one.
 *   - Network failures are surfaced via `isError = true` while leaving the
 *     last successful `data` intact (so the grid does not flash empty when
 *     a flaky retry recovers the connection).
 *
 * Set semantics:
 *   - `setParam("page", 2)` writes a single field.
 *   - `setParams({ category: ["Hoodie"] })` patches multiple fields at once.
 *   - Both helpers reset `page` to 1 whenever a NON-pagination field is
 *     touched. This matches the e-commerce expectation that adding a filter
 *     drops you back to page 1 of the new result set rather than landing on
 *     "page 7 of nothing".
 *   - `clearAll()` writes the canonical no-filter URL (`/shop`).
 *
 * Why we read via `useSearchParams` AND keep a local `params` memo:
 *   `useSearchParams` is the authoritative source — when the user navigates
 *   via back/forward or pastes a deep link, we re-derive ShopParams from
 *   the URL on every render. The memo exists only to avoid re-parsing on
 *   every render when the URL has not actually changed.
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PAGINATION_FIELDS = new Set(['page', 'limit']);

/**
 * Returns true when changing any of these fields should reset `page` back to 1.
 */
function patchTouchesNonPaginationField(patch) {
  if (!patch || typeof patch !== 'object') return false;
  for (const key of Object.keys(patch)) {
    if (!PAGINATION_FIELDS.has(key)) return true;
  }
  return false;
}

/**
 * The canonical hook. Pages and organisms (FilterSidebar, SortMenu,
 * Pagination, etc.) consume this hook directly; nothing else writes to the
 * URL.
 *
 * @returns {{
 *   params: ReturnType<typeof normalize>,
 *   setParam: <K extends keyof ReturnType<typeof normalize>>(key: K, value: ReturnType<typeof normalize>[K]) => void,
 *   setParams: (patch: Partial<ReturnType<typeof normalize>>) => void,
 *   clearAll: () => void,
 *   queryString: string,
 *   data: { items: any[], total: number, page: number, limit: number, has_more: boolean }|null,
 *   isLoading: boolean,
 *   isError: boolean,
 * }}
 */
export function useShopQuery() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // The URL's `search` portion (without the leading "?") is our cache key.
  // useSearchParams returns a fresh URLSearchParams instance per render so
  // we serialize to a string for stable referential equality.
  const searchString = searchParams.toString();

  // Canonical, normalized ShopParams derived from the URL. Re-parsed only
  // when the search string actually changes.
  const params = useMemo(() => parseShopParams(searchString), [searchString]);

  // The canonical encoded query string after re-serializing the normalized
  // params. This will be ≤ what the URL holds (the URL might carry default
  // values that normalization stripped).
  const queryString = useMemo(
    () => serializeShopParams(params).toString(),
    [params]
  );

  // Write helper. Always merges into the latest URL-derived params and
  // navigates with `replace: true`.
  const writeParams = useCallback(
    (patch) => {
      const next = normalize({ ...params, ...patch });

      // Reset page when a non-pagination field changed and the caller did
      // not explicitly set page in the patch. This matches the standard
      // e-commerce UX of "add a filter → land on page 1".
      if (patchTouchesNonPaginationField(patch) && patch.page === undefined) {
        next.page = 1;
      }

      const search = serializeShopParams(next).toString();
      // `navigate({ search })` accepts either "?foo=bar" or "foo=bar"; we
      // prefix the "?" only when there is content so an empty navigate
      // produces the canonical no-query URL.
      navigate({ search: search ? `?${search}` : '' }, { replace: true });
    },
    [navigate, params]
  );

  const setParam = useCallback(
    (key, value) => {
      writeParams({ [key]: value });
    },
    [writeParams]
  );

  const setParams = useCallback(
    (patch) => {
      writeParams(patch || {});
    },
    [writeParams]
  );

  const clearAll = useCallback(() => {
    navigate({ search: '' }, { replace: true });
  }, [navigate]);

  // ---------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Token guards against stale responses overwriting newer ones.
  const requestTokenRef = useRef(0);

  useEffect(() => {
    if (!BACKEND_URL) {
      // No backend configured — surface as an error rather than hanging in
      // a permanent loading state. This is hit in offline tests/dev when
      // REACT_APP_BACKEND_URL is unset.
      setData(null);
      setIsLoading(false);
      setIsError(true);
      return undefined;
    }

    const token = requestTokenRef.current + 1;
    requestTokenRef.current = token;

    let cancelled = false;
    setIsLoading(true);
    setIsError(false);

    const apiParams = toApiParams(params);

    axios
      .get(`${API}/products`, { params: apiParams })
      .then((response) => {
        if (cancelled || requestTokenRef.current !== token) return;
        // Tolerate older endpoints that return a bare array instead of the
        // envelope. After task 4.2 ships the backend always returns the
        // envelope, but during the transition period we keep the page
        // functional without a hard break.
        const body = response && response.data;
        if (Array.isArray(body)) {
          setData({
            items: body,
            total: body.length,
            page: apiParams.page || 1,
            limit: apiParams.limit || 24,
            has_more: false,
          });
        } else if (body && typeof body === 'object' && Array.isArray(body.items)) {
          setData({
            items: body.items,
            total: typeof body.total === 'number' ? body.total : body.items.length,
            page: typeof body.page === 'number' ? body.page : apiParams.page || 1,
            limit: typeof body.limit === 'number' ? body.limit : apiParams.limit || 24,
            has_more: !!body.has_more,
          });
        } else {
          setData({
            items: [],
            total: 0,
            page: apiParams.page || 1,
            limit: apiParams.limit || 24,
            has_more: false,
          });
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled || requestTokenRef.current !== token) return;
        // Leave `data` as-is so a flaky transient error doesn't blank the
        // grid; the consumer renders the previous successful page until
        // the next successful fetch arrives.
        // eslint-disable-next-line no-console
        console.error('[useShopQuery] products fetch failed', err);
        setIsError(true);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // We key the effect on the canonical query string rather than the
    // params object so referentially-different-but-equal params do not
    // trigger redundant network calls. `params` is derived from
    // `queryString` so depending on the latter is equivalent.
  }, [queryString]);

  return {
    params,
    setParam,
    setParams,
    clearAll,
    queryString,
    data,
    isLoading,
    isError,
  };
}

// Re-export for convenience so callers can import the default ShopParams
// shape from the same module they use the hook from.
export { defaultShopParams };

export default useShopQuery;
