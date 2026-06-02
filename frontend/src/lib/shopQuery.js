/**
 * shopQuery — pure URL-state primitives for the Shop_Page.
 *
 * This module is the only place that knows how the URL query string maps to
 * the canonical {@link ShopParams} shape. Every reader/writer of shop URL
 * state goes through these three pure functions plus the {@link
 * defaultShopParams} constant. Keeping the encoding in one tested place is
 * what makes the URL faithfully shareable, the back-button correct, and SEO
 * predictable across category-and-filter combinations.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 6)
 *   .kiro/specs/storefront-experience-redesign/design.md       (URL Query-Param State Schema)
 *   .kiro/specs/storefront-experience-redesign/tasks.md        (task 6.1)
 *
 * Properties this module is designed to satisfy:
 *   1. Round-trip on the normalized form:
 *        parseShopParams(serializeShopParams(normalize(p)).toString()) === normalize(p)
 *   2. Defaults never appear in the URL:
 *        serializeShopParams(defaultShopParams).toString() === ""
 *   3. Order independence of array filters (set semantics):
 *        permuting `category` / `sizes` / `colors` in `p` does not change
 *        `parseShopParams(serializeShopParams(p).toString())` — because
 *        `normalize` dedupes and sorts every string array, and
 *        `parseShopParams` normalizes its result.
 *
 * @typedef {object} ShopParams
 * @property {string|null} q
 * @property {string[]} category
 * @property {string[]} sizes
 * @property {string[]} colors
 * @property {number|null} min
 * @property {number|null} max
 * @property {number|null} rating
 * @property {boolean} inStock
 * @property {"newest"|"price_asc"|"price_desc"|"rating_desc"|"popularity"} sort
 * @property {number} page
 * @property {number} limit
 */

const VALID_SORTS = new Set([
  'newest',
  'price_asc',
  'price_desc',
  'rating_desc',
  'popularity',
]);

const DEFAULT_SORT = 'newest';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;
const MIN_PAGE = 1;
const MIN_LIMIT = 1;
const MAX_LIMIT = 60;

/**
 * The canonical default ShopParams. Frozen so consumers cannot mutate it
 * by accident. Any field equal to its default value MUST NOT appear in
 * the serialized URL — see Property 2 above and Requirement 6.2.
 *
 * @type {Readonly<ShopParams>}
 */
