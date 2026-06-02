/**
 * Image pipeline pure utilities.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 13)
 *   .kiro/specs/storefront-experience-redesign/design.md       (Image_Component)
 *
 * Both `buildSrcSet` and `applyCdnTransform` are pure (modulo the
 * `window.__NOIR_CDN_TRANSFORM__` global hook which is read-only here) so
 * they can be exercised by fast-check property tests without DOM setup.
 */

// Default width ladder (Requirement 13.4).
export const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536];

/**
 * Routes an image URL through the CDN transform hook when registered, otherwise
 * returns the source unchanged. The hook contract is intentionally minimal so
 * a future Imgix/CloudFront transformer ships without touching call sites.
 *
 * @param {string} src
 * @param {{ w?: number, q?: number, fmt?: "webp"|"avif"|"jpeg"|"png" }} [options]
 * @returns {string}
 */
export function applyCdnTransform(src, options = {}) {
  if (typeof window !== 'undefined' && typeof window.__NOIR_CDN_TRANSFORM__ === 'function') {
    try {
      const transformed = window.__NOIR_CDN_TRANSFORM__(src, options);
      // Defensive: if the hook returns a non-string, fall back to identity.
      return typeof transformed === 'string' ? transformed : src;
    } catch {
      // A misbehaving transformer must never break image rendering.
      return src;
    }
  }
  return src;
}

/**
 * Builds a `srcset` attribute value with one descriptor per width.
 * Returns the empty string when `src` is null/undefined/empty so the Image
 * component never emits a malformed `srcset` (Requirement 13.3).
 *
 * For all non-empty `src` and any non-empty integer widths array the output
 * matches `/^(.+\s\d+w)(,\s.+\s\d+w)*$/` and contains exactly `widths.length`
 * comma-separated descriptors (Requirement 13.2).
 *
 * @param {string|null|undefined} src
 * @param {number[]} [widths]
 * @returns {string}
 */
export function buildSrcSet(src, widths = DEFAULT_WIDTHS) {
  if (src === null || src === undefined || src === '') return '';
  if (!Array.isArray(widths) || widths.length === 0) return '';

  const parts = [];
  for (const w of widths) {
    const transformed = applyCdnTransform(src, { w, q: 75, fmt: 'webp' });
    parts.push(`${transformed} ${w}w`);
  }
  return parts.join(', ');
}
