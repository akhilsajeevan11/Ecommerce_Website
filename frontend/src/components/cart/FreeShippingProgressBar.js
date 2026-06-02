import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatPrice } from '../../lib/formatters';
import { Package } from 'lucide-react';

/**
 * Pure function — progress percentage toward free shipping threshold.
 *
 * Exported for property testing (Task 11.2).
 *
 * Guarantees:
 *   - progressPct ∈ [0, 1]  (clamped)
 *   - monotonic in `subtotal` (subtotal1 ≤ subtotal2 ⟹ progressPct(s1,t) ≤ progressPct(s2,t))
 *
 * @param {number} subtotal — cart subtotal in ₹ (≥ 0)
 * @param {number} threshold — free-shipping threshold in ₹ (> 0)
 * @returns {number} value in [0, 1]
 *
 * Source spec:
 *   Requirement 10.1 — fill = min(subtotal/threshold, 1)
 *   Requirement 10.2 — monotonic and clamped
 */
export function progressPct(subtotal, threshold) {
  if (threshold <= 0) return 1;
  if (subtotal <= 0) return 0;
  return Math.min(subtotal / threshold, 1);
}

/**
 * FreeShippingProgressBar — visual progress bar toward free shipping.
 *
 * @param {object} props
 * @param {number} props.subtotal — current cart subtotal in ₹
 * @param {number} [props.threshold=2999] — free-shipping threshold in ₹
 * @returns {JSX.Element}
 *
 * Source spec:
 *   Requirement 10.1 — fill width = progressPct * 100%
 *   Requirement 10.3 — messaging: "Add ₹X for free shipping" vs "Free shipping unlocked 🎉"
 */
const FreeShippingProgressBar = ({ subtotal = 0, threshold = 2999 }) => {
  const prefersReducedMotion = useReducedMotion();
  const pct = progressPct(subtotal, threshold);
  const isUnlocked = subtotal >= threshold;
  const remaining = threshold - subtotal;

  return (
    <div
      className="w-full space-y-2"
      role="region"
      aria-label="Free shipping progress"
      data-testid="free-shipping-progress"
    >
      {/* Progress bar track */}
      <div className="relative h-2 w-full overflow-hidden bg-muted">
        <motion.div
          className={`absolute inset-y-0 left-0 ${
            isUnlocked ? 'bg-success' : 'bg-primary'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
          }
          data-testid="free-shipping-fill"
        />
      </div>

      {/* Message */}
      <div className="flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <p
          className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground"
          data-testid="free-shipping-message"
        >
          {isUnlocked
            ? 'Free shipping unlocked 🎉'
            : `Add ${formatPrice(remaining)} for free shipping`}
        </p>
      </div>
    </div>
  );
};

export default FreeShippingProgressBar;
