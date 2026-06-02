import * as React from 'react';
import { ShieldCheck, Truck, RotateCcw, Headphones } from 'lucide-react';
import TrustBadge from '../common/TrustBadge';

/**
 * TrustBadgeRow — Homepage row of trust signals.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 5.12)
 *   .kiro/specs/storefront-experience-redesign/design.md       (TrustBadgeRow)
 *
 * Behavior:
 *   - Renders at minimum the three badges required by Requirement 5.12
 *     (secure payment, free shipping, easy returns) plus an optional
 *     "24/7 support" badge so the row composes nicely as a 4-column grid
 *     at `lg+`. Below `lg` the badges wrap to a 2-column grid; below `sm`
 *     they stack.
 *   - Each badge uses the `<TrustBadge>` molecule from `common/`.
 *   - Accepts an optional `badges` prop so callers can override the
 *     defaults (e.g. a future variant placement on cart confirmation).
 *
 * Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} [props]
 * @param {Array<{ icon: any, title: string, subtitle?: string }>} [props.badges]
 * @param {string} [props.className]
 */
const DEFAULT_BADGES = [
  {
    icon: ShieldCheck,
    title: 'Secure payment',
    subtitle: 'Encrypted checkout with trusted gateways',
  },
  {
    icon: Truck,
    title: 'Free shipping',
    subtitle: 'On orders over ₹2,999 across India',
  },
  {
    icon: RotateCcw,
    title: 'Easy returns',
    subtitle: '30-day return window, no questions asked',
  },
  {
    icon: Headphones,
    title: '24/7 support',
    subtitle: 'Our concierge is always one tap away',
  },
];

const TrustBadgeRow = ({ badges, className } = {}) => {
  const items =
    Array.isArray(badges) && badges.length >= 3 ? badges : DEFAULT_BADGES;

  return (
    <section
      aria-label="Why shop with NOIR"
      className={`w-full border-t border-border bg-muted py-12 lg:py-16 ${className || ''}`}
      data-testid="trust-badge-row"
    >
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-12">
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {items.map((badge, idx) => (
            <li key={`trust-${idx}`} className="flex">
              <TrustBadge
                icon={badge.icon}
                title={badge.title}
                subtitle={badge.subtitle}
                className="w-full"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export { TrustBadgeRow };
export default TrustBadgeRow;
