import * as React from 'react';
import { LayoutGrid, Grid3x3 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * DensityToggle — a two-button toggle for the Product_Grid density.
 *
 * The Shop_Page uses this to switch between a "comfy" 3-column layout at
 * `lg+` and a denser 4-column layout at `lg+`. The component is a pure
 * controlled toggle: it takes a `value` ("comfy" | "compact") and an
 * `onChange` callback, and renders two buttons. When uncontrolled, the
 * component manages its own local state defaulting to "comfy".
 *
 * Spec: Requirement 6.7 (alongside the rest of the shop toolbar). Density
 * itself is local UI state — it is intentionally NOT persisted to the URL
 * because density is a viewing preference, not part of the canonical
 * filtered view that should be shareable.
 *
 * a11y posture:
 *   - Implemented with two `<button role="radio">` elements wrapped in a
 *     `role="radiogroup"` so screen-readers announce "Comfy, selected" /
 *     "Compact, not selected".
 *   - `aria-checked` reflects the active button per the radiogroup pattern.
 *   - Each button has a non-empty `aria-label` describing the action and
 *     a focus-visible ring.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {"comfy"|"compact"} [props.value]    - Controlled value.
 * @param {"comfy"|"compact"} [props.defaultValue="comfy"] - Uncontrolled default.
 * @param {(value: "comfy"|"compact") => void} [props.onChange]
 * @param {string} [props.className]
 */
const DensityToggle = React.forwardRef(function DensityToggle(
  { value, defaultValue = 'comfy', onChange, className, ...rest },
  ref
) {
  const isControlled = value === 'comfy' || value === 'compact';
  const [internal, setInternal] = React.useState(
    defaultValue === 'compact' ? 'compact' : 'comfy'
  );
  const current = isControlled ? value : internal;

  const setValue = React.useCallback(
    (next) => {
      if (!isControlled) setInternal(next);
      if (typeof onChange === 'function') onChange(next);
    },
    [isControlled, onChange]
  );

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label="Grid density"
      className={cn('inline-flex border border-border bg-background', className)}
      data-testid="density-toggle"
      {...rest}
    >
      <DensityButton
        active={current === 'comfy'}
        onSelect={() => setValue('comfy')}
        ariaLabel="Comfortable density"
        data-testid="density-toggle-comfy"
      >
        <LayoutGrid className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </DensityButton>
      <DensityButton
        active={current === 'compact'}
        onSelect={() => setValue('compact')}
        ariaLabel="Compact density"
        data-testid="density-toggle-compact"
      >
        <Grid3x3 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </DensityButton>
    </div>
  );
});

function DensityButton({ active, onSelect, ariaLabel, children, ...rest }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={ariaLabel}
      onClick={onSelect}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active
          ? 'bg-foreground text-background'
          : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export { DensityToggle };
export default DensityToggle;
