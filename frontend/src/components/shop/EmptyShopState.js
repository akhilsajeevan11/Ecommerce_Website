import * as React from 'react';
import { SearchX } from 'lucide-react';
import Heading from '../primitives/Heading';
import Text from '../primitives/Text';
import { cn } from '../../lib/utils';

/**
 * EmptyShopState — rendered by ProductGrid when the Products_API returns
 * `items.length === 0` after a successful fetch.
 *
 * Spec: Requirement 6.11
 *   - Renders the message "No matches" with a "Clear filters" button that
 *     invokes `clearAll()`. `clearAll` is the same callback returned by
 *     `useShopQuery` and resets every ShopParam to its default.
 *
 * a11y posture:
 *   - Uses a real heading (`<h2>`) so screen-reader users can land on the
 *     empty state via heading navigation.
 *   - The clear-filters action is a real `<button>` with a focus ring; the
 *     icon glyph is `aria-hidden` so the button announces just its label.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {() => void} [props.clearAll] - Resets ShopParams to defaults.
 * @param {string} [props.className]
 */
const EmptyShopState = React.forwardRef(function EmptyShopState(
  { clearAll, className, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:py-24',
        className
      )}
      data-testid="empty-shop-state"
      {...rest}
    >
      <SearchX
        className="h-10 w-10 text-muted-foreground"
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <Heading as="h2" size="h3" className="font-heading">
        No matches
      </Heading>
      <Text variant="body" tone="muted" className="max-w-sm">
        We couldn&apos;t find any products that match your filters. Try clearing
        a filter or starting over.
      </Text>
      {typeof clearAll === 'function' ? (
        <button
          type="button"
          onClick={clearAll}
          className="mt-2 inline-flex h-10 items-center justify-center bg-foreground px-5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="empty-shop-clear-filters"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
});

export { EmptyShopState };
export default EmptyShopState;
