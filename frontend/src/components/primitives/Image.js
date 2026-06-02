import * as React from 'react';
import { cn } from '../../lib/utils';
import { buildSrcSet } from '../../lib/image';
import { getImageUrl } from '../../utils/getImageUrl';
import { track } from '../../lib/analytics';

/**
 * Universal customer-facing image component.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 13)
 *   .kiro/specs/storefront-experience-redesign/design.md       (Image_Component)
 *
 * Behavior:
 *  - Wraps `<img>` in a `<div>` whose CSS `aspect-ratio` is set from the
 *    `aspectRatio` prop (default `"1/1"`). This reserves layout space before
 *    the image resolves and contributes 0 to CLS (Requirement 13.1).
 *  - Generates `srcset` for the standard width ladder
 *    `[320, 480, 640, 768, 1024, 1280, 1536]` via `buildSrcSet`
 *    (Requirements 13.2, 13.4).
 *  - When `priority` is true, emits `loading="eager"` and
 *    `fetchpriority="high"`; otherwise `loading="lazy"` and
 *    `fetchpriority="auto"`. Always emits `decoding="async"` (Requirement 13.6).
 *  - When `placeholder="blur"`, renders a low-quality LQIP background that
 *    fades out via opacity transition once the inner `<img>` reports
 *    `onLoad` (Requirement 13.7).
 *  - On error, swaps to a low-contrast SVG placeholder and invokes the
 *    optional `onError` callback (Requirement 13.8). Also emits
 *    `track('image_error', { src })` per the design's failure-mode table.
 *  - Enforces `alt` semantics: when `decorative` is true, emits `alt=""` and
 *    `role="presentation"`; otherwise warns in development if `alt` is
 *    missing or empty (Requirement 13.9).
 *
 * NOTE: This component is the single allowed location for inline
 * `style={{ aspectRatio, ... }}` and the dynamic placeholder background. Every
 * other customer-page component must use Tailwind utility classes only.
 */

// 8x8 neutral grey LQIP encoded as a base64 SVG. Rendered as the wrapper's
// background-image until the real <img> reports `onLoad`. Kept tiny so it
// adds < 1 KB to the bundle.
const LQIP_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8' fill='%23f4f4f5'/></svg>"
  );

// Low-contrast SVG fallback rendered when the real image errors out. Uses
// neutral zinc tones so it remains visually quiet.
const FALLBACK_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' role='img' aria-hidden='true'>" +
      "<rect width='100' height='100' fill='%23f4f4f5'/>" +
      "<path d='M30 70l15-20 12 14 8-10 15 16H30z' fill='%23d4d4d8'/>" +
      "<circle cx='40' cy='38' r='6' fill='%23d4d4d8'/>" +
      '</svg>'
  );

const ASPECT_RATIO_RE = /^\d+\/\d+$/;

const Image = React.forwardRef(function Image(
  {
    src,
    alt,
    decorative = false,
    aspectRatio = '1/1',
    sizes,
    priority = false,
    placeholder = 'blur',
    placeholderColor,
    onError,
    onLoad,
    className,
    imgClassName,
    widths,
    ...rest
  },
  ref
) {
  const [errored, setErrored] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  // Dev-time accessibility check (Requirement 13.9).
  if (process.env.NODE_ENV !== 'production') {
    if (!decorative && (alt === undefined || alt === '')) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Image] Non-decorative images must provide a non-empty `alt`. ' +
          'Pass `decorative` to opt out or supply descriptive alt text.'
      );
    }
    if (!ASPECT_RATIO_RE.test(String(aspectRatio))) {
      // eslint-disable-next-line no-console
      console.warn(`[Image] Invalid aspectRatio "${aspectRatio}". Expected "<W>/<H>" (e.g. "3/4").`);
    }
  }

  const resolved = getImageUrl(src);
  const srcSet = errored ? '' : buildSrcSet(resolved, widths);
  const defaultSizes = sizes || '100vw';
  const loading = priority ? 'eager' : 'lazy';
  // React 19 supports `fetchPriority` (camelCase) and lowercases it on output.
  const fetchPriority = priority ? 'high' : 'auto';

  const wrapperStyle =
    placeholder === 'blur' && !loaded && !errored
      ? {
          aspectRatio,
          backgroundImage: `url("${LQIP_DATA_URL}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {
          aspectRatio,
          backgroundColor: placeholderColor || undefined,
        };

  const handleLoad = (e) => {
    setLoaded(true);
    if (typeof onLoad === 'function') onLoad(e);
  };

  const handleError = (e) => {
    if (!errored) {
      setErrored(true);
      try {
        track('image_error', { src: resolved || src });
      } catch {
        // analytics must never break rendering
      }
    }
    if (typeof onError === 'function') onError(e);
  };

  // Resolved may be null (no src). Render the placeholder wrapper alone so
  // layout still reserves space and CLS stays at 0.
  if (!resolved) {
    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden bg-muted', className)}
        style={{ aspectRatio, backgroundColor: placeholderColor || undefined }}
        aria-hidden={decorative || undefined}
      />
    );
  }

  const renderedSrc = errored ? FALLBACK_SVG : resolved;

  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden bg-muted', className)}
      style={wrapperStyle}
    >
      <img
        src={renderedSrc}
        srcSet={srcSet || undefined}
        sizes={srcSet ? defaultSizes : undefined}
        alt={decorative ? '' : alt || ''}
        role={decorative ? 'presentation' : undefined}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        data-loaded={loaded ? 'true' : 'false'}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
          loaded || errored ? 'opacity-100' : 'opacity-0',
          imgClassName
        )}
        {...rest}
      />
    </div>
  );
});

export { Image };
export default Image;
