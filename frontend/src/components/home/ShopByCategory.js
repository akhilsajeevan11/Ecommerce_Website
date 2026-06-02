import * as React from 'react';
import axios from 'axios';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import Skeleton from '../primitives/Skeleton';
import CategoryTile from '../common/CategoryTile';

/**
 * ShopByCategory — Homepage section rendering 4 category tiles.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.3)
 *   .kiro/specs/storefront-experience-redesign/design.md       (ShopByCategory)
 *
 * Behavior:
 *   - Fetches `GET /api/categories` once on mount.
 *   - Selects the first 4 categories (server-sorted alphabetically; future
 *     work may add a `display_order` column).
 *   - For any tile whose `image_url` is null, falls back to the first
 *     product image of that category by issuing a tiny secondary fetch
 *     (`GET /api/products?category={name}&limit=1`) and using
 *     `items[0].images[0]` (Requirement 5.3 fallback).
 *   - Hides itself silently (renders nothing) when the categories endpoint
 *     fails or returns zero categories — the rest of the homepage layout
 *     remains intact.
 *   - Renders 4 skeleton tiles while loading.
 *
 * Tailwind utility classes only (Requirement 1.3).
 */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const TILE_LIMIT = 4;

const ShopByCategory = () => {
  const [categories, setCategories] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API}/categories`);
        if (cancelled) return;
        const list = Array.isArray(response.data) ? response.data : [];
        if (list.length === 0) {
          setHidden(true);
          setIsLoading(false);
          return;
        }
        const top = list.slice(0, TILE_LIMIT);

        // Resolve fallback images for any tile whose `image_url` is null.
        // We issue parallel tiny fetches with `limit=1` so the section
        // renders as soon as the slowest fallback resolves. Each fallback
        // failure leaves the tile with a null image (the <Image> primitive
        // gracefully renders its neutral placeholder).
        const resolved = await Promise.all(
          top.map(async (cat) => {
            if (cat.image_url) return cat;
            try {
              const productResp = await axios.get(`${API}/products`, {
                params: { category: cat.name, limit: 1, page: 1 },
              });
              const items = Array.isArray(productResp.data?.items)
                ? productResp.data.items
                : Array.isArray(productResp.data)
                  ? productResp.data
                  : [];
              const fallback =
                items.length > 0 && Array.isArray(items[0].images) && items[0].images.length > 0
                  ? items[0].images[0]
                  : null;
              return { ...cat, image_url: fallback };
            } catch {
              return cat;
            }
          })
        );

        if (cancelled) return;
        setCategories(resolved);
        setHidden(false);
      } catch {
        if (cancelled) return;
        setHidden(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden && !isLoading) return null;

  return (
    <section
      aria-labelledby="shop-by-category-heading"
      className="w-full bg-background py-16 lg:py-24"
      data-testid="shop-by-category"
    >
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-12">
        <header className="mb-10 flex flex-col gap-2 lg:mb-14">
          <Heading
            as="h2"
            size="h2"
            id="shop-by-category-heading"
          >
            Shop by Category
          </Heading>
          <Text variant="caption" tone="muted">
            Discover the collection
          </Text>
        </header>

        <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {isLoading
            ? Array.from({ length: TILE_LIMIT }).map((_, idx) => (
                <li key={`category-skeleton-${idx}`} className="min-w-0">
                  <Skeleton className="aspect-[3/4] w-full" />
                </li>
              ))
            : categories.map((cat) => (
                <li key={cat.id || cat.slug || cat.name} className="min-w-0">
                  <CategoryTile category={cat} />
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
};

export { ShopByCategory };
export default ShopByCategory;
