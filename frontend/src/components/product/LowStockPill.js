import * as React from 'react';
import Badge from '../primitives/Badge';
import { cn } from '../../lib/utils';

/**
 * LowStockPill — small pill rendered on the Product_Detail_Page that surfaces
 * stock pressure when the remaining stock is at or below the low-stock
 * threshold of 5.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 8.6)
 *   .kiro/specs/storefront-experience-redesign/design.md       (Low_Stock_Pill)
 *
 * Render rules:
 *   - When `0 < stock <= 5`, renders the text `"Only {stock} left"` using
 *     the warning Badge variant.
 *   - When `stock <= 0` or `stock > 5`, renders nothing. Out-of-stock
 *     messaging belongs to the Add-to-Cart button (Requirement 8.6); this
 *     pill is the low-stock signal, not the unavailable signal.
 *
 * a11y posture:
 *   - The Badge primitive renders a non-interactive `<span>` with mono
 *     uppercase text (≥ 4.5:1 contrast against `bg-warning`).
 *   - The wrapper carries `role="status"` and `aria-live="polite"` so a
 *     screen-reader announcement fires when the pill becomes visible (e.g.
 *     after a stock refresh moves the count from 6 to 5).
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {number|null|undefined} props.stock
 * @param {string} [props.className]
 */
function LowStockPill({ stock, className }) {
  // Coerce to a finite integer; non-numbers, NaN, and negatives never trigger
  // the pill. The check `> 0 && <= 5` keeps the gate explicit so a future
  // threshold change (e.g. tokenized via site settings) is a one-line update.
  const n = typeof stock === 'number' && Number.isFinite(stock) ? Math.floor(stock) : null;
  if (n === null || n <= 0 || n > 5) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="low-stock-pill"
      className={cn('inline-flex', className)}
    >
      <Badge variant="lowStock">{`Only ${n} left`}</Badge>
    </div>
  );
}

export { LowStockPill };
export default LowStockPill;
