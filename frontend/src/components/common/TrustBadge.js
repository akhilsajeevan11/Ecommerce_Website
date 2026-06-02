import * as React from 'react';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import { cn } from '../../lib/utils';

/**
 * TrustBadge — molecule rendering a single trust signal (icon + title +
 * subtitle).
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.12)
 *   .kiro/specs/storefront-experience-redesign/design.md       (TrustBadge)
 *
 * Used by:
 *   - <TrustBadgeRow> on the Homepage (Requirement 5.12, ≥ 3 badges).
 *
 * Behavior:
 *   - Accepts an `icon` slot (typically a lucide-react component) so the
 *     badge stays decoupled from any specific icon library.
 *   - Renders a centered card with the icon above and the title/subtitle
 *     stacked below. The icon is `aria-hidden` because the title already
 *     conveys the trust message — adding it to the AT tree would create
 *     redundant noise.
 *
 * Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {React.ElementType|React.ReactNode} props.icon - lucide component or rendered node.
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {string} [props.className]
 */
function TrustBadge({ icon, title, subtitle, className }) {
  // Allow either a component reference (`icon={Truck}`) or a pre-rendered
  // node (`icon={<Truck />}`). Component references render with sensible
  // defaults; pre-rendered nodes pass through verbatim.
  let iconNode = null;
  if (icon) {
    if (React.isValidElement(icon)) {
      iconNode = icon;
    } else if (typeof icon === 'function') {
      const IconComponent = icon;
      iconNode = (
        <IconComponent className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
      );
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 text-center',
        className
      )}
      data-testid="trust-badge"
    >
      {iconNode ? (
        <div className="flex h-12 w-12 items-center justify-center text-foreground">
          {iconNode}
        </div>
      ) : null}
      <Heading
        as="h3"
        size="h3"
        className="font-heading text-base font-semibold text-foreground sm:text-lg"
      >
        {title}
      </Heading>
      {subtitle ? (
        <Text variant="body" tone="muted" className="max-w-xs text-sm leading-relaxed">
          {subtitle}
        </Text>
      ) : null}
    </div>
  );
}

export { TrustBadge };
export default TrustBadge;
