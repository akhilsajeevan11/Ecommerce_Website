import * as React from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import Skeleton from '../primitives/Skeleton';
import ProductCard from '../ProductCard';
import { cn } from '../../lib/utils';

/**
 * CuratedCollection — generic Homepage product collection block.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.1, 5.5)
 *   .kiro/specs/storefront-experience-redesign/design.md       (CuratedCollection)
 *
 * Used by the Homepage twice (Requirement 5.1) — the design uses one
 * Featured collection plus a second curated block. This generic component
 * accepts query params, a heading, and grid density so the same code
 * powers both surfaces (and any future curated landing).
 *
 * Behavior:
 *   - Fetches `GET /api/products` with the supplied `queryParams`. The
 *     parent owns the filter (e.g. `{ featured: 'true' }`,
 *     `{ sort: 'rating_desc' }`, `{ category: 'Hoodie' }`) so the component
 *     stays generic.
 *   - Unwraps the envelope `{ items, ... }` (and tolerates legacy
 *     non-envelope arrays for backward compatibility with seeded data).
 *   - Renders skeleton cards while loading. Hides itself silently when the
 *     fetch fails or returns zero items.
 *   - Optional CTA link at the top-right (e.g. "View All" → `/shop`).
 *
 * Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {string} props.title                  - Heading text.
 * @param {string} [props.subtitle]
 * @param {Record<string, any>} [props.queryParams]
 * @param {number} [props.limit=6]              - Max items requested + rendered.
 * @param {1|2|3|4} [props.columns=3]           - Desktop column count at lg+.
 * @param {string} [props.ctaLabel]             - Optional top-right link label.
 * @param {string} [props.ctaTo]                - Optional top-right link target.
 * @param {string} [props.background="bg-background"] - Tailwind bg class.
 * @param {string} [props.className]
 * @param {string} [props["data-testid"]]
 */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLUMN_GRID = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

function CuratedCollection({
  title,
  subtitle,
  queryParams,
  limit = 6,
  columns = 3,
  ctaLabel,
  ctaTo,
  background = 'bg-background',
  className,
  ...rest
}) {
  const [items, setItems] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hidden, setHidden] = React.useState(false);

  // Stable string key for the params dependency — prevents the effect from
  // refiring on every parent render when callers inline an object literal.
  const paramsKey = React.useMemo(
    () => JSON.stringify(queryParams || {}),
    [queryParams]
  );

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API}/products`, {
          params: { ...(queryParams || {}), limit, page: 1 },
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
          setItems(list.slice(0, limit));
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
  }, [paramsKey, limit]);

  if (hidden && !isLoading) return null;

  const headingId = `curated-collection-${(title || 'untitled')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')}`;

  const gridClasses = COLUMN_GRID[columns] || COLUMN_GRID[3];

  return (
    <section
      aria-labelledby={headingId}
      className={cn('w-full py-16 lg:py-24', background, className)}
      data-testid={rest['data-testid'] || 'curated-collection'}
    >
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-12">
        <header className="mb-10 flex flex-col items-start justify-between gap-4 lg:mb-14 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-2">
            <Heading as="h2" size="h2" id={headingId}>
              {title}
            </Heading>
            {subtitle ? (
              <Text variant="caption" tone="muted">
                {subtitle}
              </Text>
            ) : null}
          </div>

          {ctaLabel && ctaTo ? (
            <Link
              to={ctaTo}
              className="inline-flex items-center gap-2 border border-border bg-background px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {ctaLabel}
            </Link>
          ) : null}
        </header>

        <ul className={cn('grid gap-6 sm:gap-8 lg:gap-10', gridClasses)}>
          {isLoading
            ? Array.from({ length: limit }).map((_, idx) => (
                <li key={`curated-skeleton-${idx}`} className="flex min-w-0 flex-col gap-3">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </li>
              ))
            : items.map((product) => (
                <li key={product.id || product.slug || product.name} className="min-w-0">
                  <ProductCard product={product} />
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
}

export { CuratedCollection };
export default CuratedCollection;
