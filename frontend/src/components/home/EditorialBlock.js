import * as React from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import Image from '../primitives/Image';
import Skeleton from '../primitives/Skeleton';

/**
 * EditorialBlock — Homepage CMS-driven image-and-text mosaic ("lookbook").
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.6)
 *   .kiro/specs/storefront-experience-redesign/design.md       (EditorialBlock)
 *
 * Behavior:
 *   - Reads `lookbook_image_urls` from `GET /api/site-settings` — a JSON
 *     string array of `{url, caption, link}` (per design.md SiteSettings
 *     spec).
 *   - Renders the entries as a 2-column image-text mosaic (1-col below
 *     `md`). When an entry has a `link`, the entire tile is wrapped in a
 *     `<Link>` (internal path) or `<a>` (external URL).
 *   - Hides itself silently when the JSON is missing, malformed, or empty
 *     — no half-rendered editorial panel ships.
 *
 * a11y posture:
 *   - Each tile renders a single click target so keyboard navigation is
 *     unambiguous. The image alt is the caption when present (the caption
 *     describes the editorial intent); when the caption is missing we fall
 *     back to a generic "Editorial image" alt rather than risking an empty
 *     alt on a meaningful image.
 *
 * Tailwind utility classes only (Requirement 1.3).
 */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const parseLookbook = (raw) => {
  if (!raw || typeof raw !== 'string') return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const url = typeof entry.url === 'string' ? entry.url.trim() : '';
      if (!url) return null;
      return {
        url,
        caption: typeof entry.caption === 'string' ? entry.caption : '',
        link: typeof entry.link === 'string' ? entry.link : '',
      };
    })
    .filter(Boolean);
};

const isExternalLink = (link) => /^https?:\/\//i.test(link);

const EditorialBlock = () => {
  const [items, setItems] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await axios.get(`${API}/site-settings`);
        if (cancelled) return;
        const raw = response?.data?.lookbook_image_urls;
        const parsed = parseLookbook(raw);
        if (parsed.length === 0) {
          setHidden(true);
        } else {
          setItems(parsed);
          setHidden(false);
        }
      } catch {
        if (cancelled) return;
        setHidden(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden && !isLoading) return null;

  // While loading we render a 2-tile skeleton so the section's footprint is
  // stable. After the response we render every entry (no hard cap — the
  // CMS author owns the count).
  return (
    <section
      aria-labelledby="editorial-heading"
      className="w-full bg-background py-16 lg:py-24"
      data-testid="editorial-block"
    >
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-12">
        <header className="mb-10 flex flex-col gap-2 lg:mb-14">
          <Heading as="h2" size="h2" id="editorial-heading">
            The Lookbook
          </Heading>
          <Text variant="caption" tone="muted">
            Editorial moments from the studio
          </Text>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {isLoading
            ? Array.from({ length: 2 }).map((_, idx) => (
                <Skeleton key={`editorial-skeleton-${idx}`} className="aspect-[4/5] w-full" />
              ))
            : items.map((entry, idx) => {
                const alt = entry.caption || 'Editorial image';
                const tile = (
                  <div className="group relative block overflow-hidden bg-muted">
                    <Image
                      src={entry.url}
                      alt={alt}
                      aspectRatio="4/5"
                      sizes="(min-width: 768px) 50vw, 100vw"
                      imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    {entry.caption ? (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent p-4 sm:p-6">
                        <Text
                          as="span"
                          variant="caption"
                          className="text-white"
                        >
                          {entry.caption}
                        </Text>
                      </div>
                    ) : null}
                  </div>
                );

                if (!entry.link) {
                  return (
                    <div key={`editorial-${idx}`} className="block">
                      {tile}
                    </div>
                  );
                }

                if (isExternalLink(entry.link)) {
                  return (
                    <a
                      key={`editorial-${idx}`}
                      href={entry.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {tile}
                    </a>
                  );
                }

                return (
                  <Link
                    key={`editorial-${idx}`}
                    to={entry.link}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {tile}
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
};

export { EditorialBlock };
export default EditorialBlock;
