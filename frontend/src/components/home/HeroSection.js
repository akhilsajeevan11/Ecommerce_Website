import * as React from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';
import Image from '../primitives/Image';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';

/**
 * HeroSection — full-bleed hero block at the top of the Homepage.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.2, 14.7)
 *   .kiro/specs/storefront-experience-redesign/design.md       (HeroSection)
 *
 * Behavior:
 *   - Reads the CMS keys `hero_banner_url`, `hero_headline`,
 *     `hero_subheadline`, `hero_cta_label`, and `hero_cta_link` from
 *     `GET /api/site-settings`.
 *   - Renders the hero image via the `<Image>` primitive with
 *     `priority={true}` so it emits `loading="eager"` and
 *     `fetchpriority="high"` (Requirement 5.2). The image is the LCP
 *     element on the Homepage so it must not be lazy-loaded.
 *   - Provides default copy when CMS keys are unset so the layout never
 *     ships an empty hero. The defaults match the original NOIR copy on
 *     the legacy HomePage.
 *
 * a11y posture (design.md a11y table):
 *   - Wrapped in a `<section aria-labelledby>` referencing the headline.
 *   - The CTA is a real `<Link>` so keyboard / screen-reader semantics are
 *     correct out of the box. The trailing arrow icon is `aria-hidden`.
 *   - Hero image alt is the headline text (descriptive — not decorative —
 *     because it carries brand meaning).
 *   - The dark scrim over the image is `aria-hidden` and decorative.
 *
 * Tailwind utility classes only (Requirement 1.3) — no inline `style={`.
 */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DEFAULT_HEADLINE = 'Monochrome Luxury';
const DEFAULT_SUBHEADLINE = 'Timeless fashion in black & white';
const DEFAULT_CTA_LABEL = 'Shop Now';
const DEFAULT_CTA_LINK = '/shop';

const HeroSection = () => {
  const [settings, setSettings] = React.useState({
    hero_banner_url: null,
    hero_headline: '',
    hero_subheadline: '',
    hero_cta_label: '',
    hero_cta_link: '',
  });

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await axios.get(`${API}/site-settings`);
        if (cancelled) return;
        const data = response && response.data ? response.data : {};
        setSettings({
          hero_banner_url:
            typeof data.hero_banner_url === 'string' && data.hero_banner_url.trim()
              ? data.hero_banner_url
              : null,
          hero_headline: typeof data.hero_headline === 'string' ? data.hero_headline : '',
          hero_subheadline:
            typeof data.hero_subheadline === 'string' ? data.hero_subheadline : '',
          hero_cta_label: typeof data.hero_cta_label === 'string' ? data.hero_cta_label : '',
          hero_cta_link: typeof data.hero_cta_link === 'string' ? data.hero_cta_link : '',
        });
      } catch {
        // Network/server failure — defaults render; layout is intact.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const headline = settings.hero_headline || DEFAULT_HEADLINE;
  const subheadline = settings.hero_subheadline || DEFAULT_SUBHEADLINE;
  const ctaLabel = settings.hero_cta_label || DEFAULT_CTA_LABEL;
  const ctaLink = settings.hero_cta_link || DEFAULT_CTA_LINK;

  return (
    <section
      aria-labelledby="hero-headline"
      className="relative w-full overflow-hidden bg-foreground text-background"
      data-testid="hero-section"
    >
      {/* Hero image fills the section. We reserve a tall hero footprint via
          aspectRatio + min-height so the layout is stable across mobile and
          desktop. The Image primitive emits loading="eager" and
          fetchpriority="high" when priority is true (Requirement 5.2). */}
      <div className="absolute inset-0">
        <Image
          src={settings.hero_banner_url}
          alt={headline}
          aspectRatio="16/9"
          sizes="100vw"
          priority
          placeholder="empty"
          imgClassName="brightness-[0.65]"
          className="h-full w-full"
        />
      </div>

      {/* Decorative dark gradient for legibility — separate from the image
          so the placeholder background still feels intentional when CMS
          settings are missing. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-80px)] max-w-screen-2xl flex-col items-center justify-center gap-6 px-4 py-24 text-center sm:px-6 lg:px-12 lg:py-32">
        <Heading
          as="h1"
          size="display"
          id="hero-headline"
          className="text-white drop-shadow-sm"
        >
          {headline}
        </Heading>

        {subheadline ? (
          <Text
            variant="caption"
            className="max-w-xl text-white/80"
          >
            {subheadline}
          </Text>
        ) : null}

        <Link
          to={ctaLink}
          className="mt-4 inline-flex items-center gap-3 bg-background px-8 py-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          data-testid="hero-cta"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export { HeroSection };
export default HeroSection;
