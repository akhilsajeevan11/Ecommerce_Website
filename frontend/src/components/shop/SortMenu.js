import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';

/**
 * SortMenu — exposes the five sort values declared by Requirement 6.12 via
 * a shadcn/Radix `Select` combobox.
 *
 * Spec: Requirement 6.12
 *   - Exactly five values: `newest`, `price_asc`, `price_desc`,
 *     `rating_desc`, `popularity`.
 *   - Selecting any value other than `newest` writes a `sort` param to the
 *     URL — the "default never appears" rule is enforced by
 *     `serializeShopParams` in `lib/shopQuery.js`, so the SortMenu just
 *     reports the value through `onValueChange`. The parent page (or
 *     `useShopQuery.setParam`) handles serialization.
 *
 * a11y posture (design.md a11y table):
 *   - Radix Select gives `role="combobox"`, listbox semantics, full
 *     keyboard support (Up/Down/Home/End/Enter/Escape) for free.
 *   - The trigger gets the standard focus-visible ring; an `aria-label` is
 *     attached so screen-reader users hear "Sort by" not "Combobox".
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {"newest"|"price_asc"|"price_desc"|"rating_desc"|"popularity"} [props.value="newest"]
 * @param {(value: "newest"|"price_asc"|"price_desc"|"rating_desc"|"popularity") => void} props.onValueChange
 * @param {string} [props.className] - Wrapper (trigger) class.
 * @param {string} [props.id]        - Optional trigger id for label association.
 */
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating_desc', label: 'Top Rated' },
  { value: 'popularity', label: 'Popularity' },
];

const VALID_VALUES = new Set(SORT_OPTIONS.map((o) => o.value));

function SortMenu({ value = 'newest', onValueChange, className, id, ...rest }) {
  // Defensive: coerce unknown values to the default (matches the
  // `normalize` semantics in lib/shopQuery.js — Requirement 6.3).
  const safeValue = VALID_VALUES.has(value) ? value : 'newest';

  const handleChange = React.useCallback(
    (next) => {
      if (typeof onValueChange === 'function') onValueChange(next);
    },
    [onValueChange]
  );

  return (
    <Select value={safeValue} onValueChange={handleChange} {...rest}>
      <SelectTrigger
        id={id}
        aria-label="Sort products"
        data-testid="sort-menu-trigger"
        className={cn(
          'w-full sm:w-48 border border-border bg-background font-mono text-xs uppercase tracking-[0.15em] text-foreground rounded-none',
          className
        )}
      >
        <SelectValue placeholder="Newest" />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="rounded-none border border-border bg-popover text-popover-foreground"
      >
        {SORT_OPTIONS.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="font-mono text-xs uppercase tracking-[0.15em]"
            data-testid={`sort-menu-option-${opt.value}`}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const SORT_VALUES = SORT_OPTIONS.map((o) => o.value);
export { SortMenu };
export default SortMenu;
