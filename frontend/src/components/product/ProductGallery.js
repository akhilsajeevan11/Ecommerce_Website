import * as React from 'react';
import Image from '../primitives/Image';
import ProductGalleryLightbox from './ProductGalleryLightbox';
import { getImageUrl } from '../../utils/getImageUrl';
import { cn } from '../../lib/utils';

/**
 * ProductGallery — Product_Detail_Page multi-image gallery with thumbnail
 * strip, pixel-anchored 2× hover zoom (lg+ only), and click-to-open
 * lightbox.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirements 8.2, 8.3, 8.4)
 *   .kiro/specs/storefront-experience-redesign/design.md       (Product_Gallery)
 *
 * Behavior:
 *   - Renders every URL in `images` as a thumbnail in the strip and the
 *     selected image in the main view. The active thumbnail is highlighted
 *     with a black border; inactive thumbs are quiet.
 *   - At the `lg` breakpoint and above, hovering the main image applies a
 *     2× zoom centered on the cursor. The zoom is implemented by scaling
 *     the inner `<img>` to 200% and translating it via CSS variables so
 *     the cursor's pixel position remains anchored to the same point on
 *     the source image. Below `lg` the zoom is suppressed since it's a
 *     hover-only interaction (touch users get the lightbox instead).
 *   - Clicking the main view opens the `<ProductGalleryLightbox>` at the
 *     currently-selected index. The lightbox handles its own
 *     ArrowLeft/ArrowRight traversal and Escape-to-close.
 *
 * a11y posture (design.md a11y table):
 *   - The thumbnail strip is `role="tablist"`. Each thumbnail is
 *     `role="tab"` with `aria-selected`, `aria-controls` pointing at the
 *     panel, and a real `<button>` element so it's keyboard-reachable.
 *   - The main view is `role="tabpanel"` with `aria-labelledby` pointing
 *     at the active tab.
 *   - ArrowLeft / ArrowRight on a focused thumb moves the active tab and
 *     the focus, per WAI-ARIA tabs pattern. Home / End jump to the first
 *     and last thumb.
 *   - The main view's "click to zoom" affordance is a real `<button>` so
 *     keyboard users can open the lightbox via Enter/Space. The button
 *     advertises itself with `aria-label="Open image in lightbox"`.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3). The Image
 * primitive is the single allowed location for inline styles
 * (`aspectRatio`, dynamic placeholder background); the zoom translation
 * uses a CSS custom property + Tailwind `lg:hover:` utilities so no
 * inline `style={}` lives on this component.
 *
 * @param {object} props
 * @param {string[]} props.images        - Image URLs (relative or absolute).
 * @param {string} [props.alt]           - Base alt text (e.g. product name).
 * @param {string} [props.className]
 */
