import * as React from 'react';
import Image from '../primitives/Image';
import Text from '../primitives/Text';
import { cn } from '../../lib/utils';

/**
 * Testimonial — molecule rendering a single customer testimonial card.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.7)
 *   .kiro/specs/storefront-experience-redesign/design.md       (Testimonial)
 *
 * Used by:
 *   - <TestimonialsSection> on the Homepage (up to 3 cards, Requirement 5.7).
 *
 * Behavior:
 *   - Renders the quote inside a semantic `<blockquote>` with the author and
 *     role inside a paired `<figcaption>`. The avatar is rendered via the
 *     `<Image>` primitive when an `avatarUrl` is supplied; when missing, the
 *     placeholder background of `<Image>` keeps the layout footprint.
 *   - The quote text uses Bodoni Moda (display register) to give the card a
 *     pull-quote feel; author/role use the JetBrains Mono caption register.
 *
 * a11y posture:
 *   - Native `<figure>` + `<blockquote>` + `<figcaption>` so AT users
 *     announce the structure correctly. The author's name doubles as the
 *     accessible avatar alt when an image is supplied.
 *
 * Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {string} props.quote
 * @param {string} props.author
 * @param {string} [props.role]
 * @param {string} [props.avatarUrl]
 * @param {string} [props.className]
 */
function Testimonial({ quote, author, role, avatarUrl, className }) {
  if (!quote && !author) return null;

  return (
    <figure
      className={cn(
        'flex h-full flex-col justify-between gap-6 border border-border bg-background p-6 sm:p-8',
        className
      )}
      data-testid="testimonial"
    >
      <blockquote className="font-heading text-lg italic leading-snug text-foreground sm:text-xl">
        <span aria-hidden="true" className="mr-1 select-none">“</span>
        {quote}
        <span aria-hidden="true" className="ml-1 select-none">”</span>
      </blockquote>

      <figcaption className="flex items-center gap-3">
        {avatarUrl ? (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <Image
              src={avatarUrl}
              alt={author || 'Customer avatar'}
              aspectRatio="1/1"
              sizes="40px"
              widths={[40, 80, 120]}
            />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="h-10 w-10 shrink-0 rounded-full bg-muted"
          />
        )}
        <div className="flex flex-col">
          {author ? (
            <Text as="span" variant="mono" className="font-semibold text-foreground">
              {author}
            </Text>
          ) : null}
          {role ? (
            <Text as="span" variant="caption" tone="muted">
              {role}
            </Text>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}

export { Testimonial };
export default Testimonial;
