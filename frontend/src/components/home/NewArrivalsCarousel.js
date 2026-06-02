import * as React from 'react';
import axios from 'axios';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import Skeleton from '../primitives/Skeleton';
import ProductCard from '../ProductCard';

/**
 * NewArrivalsCarousel — Homepage horizontal-scroll carousel of recent
 * products.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.4)
 *   .kiro/specs/storefront-experience-redesign/design.md       (NewArrivalsCarousel)
 *
 * Behavior:
 *   - Fetches `GET /api/products?sort=newest&limit=6&page=1` once on mount.
 *     The Products_API envelope `{ items, total, ... }` is unwrapped to a
 *     6-card list; legacy non-envelope responses are also tolerated.
 *   - Renders the items in a horizontal `snap-x snap-mandatory` flex
 *     container so each card snaps into view on scroll.
 *   - Supports keyboard scrolling: when the scroll container has focus,
 *     ArrowLeft / ArrowRight scroll by approximately one card width
 *     (Requirement 5.4).
 *   - Hides itself silently when zero items are returned or the request
 *     fails — the homepage layout stays intact.
 *
 * a11y posture:
 *   - Section is wrapped in a labelled landmark.
 *   - The scroll container is `role="region"` with `aria-label` and
 *     `tabIndex={0}` so keyboard users can focus it and use arrow keys.
 *   - Each card retains its native ProductCard semantics (a `<Link>`
 *     wrapping the image).
 *
 * Tailwind utility classes only (Requirement 1.3) — the snap container
 * uses `snap-x snap-mandatory overflow-x-auto` and each item gets
 * `snap-start`.
 */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const ITEM_COUNT = 6;

const NewArrivalsCarousel = () => {
  const [items, setItems] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hidden, setHidden] = React.useState(false);
  const scrollerRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API}/products`, {
          params: { sort: 'newest', limit: ITEM_COUNT, page: 1 },
        });
        if (cancelled) return;
        const list = Array.isArray(response.data?.items)
          ? response.data.items
          : Array.isArray(response.data)
            ? response.data
            : [];
        if (list.length === 0) {
          setHidden(true);
        } else {
          setItems(list.slice(0, ITEM_COUNT));
          setHidden(false);
        }
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

  // Keyboard scroll handler — ArrowLeft / ArrowRight scroll by one card
  // width. We measure the first child's clientWidth (plus the flex `gap`)
  // so the step size matches whatever Tailwind decides at the current
  // breakpoint. PageUp/PageDown could be added later for a power-user
  // shortcut; the spec only requires Arrow keys.
  const handleKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const firstChild = scroller.firstElementChild;
    const step = firstChild ? firstChild.getBoundingClientRect().width + 24 : 320;
    event.preventDefault();
    scroller.scrollBy({
      left: event.key === 'ArrowRight' ? step : -step,
      behavior: 'smooth',
    });
  };

  if (hidden && !isLoading) return null;

  return (
    <section
      aria-labelledby="new-arrivals-heading"
      className="w-full bg-muted py-16 lg:py-24"
      data-testid="new-arrivals-carousel"
    >
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-12">
        <header className="mb-10 flex flex-col gap-2 lg:mb-14">
          <Heading as="h2" size="h2" id="new-arrivals-heading">
            New Arrivals
          </Heading>
          <Text variant="caption" tone="muted">
            Just landed in the studio
          </Text>
        </header>

        <div
          ref={scrollerRef}
          role="region"
          aria-label="New arrivals carousel"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:gap-5 sm:px-6 lg:-mx-12 lg:gap-6 lg:px-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {isLoading
            ? Array.from({ length: ITEM_COUNT }).map((_, idx) => (
                <div
                  key={`new-arrival-skeleton-${idx}`}
                  className="w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-[24%]"
                >
                  <Skeleton className="aspect-[3/4] w-full" />
                  <div className="mt-3 flex flex-col gap-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                </div>
              ))
            : items.map((product) => (
                <div
                  key={product.id || product.slug || product.name}
                  className="w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-[24%]"
                >
                  <ProductCard product={product} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
};

export { NewArrivalsCarousel };
export default NewArrivalsCarousel;
