import { useCallback, useEffect, useState } from 'react';

/**
 * useRecentlyViewed — localStorage-backed recently-viewed list.
 *
 * Tracks the products this client has visited so the Product_Detail_Page can
 * render a Recently_Viewed_Strip below the related-products carousel
 * (Requirement 8.10). The list is capped at 10 entries, head-inserted on
 * each `recordView`, and de-duplicated by `id` (re-viewing a product moves
 * its existing entry to the head rather than creating a duplicate).
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 8.10)
 *   .kiro/specs/storefront-experience-redesign/design.md       (RecentlyViewedEntry)
 *   .kiro/specs/storefront-experience-redesign/tasks.md        (task 6.1)
 *
 * Storage key:
 *   `noir.recentlyViewed.v1` — versioned so a future schema change can
 *   bump to `.v2` and ignore the old payload without a backwards-compat
 *   shim. The value is a JSON array of {@link RecentlyViewedEntry}.
 *
 * @typedef {object} RecentlyViewedEntry
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {string|null} image
 * @property {number} viewedAt   - epoch ms
 *
 * Returned shape:
 *   {
 *     items: RecentlyViewedEntry[],   // most-recent first, capped at 10
 *     recordView(product),            // insert/move-to-head
 *     clear(),                        // wipe the list
 *   }
 */

export const STORAGE_KEY = 'noir.recentlyViewed.v1';
export const MAX_ENTRIES = 10;

const isBrowser = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/**
 * Read-and-validate the localStorage payload. Any malformed entry is
 * dropped silently — recently-viewed is a soft UI signal, never a source
 * of truth, so a corrupted entry must not crash the page.
 *
 * @returns {RecentlyViewedEntry[]}
 */
function readFromStorage() {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const { id, name, price, image, viewedAt } = entry;
      if (typeof id !== 'string' || id === '') continue;
      out.push({
        id,
        name: typeof name === 'string' ? name : '',
        price: typeof price === 'number' && Number.isFinite(price) ? price : 0,
        image: typeof image === 'string' && image !== '' ? image : null,
        viewedAt: typeof viewedAt === 'number' && Number.isFinite(viewedAt) ? viewedAt : 0,
      });
      if (out.length >= MAX_ENTRIES) break;
    }
    return out;
  } catch {
    // JSON.parse failure or storage access denied (private mode quotas).
    return [];
  }
}

function writeToStorage(items) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage quota or private-mode write failure — non-fatal.
  }
}

/**
 * Normalize a product-shaped argument into a RecentlyViewedEntry. Accepts
 * either the full Product DTO returned by the API or a partial object with
 * the minimum fields {`id`, `name`, `price`, `image`/`images`}.
 *
 * Returns null when the product lacks a usable id — the caller treats null
 * as "do nothing", which keeps the recordView seam crash-free even when an
 * upstream loader hasn't populated state yet.
 *
 * @param {object|null|undefined} product
 * @returns {RecentlyViewedEntry|null}
 */
function toEntry(product) {
  if (!product || typeof product !== 'object') return null;
  const id = product.id;
  if (typeof id !== 'string' || id === '') return null;

  const name = typeof product.name === 'string' ? product.name : '';
  const price =
    typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0;

  let image = null;
  if (typeof product.image === 'string' && product.image !== '') {
    image = product.image;
  } else if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    if (typeof first === 'string' && first !== '') image = first;
  }

  return {
    id,
    name,
    price,
    image,
    viewedAt: Date.now(),
  };
}

/**
 * @returns {{
 *   items: RecentlyViewedEntry[],
 *   recordView: (product: object) => void,
 *   clear: () => void,
 * }}
 */
export function useRecentlyViewed() {
  // Lazy-init state from storage so the first render does not flash an
  // empty list. Returning a function from `useState` ensures we hit
  // localStorage exactly once, not on every render.
  const [items, setItems] = useState(() => readFromStorage());

  // Listen for cross-tab changes so a "view product" in tab A is reflected
  // in the recently-viewed strip in tab B. The storage event fires only
  // for OTHER tabs by spec, which is what we want.
  useEffect(() => {
    if (!isBrowser()) return undefined;
    const handler = (event) => {
      if (event.key !== STORAGE_KEY) return;
      setItems(readFromStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const recordView = useCallback((product) => {
    const entry = toEntry(product);
    if (!entry) return;
    setItems((prev) => {
      // Drop any existing entry with the same id, then head-insert.
      const filtered = prev.filter((e) => e.id !== entry.id);
      const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
      writeToStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    if (isBrowser()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Non-fatal.
      }
    }
  }, []);

  return { items, recordView, clear };
}

export default useRecentlyViewed;
