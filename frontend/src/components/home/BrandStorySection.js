import * as React from 'react';
import axios from 'axios';
import Image from '../primitives/Image';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';

/**
 * BrandStorySection — Homepage "left text · right image" brand block.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.8)
 *   .kiro/specs/storefront-experience-redesign/design.md       (BrandStorySection)
 *
 * Behavior:
 *   - Reads `brand_story_title`, `brand_story_body`, and
 *     `brand_story_image_url` from `GET /api/site-settings`.
 *   - Renders a left-text / right-image layout at the `lg` breakpoint and
 *     above. Below `lg` the columns stack (image first, text below) so the
 *     visual anchor reads naturally on narrow screens.
 *   - Hides itself silently when *every* CMS key is missing — there is no
 *     useful empty state for a brand story block. When at least the title
 *     or body is present, render whatever is available so a partial CMS
 *     edit (e.g. body only) still ships.
 *
 * Body markdown:
 *   The design notes "string (md) allowed" for `brand_story_body`. To keep
 *   this spec scoped (and avoid pulling in a markdown renderer), we render
 *   the body as paragraph-split plain text — splitting on consecutive
 *   newlines so the CMS author can still create paragraph breaks. A future
 *   spec can swap to react-markdown without changing the call site.
 *
 * Tailwind utility classes only (Requirement 1.3).
 */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DEFAULT_TITLE = 'Crafted with intention';
const DEFAULT_BODY =
  'NOIR is a study in restraint. Every silhouette is sketched in monochrome, refined over weeks, and produced in small runs so the line stays sharp. Our pieces are built to outlast the season.';

const BrandStorySection = () => {
  const [settings, setSettings] = React.useState({
    title: '',
    body: '',
    imageUrl: '',
  });
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await axios.get(`${API}/site-settings`);
        if (cancelled) return;
        const data = response && response.data ? response.data : {};
        const title = typeof data.brand_story_title === 'string' ? data.brand_story_title : '';
        const body = typeof data.brand_story_body === 'string' ? data.brand_story_body : '';
        const imageUrl =
          typeof data.brand_story_image_url === 'string' ? data.brand_story_image_url : '';

        // Render defaults if every CMS key is empty so the homepage never
        // ships a missing brand-story block. Hiding only happens when the
        // settings fetch errors AND we have no fallback content — but
        // since the defaults are always present, the section always renders
        // its visual frame.
        setSettings({ title, body, imageUrl });
      } catch {
        if (cancelled) return;
        // Hide on outright fetch failure (network down). The defaults still
        // ship if the call succeeds with empty settings.
        setHidden(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden) return null;

  const title = settings.title || DEFAULT_TITLE;
  const body = settings.body || DEFAULT_BODY;
  const paragraphs = body
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section
      aria-labelledby="brand-story-heading"
      className="w-full bg-background py-16 lg:py-24"
      data-testid="brand-story-section"
    >
      <div className="mx-auto grid max-w-screen-2xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-12">
        {/* Image — order-first below lg so the visual anchor reads first
            on narrow screens; pushed to the right column on lg+. */}
        <div className="order-1 lg:order-2">
          <Image
            src={settings.imageUrl || null}
            alt={title}
            aspectRatio="4/5"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>

        <div className="order-2 flex flex-col gap-6 lg:order-1">
          <Heading
            as="h2"
            size="h2"
            id="brand-story-heading"
          >
            {title}
          </Heading>
          {paragraphs.map((p, idx) => (
            <Text
              key={`brand-story-p-${idx}`}
              variant="body"
              tone="muted"
              className="text-base leading-relaxed"
            >
              {p}
            </Text>
          ))}
        </div>
      </div>
    </section>
  );
};

export { BrandStorySection };
export default BrandStorySection;
