import * as React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * FilterGroup — a Radix Accordion-backed filter section.
 *
 * Used by FilterSidebar / FilterBottomSheet to group filter controls
 * (checkboxes, slider, swatches) under a collapsible header. The header
 * shows a title and an optional count chip (e.g. "Category (3)") that
 * conveys how many values are currently active in this group.
 *
 * Composition note:
 *   `FilterGroup` MUST be rendered inside an `<Accordion.Root>` so that
 *   Radix manages the state machine. A typical FilterSidebar declares one
 *   Accordion.Root with `type="multiple"` and the FilterGroups inside it
 *   so multiple sections can be open at once.
 *
 * Spec: Requirement 6.7, 6.8, 6.9
 *   - The collapsible header pattern is used by both the sticky desktop
 *     Filter_Sidebar and the mobile Filter_Bottom_Sheet, sharing the same
 *     internal control surface.
 *
 * a11y posture (design.md a11y table):
 *   - Radix Accordion gives `aria-expanded`, `aria-controls`, and
 *     keyboard support (Enter/Space toggle, arrow-key navigation between
 *     groups) for free.
 *   - The trigger button gets the standard focus-visible ring so keyboard
 *     users see exactly where focus is.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {string} props.value      - Stable accordion item value (required).
 * @param {string} props.title      - Heading text (e.g. "Category").
 * @param {number} [props.count]    - Optional active-count chip (omitted when 0).
 * @param {boolean} [props.defaultOpen] - When true, the parent should include
 *                                        this `value` in `defaultValue`.
 * @param {React.ReactNode} props.children - The filter controls to render
 *                                           inside the panel.
 * @param {string} [props.className]
 */
const FilterGroup = React.forwardRef(function FilterGroup(
  { value, title, count, children, className, defaultOpen, ...rest },
  ref
) {
  // `defaultOpen` is forwarded as a hint via a data attribute — the parent
  // Accordion.Root is the actual owner of `defaultValue`. We keep this prop
  // here for API ergonomics so callers do not need to manage parallel arrays.
  return (
    <Accordion.Item
      ref={ref}
      value={value}
      className={cn('border-b border-border', className)}
      data-default-open={defaultOpen ? 'true' : undefined}
      {...rest}
    >
      <Accordion.Header className="m-0">
        <Accordion.Trigger
          className={cn(
            'group flex w-full items-center justify-between py-4',
            'font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground',
            'transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
          data-testid={`filter-group-trigger-${value}`}
        >
          <span className="flex items-center gap-2">
            <span>{title}</span>
            {typeof count === 'number' && count > 0 ? (
              <span
                className="inline-flex h-5 min-w-[1.25rem] items-center justify-center bg-foreground px-1.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-background"
                aria-label={`${count} active`}
              >
                {count}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className="h-4 w-4 text-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content
        className={cn(
          'overflow-hidden',
          'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down'
        )}
      >
        <div className="pb-5 pt-1">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
});

export { FilterGroup };
export default FilterGroup;
