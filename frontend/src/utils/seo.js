/**
 * SEO helpers for schema.org JSON-LD.
 *
 * Contract: each builder returns a plain JavaScript object. Callers are
 * expected to serialize the object with `JSON.stringify` inside a Helmet
 * `<script type="application/ld+json">` tag, e.g.:
 *
 *   <Helmet>
 *     <script type="application/ld+json">
 *       {JSON.stringify(buildJsonLdProduct(product, canonicalUrl))}
 *     </script>
 *   </Helmet>
 *
 * Returning an object (not a string) keeps the helper testable, lets React
 * Helmet handle the script tag, and routes all serialization through
 * `JSON.stringify` so HTML special characters in product fields (`<`, `>`,
 * `&`, quotes) are JSON-escaped. No user-controlled markup is ever embedded
 * into the script tag unescaped.
 *
 * Aligns with Requirements 16.1, 16.2, 16.3, 16.4 and Requirement 8.12.
 */

const NOIR_BRAND_NAME = 'NOIR';
const NOIR_DEFAULT_LOGO_PATH = '/logo.png';

/**
 * Resolve the absolute origin (protocol + host) for the storefront. Used for
 * the Organization `url` and `logo` fields when no override is supplied.
 *
 * @returns {string} Origin like `https://noir.example` (no trailing slash).
 */
function resolveSiteOrigin() {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return '';
}

/**
 * Default `sameAs` URLs for the Organization JSON-LD. The storefront will
 * later replace these with `footer_social_links` from site settings, but a
 * sensible default keeps the schema valid before that wiring lands.
 *
 * @type {string[]}
 */
const DEFAULT_SAME_AS = [
  'https://www.instagram.com/noir',
];

/**
 * Build a schema.org `Product` JSON-LD object.
 *
 * Per Requirement 8.12 / 16.3 the shape is:
 *   - `name`         from `product.name`
 *   - `image`        from `product.images` (array of URLs)
 *   - `description`  from `product.description`
 *   - `sku`          from `product.barcode_id`
 *   - `brand`        always `{ @type: "Brand", name: "NOIR" }`
 *   - `offers`       with `priceCurrency: "INR"`, `price`, `availability`
 *                    (`InStock` when `stock > 0` else `OutOfStock`), `url`
 *   - `aggregateRating` is included only when `product.review_count > 0`;
 *     when `review_count === 0` (or missing) the key is omitted entirely so
 *     `JSON.stringify` does not emit `"aggregateRating": null`.
 *
 * The result is a plain object — caller serializes via `JSON.stringify`.
 *
 * @param {object} product Product record from `/api/products`.
 * @param {string} product.name
 * @param {string[]} [product.images]
 * @param {string} [product.description]
 * @param {string|null} [product.barcode_id]
 * @param {number} product.price
 * @param {number} product.stock
 * @param {number} [product.rating]
 * @param {number} [product.review_count]
 * @param {string} canonicalUrl Absolute URL for this product page.
 * @returns {object} schema.org Product JSON-LD as a plain object.
 */
export function buildJsonLdProduct(product, canonicalUrl) {
  const safeProduct = product || {};
  const stock = typeof safeProduct.stock === 'number' ? safeProduct.stock : 0;
  const reviewCount = typeof safeProduct.review_count === 'number'
    ? safeProduct.review_count
    : 0;

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: safeProduct.name,
    image: Array.isArray(safeProduct.images) ? safeProduct.images : [],
    description: safeProduct.description,
    sku: safeProduct.barcode_id,
    brand: {
      '@type': 'Brand',
      name: NOIR_BRAND_NAME,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: safeProduct.price,
      availability: stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: canonicalUrl,
    },
  };

  if (reviewCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: safeProduct.rating,
      reviewCount: reviewCount,
    };
  }

  return jsonLd;
}

/**
 * Build a schema.org `Organization` JSON-LD object for the NOIR brand.
 *
 * Per Requirement 16.2 the Customer_Layout injects this once per page
 * render. The defaults below are sensible placeholders; once the storefront
 * surfaces `footer_social_links` from site settings, callers can pass them
 * via `opts.sameAs`.
 *
 * @param {object} [opts] Optional overrides — all fields are optional.
 * @param {string} [opts.url]   Absolute site URL (defaults to current origin).
 * @param {string} [opts.logo]  Absolute logo URL (defaults to `${url}/logo.png`).
 * @param {string[]} [opts.sameAs] Social profile URLs.
 * @returns {object} schema.org Organization JSON-LD as a plain object.
 */
export function buildJsonLdOrganization(opts) {
  const options = opts || {};
  const url = typeof options.url === 'string' && options.url
    ? options.url
    : resolveSiteOrigin();
  const logo = typeof options.logo === 'string' && options.logo
    ? options.logo
    : `${url}${NOIR_DEFAULT_LOGO_PATH}`;
  const sameAs = Array.isArray(options.sameAs) && options.sameAs.length > 0
    ? options.sameAs.filter((entry) => typeof entry === 'string' && entry.length > 0)
    : DEFAULT_SAME_AS.slice();

  return {
    '@context': 'https://schema.org/',
    '@type': 'Organization',
    name: NOIR_BRAND_NAME,
    url: url,
    logo: logo,
    sameAs: sameAs,
  };
}
