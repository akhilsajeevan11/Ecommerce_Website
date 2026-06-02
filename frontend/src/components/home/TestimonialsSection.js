import * as React from 'react';
import axios from 'axios';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import Skeleton from '../primitives/Skeleton';
import Testimonial from '../common/Testimonial';

/**
 * TestimonialsSection — Homepage three-quote section.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.7)
 *   .kiro/specs/storefront-experience-redesign/design.md       (TestimonialsSection)
 *
 * Behavior:
 *   - Reads `testimonials_json` from `GET /api/site-settings` — a JSON
 *     string array of `{quote, author, role, avatar_url}` (per design.md).
 *   - Renders up to 3 cards in a 1 / 2 / 3 column responsive grid.
 *   - Hides itself silently when the JSON is missing, malformed, or empty.
 *
 * Tailwind utility classes only (Requirement 1.3).
 */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const MAX_TESTIMONIALS = 3;

const parseTestimonials = (raw) => {
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
      const quote = typeof entry.quote === 'string' ? entry.quote : '';
      const author = typeof entry.author === 'string' ? entry.author : '';
      // Drop entries with neither a quote nor an author — nothing to show.
      if (!quote && !author) return null;
      return {
        quote,
        author,
        role: typeof entry.role === 'string' ? entry.role : '',
        avatarUrl: typeof entry.avatar_url === 'string' ? entry.avatar_url : '',
      };
    })
    .filter(Boolean)
    .slice(0, MAX_TESTIMONIALS);
};

const TestimonialsSection = () => {
  const [items, setItems] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await axios.get(`${API}/site-settings`);
        if (cancelled) return;
        const parsed = parseTestimonials(response?.data?.testimonials_json);
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

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="w-full bg-muted py-16 lg:py-24"
      data-testid="testimonials-section"
    >
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-12">
        <header className="mb-10 flex flex-col items-center gap-2 text-center lg:mb-14">
          <Heading as="h2" size="h2" id="testimonials-heading">
            What Our Customers Say
          </Heading>
          <Text variant="caption" tone="muted">
            Voices from the NOIR community
          </Text>
        </header>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {isLoading
            ? Array.from({ length: MAX_TESTIMONIALS }).map((_, idx) => (
                <li key={`testimonial-skeleton-${idx}`} className="min-w-0">
                  <Skeleton className="h-56 w-full" />
                </li>
              ))
            : items.map((t, idx) => (
                <li key={`testimonial-${idx}`} className="min-w-0">
                  <Testimonial
                    quote={t.quote}
                    author={t.author}
                    role={t.role}
                    avatarUrl={t.avatarUrl}
                  />
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
};

export { TestimonialsSection };
export default TestimonialsSection;
