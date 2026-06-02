import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navigation from '../Navigation';
import AnnouncementBar from '../nav/AnnouncementBar';
import Footer from './Footer';
import MobileBottomNav from '../nav/MobileBottomNav';
import { track } from '../../lib/analytics';
import { buildJsonLdOrganization } from '../../utils/seo';

/**
 * CustomerLayout — the shared shell wrapping every customer route.
 *
 * Composition (top → bottom, per Requirement 2.1):
 *   1. "Skip to content" link — first focusable element, points to `#main`
 *      (Requirements 2.1, 15.3).
 *   2. AnnouncementBar — sticky promo banner above Navigation
 *      (Requirements 2.2, 2.3, 2.4 — implemented in task 2.2).
 *   3. Navigation — site-wide top navigation.
 *   4. <main id="main"> — page content slot. Below the `lg` breakpoint we
 *      apply `pb-16` so the fixed `h-14` MobileBottomNav cannot overlay
 *      content (Requirement 2.8).
 *   5. Footer — site-wide footer (Requirements 2.5, 2.6, 2.7 — task 2.3).
 *   6. MobileBottomNav — fixed bottom nav below `lg` (Requirement 4.5 —
 *      implemented in task 2.5).
 *
 * SEO scaffold (Requirements 16.1, 16.2):
 *   - A default <Helmet> declares the title template `%s | NOIR` and a
 *     default meta description. Per-page <Helmet> blocks override the title
 *     and description.
 *   - The Organization JSON-LD from `buildJsonLdOrganization()` is injected
 *     once per page render via `JSON.stringify` so no user-controlled markup
 *     is inserted into the script tag unescaped.
 *
 * Analytics (Requirement 16.9):
 *   - `track('page_view', { path })` fires from a `useEffect` keyed on the
 *     pathname so client-side route changes are instrumented.
 *
 * The sibling components AnnouncementBar, Footer, and MobileBottomNav are
 * shipped as render-nothing stubs in task 2.1 and replaced with full
 * implementations in tasks 2.2, 2.3, and 2.5 respectively.
 */
const CustomerLayout = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;

  // Fire `page_view` on every client-side route change. `track()` is a
  // no-op safe analytics seam (Requirements 16.7, 16.8) so this never
  // throws into the render tree.
  useEffect(() => {
    track('page_view', { path });
  }, [path]);

  const organizationJsonLd = JSON.stringify(buildJsonLdOrganization());

  return (
    <>
      <Helmet defaultTitle="NOIR" titleTemplate="%s | NOIR">
        <meta
          name="description"
          content="NOIR — monochrome luxury fashion. Discover sharp-edged silhouettes in our seasonal collections."
        />
        <script type="application/ld+json">{organizationJsonLd}</script>
      </Helmet>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-black focus:text-white focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:no-underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to content
      </a>

      <AnnouncementBar />
      <Navigation />

      <main id="main" className="pb-16 lg:pb-0">
        {children}
      </main>

      <Footer />
      <MobileBottomNav />
    </>
  );
};

export default CustomerLayout;