export const defaultShopParams = Object.freeze({
  q: null,
  category: Object.freeze([]),
  sizes: Object.freeze([]),
  colors: Object.freeze([]),
  min: null,
  max: null,
  rating: null,
  inStock: false,
  sort: DEFAULT_SORT,
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Dedupe + trim + sort a string array. Non-string entries and empty/whitespace
 * strings are dropped. Sorted ASCII-ascending so order is canonical — this is
 * what gives Property 3 (set semantics) a clean equality story when combined
 * with `parseShopParams` calling `normalize` at the end.
 *
 * @param {unknown} arr
 * @returns {string[]}
 */
function dedupeTrimSort(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (trimmed === '') continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  out.sort();
  return out;
}

/**
 * Best-effort integer parse with default fallback.
 * @param {unknown} value
 * @param {number} def
 * @returns {number}
 */
function parseIntOrDefault(value, def) {
  if (value === null || value === undefined) return def;
  const n = parseInt(value, 10);
  return Number.isInteger(n) ? n : def;
}

/**
 * Best-effort finite-number parse, returns null for missing or non-finite.
 * @param {unknown} value
 * @returns {number|null}
 */
function parseFloatOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Split a CSV value into a string array. Returns [] for null/empty.
 * The caller is expected to follow up with `dedupeTrimSort` (typically via
 * `normalize`) so that per-element trimming, deduping, and sorting happen
 * exactly once.
 *
 * @param {string|null|undefined} value
 * @returns {string[]}
 */
function splitCsv(value) {
  if (value === null || value === undefined || value === '') return [];
  return String(value).split(',');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Canonicalize an arbitrary ShopParams-like object.
 *
 * Rules (Requirement 6.3):
 *   - `page` clamped to ≥ 1.
 *   - `limit` clamped to the inclusive range [1, 60]; non-integer → 24.
 *   - Unknown `sort` value → "newest".
 *   - String arrays (`category`, `sizes`, `colors`) are deduped, trimmed,
 *     and sorted (Requirement 6.5 / Property 3).
 *   - `q` is trimmed; empty/whitespace → null.
 *   - `min`/`max`/`rating` keep finite numeric values, otherwise null.
 *     Per design.md the constraint `min > max` is intentionally NOT enforced
 *     here — the SQL query yields zero rows and the UI enforces sane bounds
 *     at the slider level.
 *   - `inStock` strictly equals `true` to be true (Requirement 6.2 default).
 *
 * `normalize` is idempotent: `normalize(normalize(p))` deep-equals
 * `normalize(p)`.
 *
 * @param {Partial<ShopParams>|null|undefined} params
 * @returns {ShopParams}
 */
export function normalize(params) {
  const p = params || {};

  // q — trimmed, empty/whitespace → null.
  let q;
  if (typeof p.q === 'string') {
    const t = p.q.trim();
    q = t === '' ? null : t;
  } else if (p.q === null || p.q === undefined) {
    q = null;
  } else {
    // Numbers, booleans, etc. are not valid query strings.
    q = null;
  }

  // Multi-value string filters — dedupe + trim + sort (set semantics).
  const category = dedupeTrimSort(p.category);
  const sizes = dedupeTrimSort(p.sizes);
  const colors = dedupeTrimSort(p.colors);

  // Numeric range filters — keep finite values, otherwise null.
  const min = parseFloatOrNull(p.min);
  const max = parseFloatOrNull(p.max);
  const rating = parseFloatOrNull(p.rating);

  // Boolean — strict equality so any truthy non-true value falls back.
  const inStock = p.inStock === true;

  // Sort — coerce unknown values to the default (Requirement 7.9 mirrors
  // this on the server; we mirror it on the client so the URL is sanitized
  // before the API call).
  const sort = VALID_SORTS.has(p.sort) ? p.sort : DEFAULT_SORT;

  // Pagination — clamp to non-zero positive integers; limit cap at 60.
  let page = Number.isInteger(p.page) ? p.page : DEFAULT_PAGE;
  if (page < MIN_PAGE) page = MIN_PAGE;

  let limit = Number.isInteger(p.limit) ? p.limit : DEFAULT_LIMIT;
  if (limit < MIN_LIMIT) limit = MIN_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return {
    q,
    category,
    sizes,
    colors,
    min,
    max,
    rating,
    inStock,
    sort,
    page,
    limit,
  };
}

/**
 * Serialize a ShopParams object into a `URLSearchParams` instance.
 *
 * Defaults are NEVER written to the output (Requirement 6.2 / Property 2):
 *   - `q === null` or `""`           → omit
 *   - empty array                     → omit
 *   - `min`/`max`/`rating === null`   → omit
 *   - `inStock === false`             → omit
 *   - `sort === "newest"`             → omit
 *   - `page === 1`                    → omit
 *   - `limit === 24`                  → omit
 *
 * Multi-value filters are joined with commas (Requirement 6.5):
 *   `?sizes=S,M,L`. The caller is expected to pass a normalized input — see
 *   {@link normalize}. Passing an unnormalized value is allowed but the
 *   round-trip property only holds on the normalized form.
 *
 * Note: per the design pseudocode, this function does NOT internally call
 * `normalize`. Keeping serialization free of side-effecting normalization
 * lets callers compose the two functions explicitly and makes the helper
 * trivial to test.
 *
 * @param {Partial<ShopParams>} params
 * @returns {URLSearchParams}
 */
export function serializeShopParams(params) {
  const p = params || {};
  const qs = new URLSearchParams();

  if (typeof p.q === 'string' && p.q !== '') {
    qs.set('q', p.q);
  }

  if (Array.isArray(p.category) && p.category.length > 0) {
    qs.set('category', p.category.join(','));
  }
  if (Array.isArray(p.sizes) && p.sizes.length > 0) {
    qs.set('sizes', p.sizes.join(','));
  }
  if (Array.isArray(p.colors) && p.colors.length > 0) {
    qs.set('colors', p.colors.join(','));
  }

  if (p.min !== null && p.min !== undefined && Number.isFinite(p.min)) {
    qs.set('min', String(p.min));
  }
  if (p.max !== null && p.max !== undefined && Number.isFinite(p.max)) {
    qs.set('max', String(p.max));
  }
  if (p.rating !== null && p.rating !== undefined && Number.isFinite(p.rating)) {
    qs.set('rating', String(p.rating));
  }

  if (p.inStock === true) {
    qs.set('in_stock', '1');
  }

  if (p.sort && p.sort !== DEFAULT_SORT && VALID_SORTS.has(p.sort)) {
    qs.set('sort', p.sort);
  }

  if (Number.isInteger(p.page) && p.page > DEFAULT_PAGE) {
    qs.set('page', String(p.page));
  }

  if (Number.isInteger(p.limit) && p.limit !== DEFAULT_LIMIT) {
    qs.set('limit', String(p.limit));
  }

  return qs;
}

/**
 * Parse a URL search string into a fully-normalized ShopParams.
 *
 * Accepts both `"?q=foo&page=2"` and `"q=foo&page=2"` for convenience —
 * a leading `?` is stripped before delegating to `URLSearchParams`.
 *
 * The output is always normalized (see {@link normalize}), which makes the
 * round-trip property hold by construction:
 *
 *   parseShopParams(serializeShopParams(normalize(p)).toString()) === normalize(p)
 *
 * @param {string|null|undefined} searchString
 * @returns {ShopParams}
 */
export function parseShopParams(searchString) {
  let raw = '';
  if (typeof searchString === 'string') {
    raw = searchString[0] === '?' ? searchString.slice(1) : searchString;
  }

  const qs = new URLSearchParams(raw);

  return normalize({
    q: qs.get('q'),
    category: splitCsv(qs.get('category')),
    sizes: splitCsv(qs.get('sizes')),
    colors: splitCsv(qs.get('colors')),
    min: parseFloatOrNull(qs.get('min')),
    max: parseFloatOrNull(qs.get('max')),
    rating: parseFloatOrNull(qs.get('rating')),
    inStock: qs.get('in_stock') === '1',
    sort: qs.get('sort') === null ? DEFAULT_SORT : qs.get('sort'),
    page: parseIntOrDefault(qs.get('page'), DEFAULT_PAGE),
    limit: parseIntOrDefault(qs.get('limit'), DEFAULT_LIMIT),
  });
}

/**
 * Map a frontend ShopParams object to the snake_case query parameters
 * expected by `GET /api/products`.
 *
 * Field-name translation (per design.md API contract):
 *   - `min`     → `min_price`
 *   - `max`     → `max_price`
 *   - `rating`  → `min_rating`
 *   - `inStock` → `in_stock`
 *   - everything else passes through unchanged.
 *
 * Empty / null / default values are omitted so axios doesn't transmit them
 * as the literal strings `"null"` or `""`. `sort`, `page`, and `limit` are
 * always sent because the backend uses them for canonical pagination/order
 * and they are cheap to include explicitly.
 *
 * @param {Partial<ShopParams>} shopParams
 * @returns {Record<string, string|number|boolean>}
 */
export function toApiParams(shopParams) {
  const p = normalize(shopParams);
  const out = {
    sort: p.sort,
    page: p.page,
    limit: p.limit,
  };

  if (p.q !== null) out.q = p.q;
  if (p.category.length > 0) out.category = p.category.join(',');
  if (p.sizes.length > 0) out.sizes = p.sizes.join(',');
  if (p.colors.length > 0) out.colors = p.colors.join(',');
  if (p.min !== null) out.min_price = p.min;
  if (p.max !== null) out.max_price = p.max;
  if (p.rating !== null) out.min_rating = p.rating;
  if (p.inStock) out.in_stock = true;

  return out;
}

export default {
  defaultShopParams,
  normalize,
  serializeShopParams,
  parseShopParams,
  toApiParams,
};
