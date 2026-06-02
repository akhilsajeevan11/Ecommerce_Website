import * as React from 'react';
import axios from 'axios';
import { Instagram } from 'lucide-react';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import Image from '../primitives/Image';

/**
 * InstagramFeed — Homepage 3×2 UGC grid.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.9)
 *
 * Behavior:
 *   - Reads `instagram_images` (JSON array of up to 6 URLs),
 *     `instagram_handle`, and `instagram_url` from GET /api/site-settings.
 *   - When images are configured by admin they render in the grid.
 *   - When no images are set, falls back to 6 placeholder grey tiles.
 *   - Every tile links to `instagram_url` (or the default profileUrl prop).
 *   - The heading shows `instagram_handle` (or the default handle prop).
 *   - The `handle` and `profileUrl` props still work as fallbacks when the
 *     CMS keys are not set — the component signature is unchanged.
 *
 * @param {object} [props]
 * @param {string[]} [props.images]    - Optional override for real UGC URLs.
 * @param {string}   [props.handle="@noir"]
 * @param {string}   [props.profileUrl="https://instagram.com/"]
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const TILE_COUNT = 6;

const InstagramFeed = ({
  images,
  handle = '@noir',
  profileUrl = 'https://instagram.com/',
} = {}) => {
  const [cmsImages, setCmsImages] = React.useState(null);   // null = not loaded yet
  const [cmsHandle, setCmsHandle] = React.useState(null);
  const [cmsUrl, setCmsUrl] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const resp = await axios.get(`${API}/site-settings`);
        if (cancelled) return;
        const data = resp.data || {};

        // Parse the JSON array stored under instagram_images
        let imgs = null;
        if (typeof data.instagram_images === 'string' && data.instagram_images.trim()) {
          try {
            const parsed = JSON.parse(data.instagram_images);
            if (Array.isArray(parsed) && parsed.length > 0) {
              imgs = parsed.filter(u => typeof u === 'string' && u.trim()).slice(0, TILE_COUNT);
            }
          } catch {
            // malformed JSON — treat as not set
          }
        }

        setCmsImages(imgs);
        setCmsHandle(typeof data.instagram_handle === 'string' && data.instagram_handle.trim()
          ? data.instagram_handle.trim()
          : null);
        setCmsUrl(typeof data.instagram_url === 'string' && data.instagram_url.trim()
          ? data.instagram_url.trim()
          : null);
      } catch {
        if (!cancelled) {
          setCmsImages(null);
          setCmsHandle(null);
          setCmsUrl(null);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Resolve display values — CMS takes priority, then props, then defaults
  const displayHandle = cmsHandle || handle;
  const displayUrl = cmsUrl || profileUrl;

  // Resolve tiles — explicit prop > CMS > placeholders
  const resolvedImages = Array.isArray(images) && images.length > 0
    ? images.slice(0, TILE_COUNT)
    : (cmsImages && cmsImages.length > 0 ? cmsImages : null);

  const tiles = resolvedImages
    ? [...resolvedImages, ...Array(Math.max(0, TILE_COUNT - resolvedImages.length))]
    : Array.from({ length: TILE_COUNT });

  return (
    <section
      aria-labelledby="instagram-feed-heading"
      className="w-full bg-background py-16 lg:py-24"
      data-testid="instagram-feed"
    >
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-12">
        <header className="mb-10 flex flex-col items-center gap-2 text-center lg:mb-14">
          <Heading as="h2" size="h2" id="instagram-feed-heading">
            Follow {displayHandle}
          </Heading>
          <Text variant="caption" tone="muted">
            Tag your fits with #wearnoir for a feature
          </Text>
        </header>

        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
          {tiles.map((src, idx) => (
            <li key={`ig-tile-${idx}`} className="min-w-0">
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${displayHandle} on Instagram`}
                className="group relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:scale-[1.02] rounded-xl overflow-hidden"
              >
                {typeof src === 'string' && src ? (
                  <Image
                    src={src}
                    alt={`${displayHandle} on Instagram`}
                    aspectRatio="1/1"
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="rounded-xl"
                    imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground transition-colors group-hover:text-foreground"
                  >
                    <Instagram
                      className="h-8 w-8"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>
                )}

                {/* Dark hover overlay */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20 rounded-xl"
                />

                {/* Instagram icon overlay on real images */}
                {typeof src === 'string' && src ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-60 transition-opacity duration-300 group-hover:opacity-0"
                  >
                    <Instagram
                      className="h-8 w-8 text-white drop-shadow"
                      strokeWidth={1.5}
                    />
                  </div>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export { InstagramFeed };
export default InstagramFeed;
