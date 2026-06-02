import * as React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import Image from '../primitives/Image';
import IconButton from '../primitives/IconButton';
import { cn } from '../../lib/utils';

/**
 * ProductGalleryLightbox — full-viewport image lightbox opened from the
 * Product_Gallery main view.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 8.4)
 *   .kiro/specs/storefront-experience-redesign/design.md       (Product_Gallery)
 *
 * Behavior:
 *   - Built on Radix Dialog so it ships `role="dialog"`,
 *     `aria-modal="true"`, focus trap, and Escape-to-close for free.
 *   - Renders the image at index `initialIndex` and lets the user traverse
 *     the full `images[]` array via:
 *       · ArrowLeft / ArrowRight keys (handled at the dialog content level
 *         so capture happens even when focus is on the prev/next buttons).
 *       · Visible Prev / Next buttons (also keyboard-reachable).
 *     Traversal wraps around at both ends so the user never hits a dead
 *     end — common e-commerce gallery pattern.
 *   - Closing the lightbox calls `onOpenChange(false)`. The parent gallery
 *     receives the most recent image index via `onIndexChange` so a click
 *     on the lightbox can seed the page-level "selected" state on close.
 *
 * a11y posture:
 *   - The dialog content has an explicit `aria-label="Product gallery"`
 *     since the title is rendered as a visually hidden node (we don't want
 *     a literal heading in the lightbox).
 *   - Prev / Next / Close buttons all have non-empty `aria-label`s.
 *   - The active image's `alt` text is "{baseAlt}, image {n} of {total}"
 *     so AT users hear position context.
 *   - Honors prefers-reduced-motion via CSS — Tailwind's transition
 *     utilities collapse to no animation when the user has set reduce.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3). The `<Image>`
 * primitive is the only place where inline styles are allowed.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string[]} props.images            - Resolved image URLs.
 * @param {number} [props.initialIndex=0]
 * @param {string} [props.alt]               - Base alt text (e.g. product name).
 * @param {(index: number) => void} [props.onIndexChange]
 * @param {string} [props.className]
 */
function ProductGalleryLightbox({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
  alt = 'Product image',
  onIndexChange,
  className,
}) {
  const safeImages = Array.isArray(images) ? images.filter((u) => typeof u === 'string' && u !== '') : [];
  const total = safeImages.length;

  // Local state tracks the active index inside the lightbox. We seed it
  // from `initialIndex` whenever the dialog re-opens so that re-launching
  // the lightbox starts from whatever thumbnail the user clicked on, not
  // the last index they navigated to during the previous session.
  const [index, setIndex] = React.useState(() => clampIndex(initialIndex, total));

  React.useEffect(() => {
    if (open) setIndex(clampIndex(initialIndex, total));
  }, [open, initialIndex, total]);

  const updateIndex = React.useCallback(
    (next) => {
      if (total === 0) return;
      const wrapped = ((next % total) + total) % total;
      setIndex(wrapped);
      if (typeof onIndexChange === 'function') onIndexChange(wrapped);
    },
    [total, onIndexChange]
  );

  const goPrev = React.useCallback(() => updateIndex(index - 1), [index, updateIndex]);
  const goNext = React.useCallback(() => updateIndex(index + 1), [index, updateIndex]);

  // Capture ArrowLeft/ArrowRight at the content level so the keys still
  // work when focus lands on the close button or the prev/next buttons.
  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    }
  };

  if (total === 0) return null;

  const activeSrc = safeImages[index];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[10000] bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          aria-label="Product gallery"
          onKeyDown={handleKeyDown}
          data-testid="product-gallery-lightbox"
          className={cn(
            'fixed inset-0 z-[10001] flex flex-col bg-transparent text-background outline-none',
            className
          )}
        >
          {/* Visually hidden title — Radix requires a labelling element on
              every dialog for AT compliance. The aria-label above is what
              screen-readers hear in practice. */}
          <DialogPrimitive.Title className="sr-only">Product gallery</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Use the left and right arrow keys to traverse images. Press Escape to close.
          </DialogPrimitive.Description>

          {/* Top bar: counter + close */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <span
              data-testid="lightbox-counter"
              className="font-mono text-xs uppercase tracking-[0.2em] text-white/80"
            >
              {`${index + 1} / ${total}`}
            </span>
            <DialogPrimitive.Close asChild>
              <IconButton
                type="button"
                aria-label="Close gallery"
                data-testid="lightbox-close"
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              </IconButton>
            </DialogPrimitive.Close>
          </div>

          {/* Main area: large image with prev/next navigation */}
          <div className="relative flex flex-1 items-center justify-center px-4 pb-4 sm:px-12 sm:pb-12">
            {total > 1 ? (
              <IconButton
                type="button"
                aria-label="Previous image"
                data-testid="lightbox-prev"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 sm:left-6"
                size="lg"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              </IconButton>
            ) : null}

            <div className="relative flex h-full max-h-full w-full max-w-5xl items-center justify-center">
              <Image
                key={activeSrc}
                src={activeSrc}
                alt={`${alt}, image ${index + 1} of ${total}`}
                aspectRatio="4/5"
                priority
                placeholder="blur"
                sizes="(min-width: 1024px) 70vw, 100vw"
                className="bg-black"
                imgClassName="object-contain"
              />
            </div>

            {total > 1 ? (
              <IconButton
                type="button"
                aria-label="Next image"
                data-testid="lightbox-next"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 sm:right-6"
                size="lg"
              >
                <ChevronRight className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              </IconButton>
            ) : null}
          </div>

          {/* Bottom thumb strip — gives the user a quick-jump affordance
              without forcing them to step through with arrow keys. */}
          {total > 1 ? (
            <div className="border-t border-white/10 px-4 py-3 sm:px-6">
              <ul
                role="list"
                aria-label="Gallery thumbnails"
                className="flex items-center gap-2 overflow-x-auto"
              >
                {safeImages.map((src, idx) => {
                  const active = idx === index;
                  return (
                    <li key={`thumb-${idx}`} className="shrink-0">
                      <button
                        type="button"
                        aria-label={`Show image ${idx + 1}`}
                        aria-current={active ? 'true' : undefined}
                        data-testid={`lightbox-thumb-${idx}`}
                        onClick={() => updateIndex(idx)}
                        className={cn(
                          'h-16 w-12 overflow-hidden border transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                          active
                            ? 'border-white opacity-100'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        )}
                      >
                        <Image
                          src={src}
                          alt=""
                          decorative
                          aspectRatio="3/4"
                          sizes="48px"
                          className="bg-black/40"
                          imgClassName="object-cover"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function clampIndex(idx, total) {
  if (!Number.isFinite(idx) || total <= 0) return 0;
  if (idx < 0) return 0;
  if (idx >= total) return total - 1;
  return Math.floor(idx);
}

export { ProductGalleryLightbox };
export default ProductGalleryLightbox;
