import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import HeroSection from '../components/home/HeroSection';
import ShopByCategory from '../components/home/ShopByCategory';
import NewArrivalsCarousel from '../components/home/NewArrivalsCarousel';
import FeaturedCollection from '../components/home/FeaturedCollection';
import EditorialBlock from '../components/home/EditorialBlock';
import CuratedCollection from '../components/home/CuratedCollection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import BrandStorySection from '../components/home/BrandStorySection';
import InstagramFeed from '../components/home/InstagramFeed';
import NewsletterSignup from '../components/home/NewsletterSignup';
import TrustBadgeRow from '../components/home/TrustBadgeRow';

/**
 * HomePage — the customer landing route at `/`.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md
 *     Requirement 5.1  (homepage section composition order)
 *     Requirement 5.2  (hero priority preload)
 *     Requirement 1.3  (no inline `style={}` attributes)
 *     Requirement 14.7 (preconnect / hero preload baseline)
 *     Requirement 16.1, 16.2, 16.3 (per-route Helmet title/meta/og/canonical)
 *   .kiro/specs/storefront-experience-redesign/design.md
 *     Home (`/`) wireframe and Component Hierarchy
 *
 * Composition (top → bottom, per Requirement 5.1):
 *   1. HeroSection           — full-bleed CMS hero. Hero image rendered via
 *                               `<Image priority>` so the LCP element
 *                               emits `loading="eager"` and
 *                               `fetchpriority="high"` (Requirement 5.2).
 *   2. ShopByCategory        — 4 category tiles
 *   3. NewArrivalsCarousel   — 6 recent products, snap-x
 *   4. FeaturedCollection    — `?featured=true` 1/2/3-col grid
 *   5. EditorialBlock        — CMS lookbook mosaic
 *   6. CuratedCollection     — second curated block (top-rated picks)
 *   7. TestimonialsSection   — up to 3 quote cards from CMS
 *   8. BrandStorySection     — left text, right image
 *   9. InstagramFeed         — 3×2 placeholder UGC grid
 *  10. NewsletterSignup      — email capture (variant="home")
 *  11. TrustBadgeRow         — secure pay / free shipping / easy returns
 *
 * State / data: none. Each organism owns its own data fetch and render
 * lifecycle. The page-level component is a pure composition shell so this
 * file stays trivially testable and the build/replace order in subsequent
 * specs (e.g. swapping CuratedCollection for a CMS-driven landing block)
 * is a one-line change here.
 *
 * SEO scaffolding (Requirements 16.1–16.3):
 *   - <Helmet> declares the per-route title (which composes with the
 *     `%s | NOIR` template from CustomerLayout), description, Open Graph
 *     tags, and canonical URL. The canonical resolves against
 *     `window.location.origin` when available so it works in the browser
 *     and gracefully falls back to a path string during SSR/test runs.
 *   - The Organization JSON-LD ships once at the layout level and is not
 *     duplicated here.
 *
 * Styling: Tailwind utility classes only — every class routes through the
 * design tokens. No inline `style={}` on this page (Requirement 1.3); the
 * only inline styles allowed in the project live inside the `<Image>`
 * primitive itself for `aspectRatio` and dynamic placeholder bg.
 *
 * Layout shell: this component does NOT render its own Navigation /
 * Footer / MobileBottomNav. The `CustomerLayout` template (mounted in
 * `App.js`) provides those (Requirement 2.1).
 */
const PAGE_TITLE = 'Monochrome Luxury';
const PAGE_DESCRIPTION =
  'NOIR — monochrome luxury fashion. Discover sharp-edged silhouettes in our seasonal collections.';

const buildCanonicalUrl = (pathname) => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return `${window.location.origin}${pathname}`;
  }
  return pathname || '/';
};

const HomePage = () => {
  const location = useLocation();
  const canonicalUrl = buildCanonicalUrl(location.pathname || '/');

  return (
    <div className="page-transition min-h-screen bg-background">
      <Helmet>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta property="og:title" content={`${PAGE_TITLE} | NOIR`} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <HeroSection />
      <ShopByCategory />
      <NewArrivalsCarousel />
      <FeaturedCollection />
      <EditorialBlock />
      <CuratedCollection
        title="Editor's Picks"
        subtitle="A second look at the season's standouts"
        queryParams={{ sort: 'rating_desc' }}
        limit={4}
        columns={2}
        ctaLabel="Shop the Edit"
        ctaTo="/shop"
        background="bg-muted"
        data-testid="curated-collection-second"
      />
      <TestimonialsSection />
      <BrandStorySection />
      <InstagramFeed />
      <NewsletterSignup variant="home" />
      <TrustBadgeRow />
    </div>
  );
};

export default HomePage;
