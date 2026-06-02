import * as React from 'react';
import { Link } from 'react-router-dom';
import Heading from '../primitives/Heading';
import Image from '../primitives/Image';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { formatPrice } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/**
 * RecentlyViewed — Product_Detail_Page strip rendering products this client
 * has viewed recently.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 8.10)
 *   .kiro/specs/storefront-experience-redesign/design.md       (RecentlyViewed)
 *
 * Behavior:
 *   - Reads up to 10 entries from `useRecentlyViewed` (storage key
 *     `noir.recentlyViewed.v1`).
 *   - Excludes the current product (matched on `id`) so the strip never
 *     shows the page the user is already on.
 *   - Renders most-recent first — the hook guarantees this ordering by
 *     head-inserting on each `recordView`.
 *   - Renders nothing when the filtered list is empty so the section does
 *     not surface as a stub.
 *
 * Note on insertion: this component is read-only. The Product_Detail_Page
 * itself is responsible for calling `recordView(product)` on mount
 * (Requirement 8.10) — that keeps insertion logic on the page that owns
 * the lifecycle and avoids double-recording from layout reflows.
 *
 * a11y posture:
 *   - The section is wrapped in a labelled landmark with a heading bound to
 *     `aria-labelledby` so AT users hear the strip's purpose on entry.
 *   - The horizontal scroll container is `tabindex="0"` so keyboard users
 *     can scroll it (browsers focus scroll containers natively when they
 *     are scrollable).
 *   - Each card is a `<Link>` so the primary affordance is correctly
 *     conveyed.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {string} [props.currentProductId]
 * @param {number} [props.maxItems=10]
 * @param {string} [props.className]
 */
function RecentlyViewed({ currentProductId, maxItems = 10, className }) {
  const { items } = useRecentlyViewed();

  // Filter out the current product and apply the cap. The hook already
  // returns most-recent first.
  const filtered = React.useMemo(() => {
    if (!Array.isArray(items)) return [];
    const next = currentProductId
      ? items.filter((entry) => entry.id !== currentProductId)
      : items.slice();
    return next.slice(0, maxItems);
  }, [items, currentProductId, maxItems]);

  if (filtered.length === 0) return null;

  const headingId = 'recently-viewed-heading';

  return (
    <section
      aria-labelledby={headingId}
      data-testid="recently-viewed"
      className={cn('flex flex-col gap-6', className)}
    >
      <Heading as="h2" size="h3" id={headingId} className="font-heading text-2xl font-bold">
        Recently Viewed
      </Heading>

      <ul
        // Horizontal scroll on mobile/tablet; grid on `lg+` so the strip
        // resolves into a tidy row that doesn't rely on snap-x scrolling.
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible xl:grid-cols-6"
        tabIndex={0}
        aria-label="Recently viewed products"
      >
        {filtered.map((entry) => (
          <li
            key={entry.id}
            className="min-w-[44%] shrink-0 snap-start sm:min-w-[30%] md:min-w-[24%] lg:min-w-0"
          >
            <Link
              to={`/product/${entry.id}`}
              data-testid={`recently-viewed-${entry.id}`}
              className="group flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Image
                src={entry.image}
                alt={entry.name}
                aspectRatio="3/4"
                sizes="(min-width: 1024px) 18vw, 44vw"
                className="bg-muted"
                imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="flex flex-col gap-1 px-1">
                <h3 className="line-clamp-2 font-heading text-sm font-bold leading-snug text-foreground">
                  {entry.name}
                </h3>
                <p className="font-mono text-xs text-foreground">
                  {formatPrice(entry.price)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { RecentlyViewed };
export default RecentlyViewed;
