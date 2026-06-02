import * as React from 'react';
import CuratedCollection from './CuratedCollection';

/**
 * FeaturedCollection — Homepage block of featured products.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.5)
 *   .kiro/specs/storefront-experience-redesign/design.md       (FeaturedCollection)
 *
 * Behavior:
 *   - Thin wrapper over `<CuratedCollection>` that hard-codes the
 *     `featured=true` request and the 1 / 2 / 3 column responsive layout
 *     required by Requirement 5.5 (3-col `lg+`, 2-col `md`, 1-col below
 *     `md`). The Products_API preserves the legacy `featured=true`
 *     behavior so this fetch is contract-stable.
 *   - Defaults the heading and CTA to match the original NOIR copy on the
 *     legacy HomePage. Callers can override `title`, `subtitle`,
 *     `ctaLabel`, and `ctaTo` for variant placements.
 *
 * Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} [props]
 * @param {string} [props.title="Featured Collection"]
 * @param {string} [props.subtitle="Curated pieces for the season"]
 * @param {string} [props.ctaLabel="View All"]
 * @param {string} [props.ctaTo="/shop"]
 * @param {number} [props.limit=6]
 * @param {string} [props.className]
 */
function FeaturedCollection({
  title = 'Featured Collection',
  subtitle = 'Curated pieces for the season',
  ctaLabel = 'View All',
  ctaTo = '/shop',
  limit = 6,
  className,
  ...rest
}) {
  return (
    <CuratedCollection
      title={title}
      subtitle={subtitle}
      ctaLabel={ctaLabel}
      ctaTo={ctaTo}
      queryParams={{ featured: 'true' }}
      limit={limit}
      // 1 / 2 / 3 col responsive (Requirement 5.5).
      columns={3}
      className={className}
      data-testid={rest['data-testid'] || 'featured-collection'}
    />
  );
}

export { FeaturedCollection };
export default FeaturedCollection;
