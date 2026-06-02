import * as React from 'react';
import { Link } from 'react-router-dom';
import Image from '../primitives/Image';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import { cn } from '../../lib/utils';

/**
 * CategoryTile — molecule rendering a single category as an image-anchored
 * navigation tile.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.3)
 *   .kiro/specs/storefront-experience-redesign/design.md       (CategoryTile)
 *
 * Used by:
 *   - <ShopByCategory> on the Homepage (4 tiles, Requirement 5.3)
 *   - Future category landing pages
 *
 * Behavior:
 *   - Wraps the entire tile in a `<Link>` to `/shop?category={name}` so the
 *     tile is a single click target with correct keyboard semantics.
 *   - Renders the category image via the `<Image>` primitive (which already
 *     handles srcset/lazy-loading/aspect-ratio). When `image_url` is null
 *     callers are expected to substitute a fallback URL — `<ShopByCategory>`
 *     resolves the fallback to the first product image of the category
 *     before passing the tile its `category` prop.
 *   - Shows the category name and `product_count` overlay.
 *
 * a11y posture:
 *   - Single anchor for the whole tile (avoids nested interactive elements).
 *   - Image alt is the category name; the `product_count` is decorative.
 *   - Focus ring routes through the standard ring tokens.
 *
 * Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {{ id?: string, name: string, slug?: string, image_url?: string|null, product_count?: number }} props.category
 * @param {string} [props.aspectRatio="3/4"]
 * @param {string} [props.className]
 */
function CategoryTile({ category, aspectRatio = '3/4', className }) {
  if (!category || !category.name) return null;

  const target = `/shop?category=${encodeURIComponent(category.name)}`;
  const count =
    typeof category.product_count === 'number' && Number.isFinite(category.product_count)
      ? category.product_count
      : null;

  return (
    <Link
      to={target}
      className={cn(
        'group relative block overflow-hidden bg-muted text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      data-testid={`category-tile-${category.slug || category.name}`}
    >
      <Image
        src={category.image_url || null}
        alt={category.name}
        aspectRatio={aspectRatio}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
      />

      {/* Gradient scrim so the caption stays legible over any image. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
        <Heading
          as="h3"
          size="h3"
          className="font-heading text-xl font-bold uppercase tracking-tight text-white sm:text-2xl"
        >
          {category.name}
        </Heading>
        {count !== null ? (
          <Text
            variant="micro"
            tone="default"
            as="span"
            className="text-white/80"
          >
            {count} {count === 1 ? 'item' : 'items'}
          </Text>
        ) : null}
      </div>
    </Link>
  );
}

export { CategoryTile };
export default CategoryTile;
