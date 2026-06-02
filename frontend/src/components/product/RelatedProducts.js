import * as React from 'react';
import axios from 'axios';
import Heading from '../primitives/Heading';
import Skeleton from '../primitives/Skeleton';
import ProductCard from '../ProductCard';
import { cn } from '../../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * RelatedProducts — Product_Detail_Page horizontal carousel of products in
 * the same category as the active product.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 8.9)
 *   .kiro/specs/storefront-experience-redesign/design.md       (RelatedProducts)
 *
 * Behavior:
 *   - Fetches `GET /api/products/{id}/related?limit={limit}` on mount and
 *     whenever `productId` changes.
 *   - Cancels in-flight requests on unmount so a fast back-and-forward
 *     navigation cannot stomp the wrong response onto state.
 *   - Hides itself silently (renders `null`) when the response is a 5xx
 *     error or contains zero items. 4xx errors (typically 404 — the source
 *     product was deleted between mount and fetch) are also silently
 *     hidden because the page above already shows a "product not found"
 *     state for that case.
 *   - Renders a skeleton row of `limit` cards while loading.
 *
 * a11y posture:
 *   - The section is wrapped in a labelled landmark with a heading bound to
 *     `aria-labelledby` so AT users hear the strip's purpose on entry.
 *   - Cards use the existing `<ProductCard>` (already keyboard-accessible
 *     via its inner `<Link>`).
 *   - The horizontal scroll container is keyboard-scrollable via the
 *     browser's native handling when focused.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {string} props.productId           - Source product id.
 * @param {number} [props.limit=6]
 * @param {string} [props.className]
 */
function RelatedProducts({ productId, limit = 6, className }) {
  const [items, setItems] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    if (!productId) {
      setHidden(true);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;

    setIsLoading(true);
    setHidden(false);

    axios
      .get(`${API}/products/${productId}/related`, {
        params: { limit },
        signal: controller ? controller.signal : undefined,
      })
      .then((response) => {
        if (cancelled) return;
        const list = Array.isArray(response.data?.items)
          ? response.data.items
          : Array.isArray(response.data)
            ? response.data
            : [];
        if (list.length === 0) {
          // Empty result → silent hide (Requirement 8.9).
          setItems([]);
          setHidden(true);
        } else {
          setItems(list);
          setHidden(false);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        // axios cancellation surfaces as `error.code === 'ERR_CANCELED'` or
        // an AbortError; treat both as a no-op so we don't render an empty
        // hidden state for a navigation-cancelled fetch.
        if (axios.isCancel?.(error) || error?.name === 'CanceledError' || error?.name === 'AbortError') {
          return;
        }
        // Any error (5xx, 4xx, network) → silent hide. The Product_Detail_Page
        // itself handles 404 on the source product; this strip is a soft
        // cross-sell signal that should never surface its own error UI.
        setItems([]);
        setHidden(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (controller) controller.abort();
    };
  }, [productId, limit]);

  // Hide silently when explicitly hidden (5xx / empty / no productId).
  if (hidden && !isLoading) return null;

  const headingId = 'related-products-heading';

  return (
    <section
      aria-labelledby={headingId}
      data-testid="related-products"
      className={cn('flex flex-col gap-6', className)}
    >
      <Heading as="h2" size="h3" id={headingId} className="font-heading text-2xl font-bold">
        You might also like
      </Heading>

      {isLoading ? (
        <ul
          aria-busy="true"
          aria-label="Loading related products"
          data-testid="related-products-loading"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-6"
        >
          {Array.from({ length: limit }).map((_, idx) => (
            <li key={`related-skeleton-${idx}`} className="flex flex-col gap-3">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-6">
          {items.map((product) => (
            <li key={product.id ?? product.slug ?? product.name} className="min-w-0">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { RelatedProducts };
export default RelatedProducts;