function ProductGallery({ images, alt = 'Product image', className }) {
  // Filter to non-empty strings and resolve through getImageUrl so the
  // lightbox and the inline view share the same canonical URLs.
  const safeImages = React.useMemo(() => {
    if (!Array.isArray(images)) return [];
    return images.filter((u) => typeof u === 'string' && u !== '');
  }, [images]);

  const total = safeImages.length;
  const [selected, setSelected] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  const tabRefs = React.useRef([]);
  const mainRef = React.useRef(null);
  const imgRef = React.useRef(null);

  // Reset selection when the underlying image set changes (e.g. user
  // navigates from one product to another without unmounting the page).
  React.useEffect(() => {
    setSelected(0);
  }, [total, safeImages[0]]);

  // ── Keyboard navigation on the tablist ──────────────────────────────
  const handleTabKeyDown = (event, idx) => {
    if (total === 0) return;
    let nextIdx = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIdx = (idx + 1) % total;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIdx = (idx - 1 + total) % total;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = total - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setSelected(nextIdx);
    const nextRef = tabRefs.current[nextIdx];
    if (nextRef && typeof nextRef.focus === 'function') nextRef.focus();
  };

  // ── Pixel-anchored zoom (lg+) ───────────────────────────────────────
  // We track the cursor's normalized position over the main view and
  // write it into CSS custom properties on the wrapper. Tailwind's
  // `lg:hover:` utilities only activate the zoom transform on `lg+`, so
  // mobile/tablet users never see the zoom (Requirement 8.3). The
  // calculation is pure: percentages relative to the bounding box, so
  // resizing the viewport doesn't drift the zoom origin.
  const handleMouseMove = (event) => {
    const node = mainRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, xPct));
    const clampedY = Math.max(0, Math.min(100, yPct));
    // CSS variables bind to the inner img's `transform-origin` via the
    // Tailwind arbitrary-property utility. We only set them on lg+ to
    // keep the touch experience flat — but writing them on all
    // breakpoints is harmless (the transform isn't applied without
    // `lg:hover:`).
    node.style.setProperty('--zoom-x', `${clampedX}%`);
    node.style.setProperty('--zoom-y', `${clampedY}%`);
  };

  const openLightbox = () => setLightboxOpen(true);

  if (total === 0) {
    // No imagery — render a single placeholder so layout still resolves.
    return (
      <div
        data-testid="product-gallery-empty"
        className={cn('flex flex-col gap-4', className)}
      >
        <Image src={null} alt={alt} aspectRatio="4/5" className="w-full" />
      </div>
    );
  }

  const tablistId = 'product-gallery-tabs';
  const panelId = 'product-gallery-panel';
  const activeTabId = `product-gallery-tab-${selected}`;
  const activeSrc = safeImages[selected];

  return (
    <div
      data-testid="product-gallery"
      className={cn('flex flex-col gap-4 lg:flex-row-reverse lg:gap-6', className)}
    >
      {/* Main view (tabpanel). On `lg+` the layout puts the strip on the
          left of the main image, matching the e-commerce pattern; below
          `lg` the strip sits below the main image. */}
      <div className="flex-1">
        <button
          ref={mainRef}
          type="button"
          id={panelId}
          role="tabpanel"
          aria-labelledby={activeTabId}
          aria-label="Open image in lightbox"
          onClick={openLightbox}
          onMouseMove={handleMouseMove}
          data-testid="product-gallery-main"
          className={cn(
            // The wrapper carries the cursor + group state for the zoom
            // utilities below. `cursor-zoom-in` on `lg+` advertises the
            // affordance; below `lg` the click still opens the lightbox.
            'group relative block w-full overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:cursor-zoom-in'
          )}
        >
          <Image
            ref={imgRef}
            src={activeSrc}
            alt={`${alt}, image ${selected + 1} of ${total}`}
            aspectRatio="4/5"
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="bg-muted"
            // The inner img is the zoom target. The transform-origin is
            // wired to CSS variables set in handleMouseMove. Tailwind
            // arbitrary properties keep the inline-style ban intact —
            // `[transform-origin:var(--zoom-x)_var(--zoom-y)]` resolves
            // at build time into a class that the runtime then applies.
            // The transform itself is `lg:group-hover:scale-200`, which
            // we express via Tailwind's arbitrary scale value
            // `lg:group-hover:scale-[2]`.
            imgClassName={cn(
              'transition-transform duration-300 ease-out',
              '[transform-origin:var(--zoom-x,50%)_var(--zoom-y,50%)]',
              'lg:group-hover:scale-[2]'
            )}
          />
        </button>
      </div>

      {/* Thumbnail strip (tablist). The strip sits below the main view on
          mobile and to its left on `lg+`. */}
      {total > 1 ? (
        <ul
          id={tablistId}
          role="tablist"
          aria-label="Product images"
          aria-orientation="horizontal"
          data-testid="product-gallery-tabs"
          className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0"
        >
          {safeImages.map((src, idx) => {
            const isActive = idx === selected;
            const tabId = `product-gallery-tab-${idx}`;
            return (
              <li key={`thumb-${idx}`} className="shrink-0">
                <button
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  type="button"
                  id={tabId}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setSelected(idx)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  data-testid={`product-gallery-thumb-${idx}`}
                  className={cn(
                    'h-20 w-16 overflow-hidden border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:h-24 lg:w-20',
                    isActive
                      ? 'border-foreground'
                      : 'border-transparent hover:border-border'
                  )}
                >
                  <Image
                    src={src}
                    alt=""
                    decorative
                    aspectRatio="3/4"
                    sizes="80px"
                    imgClassName="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ProductGalleryLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        // The lightbox needs absolute URLs to render from any host context.
        // getImageUrl is idempotent on already-absolute URLs.
        images={safeImages.map((u) => getImageUrl(u) || u)}
        initialIndex={selected}
        alt={alt}
        onIndexChange={setSelected}
      />
    </div>
  );
}

export { ProductGallery };
export default ProductGallery;
