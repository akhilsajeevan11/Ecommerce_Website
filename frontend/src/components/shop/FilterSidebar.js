import * as React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { Check, Star } from 'lucide-react';
import { Slider } from '../ui/slider';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { defaultShopParams } from '../../lib/shopQuery';
import { formatPrice } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import FilterGroup from './FilterGroup';

/**
 * FilterSidebar — sticky filter panel for the Shop_Page (lg+).
 *
 * Composes a single Radix Accordion of FilterGroups (Category, Price, Size,
 * Color, Rating) plus an "In stock" checkbox. The same internal control
 * surface (`<FilterControls />`) is rendered by `FilterBottomSheet` below
 * `lg`, so the two views stay in lock-step.
 *
 * Spec: Requirement 6.7, 6.8
 *   - Sticky to the top of the viewport at the `lg` breakpoint and above.
 *   - Stays within the viewport during page scroll (`lg:sticky lg:top-24`).
 *   - Hidden below `lg` (the FilterBottomSheet handles those viewports).
 *
 * Props:
 *   `params` is the full ShopParams object (from `useShopQuery`). The
 *   sidebar mutates state through `setParam` / `setParams` so it stays
 *   testable in isolation — passing the hook's writers as props is the
 *   preferred contract per the design notes.
 *
 *   `availableCategories` is supplied by the parent (the Shop_Page fetches
 *   `GET /api/categories` once and passes the result down). Sizes and
 *   colors are hardcoded here per the design's "no dedicated endpoint"
 *   note — overridable via `availableSizes` / `availableColors` if a
 *   future spec adds them as filter facets.
 *
 * a11y posture (design.md a11y table):
 *   - The sidebar is an `<aside role="complementary" aria-label="Filters">`
 *     so AT users can jump straight to it via landmark navigation.
 *   - All controls (checkboxes, slider thumbs, swatch buttons) carry
 *     accessible labels and the Radix primitives provide keyboard support
 *     for free.
 *   - The focus ring is the standard `focus-visible:ring-2 ring-ring`.
 *
 * Styling: Tailwind utility classes only (Requirement 1.3).
 *
 * @param {object} props
 * @param {import('../../lib/shopQuery').ShopParams} props.params
 * @param {<K extends keyof import('../../lib/shopQuery').ShopParams>(key: K, value: import('../../lib/shopQuery').ShopParams[K]) => void} [props.setParam]
 * @param {(patch: Partial<import('../../lib/shopQuery').ShopParams>) => void} [props.setParams]
 * @param {Array<{id: string|number, name: string, slug?: string, product_count?: number}>} [props.availableCategories]
 * @param {string[]} [props.availableSizes]
 * @param {string[]} [props.availableColors]
 * @param {[number, number]} [props.priceBounds=[0, 10000]]
 * @param {string} [props.className]
 */

// Hardcoded option lists (per design.md "Available filter values"):
export const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Each color carries a swatch hex so the UI can render a visible dot.
// Hex values match the design system's neutral palette plus the basic
// fashion tones called out in the design doc.
export const DEFAULT_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Grey', hex: '#9ca3af' },
  { name: 'Beige', hex: '#d6c7a3' },
  { name: 'Brown', hex: '#6b4423' },
  { name: 'Navy', hex: '#1e2a47' },
  { name: 'Olive', hex: '#556b2f' },
];

const RATING_BINS = [
  { value: 4, label: '4★ & up' },
  { value: 3, label: '3★ & up' },
  { value: 2, label: '2★ & up' },
  { value: 1, label: '1★ & up' },
];

const PRICE_STEP = 100;

function FilterSidebar({
  params,
  setParam,
  setParams,
  availableCategories,
  availableSizes = DEFAULT_SIZES,
  availableColors = DEFAULT_COLORS,
  priceBounds = [0, 10000],
  className,
  ...rest
}) {
  return (
    <aside
      role="complementary"
      aria-label="Filters"
      className={cn(
        'hidden lg:block lg:w-64 lg:shrink-0',
        'lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2',
        className
      )}
      data-testid="filter-sidebar"
      {...rest}
    >
      <FilterControls
        params={params}
        setParam={setParam}
        setParams={setParams}
        availableCategories={availableCategories}
        availableSizes={availableSizes}
        availableColors={availableColors}
        priceBounds={priceBounds}
      />
    </aside>
  );
}

/* -------------------------------------------------------------------------
 * FilterControls — shared control surface used by both the desktop sidebar
 * and the mobile bottom sheet so the two views always stay in sync.
 * ----------------------------------------------------------------------- */

export function FilterControls({
  params,
  setParam,
  setParams,
  availableCategories,
  availableSizes = DEFAULT_SIZES,
  availableColors = DEFAULT_COLORS,
  priceBounds = [0, 10000],
}) {
  const safeParams = params || defaultShopParams;
  const setParamFn = typeof setParam === 'function' ? setParam : () => {};
  const setParamsFn = typeof setParams === 'function' ? setParams : () => {};

  // Default the accordion to all groups open so customers see filter
  // affordances without having to click into each section first.
  const defaultOpen = ['category', 'price', 'size', 'color', 'rating'];

  return (
    <Accordion.Root
      type="multiple"
      defaultValue={defaultOpen}
      className="flex w-full flex-col"
    >
      <FilterGroup
        value="category"
        title="Category"
        count={(safeParams.category || []).length}
      >
        <CategoryFilter
          values={safeParams.category || []}
          options={availableCategories || []}
          onChange={(next) => setParamFn('category', next)}
        />
      </FilterGroup>

      <FilterGroup
        value="price"
        title="Price"
        count={priceCount(safeParams.min, safeParams.max)}
      >
        <PriceFilter
          min={safeParams.min}
          max={safeParams.max}
          bounds={priceBounds}
          onChange={(nextMin, nextMax) => setParamsFn({ min: nextMin, max: nextMax })}
        />
      </FilterGroup>

      <FilterGroup
        value="size"
        title="Size"
        count={(safeParams.sizes || []).length}
      >
        <SizeFilter
          values={safeParams.sizes || []}
          options={availableSizes}
          onChange={(next) => setParamFn('sizes', next)}
        />
      </FilterGroup>

      <FilterGroup
        value="color"
        title="Color"
        count={(safeParams.colors || []).length}
      >
        <ColorFilter
          values={safeParams.colors || []}
          options={availableColors}
          onChange={(next) => setParamFn('colors', next)}
        />
      </FilterGroup>

      <FilterGroup
        value="rating"
        title="Rating"
        count={safeParams.rating ? 1 : 0}
      >
        <RatingFilter
          value={safeParams.rating}
          onChange={(next) => setParamFn('rating', next)}
        />
      </FilterGroup>

      {/* In-stock checkbox lives outside the accordion since it's a single
          boolean — wrapping it in a collapsible group would add ceremony
          without value. */}
      <div className="flex items-center gap-3 py-4">
        <Checkbox
          id="filter-in-stock"
          checked={safeParams.inStock === true}
          onCheckedChange={(checked) => setParamFn('inStock', checked === true)}
          data-testid="filter-in-stock"
        />
        <Label
          htmlFor="filter-in-stock"
          className="cursor-pointer font-mono text-xs uppercase tracking-[0.15em] text-foreground"
        >
          In stock only
        </Label>
      </div>
    </Accordion.Root>
  );
}

/* -------------------------------------------------------------------------
 * Per-group sub-controls
 * ----------------------------------------------------------------------- */

function CategoryFilter({ values, options, onChange }) {
  if (!options || options.length === 0) {
    return (
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground">
        No categories available
      </p>
    );
  }

  const toggle = (name) => {
    const set = new Set(values || []);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    onChange(Array.from(set));
  };

  return (
    <ul className="flex flex-col gap-2">
      {options.map((cat) => {
        const name = typeof cat === 'string' ? cat : cat.name;
        const count = typeof cat === 'object' && cat ? cat.product_count : undefined;
        const id = `filter-cat-${name}`;
        const checked = (values || []).includes(name);
        return (
          <li key={name} className="flex items-center gap-3 py-1">
            <Checkbox
              id={id}
              checked={checked}
              onCheckedChange={() => toggle(name)}
              data-testid={`filter-category-${name}`}
            />
            <Label
              htmlFor={id}
              className="flex flex-1 cursor-pointer items-center justify-between gap-2 font-body text-sm text-foreground"
            >
              <span>{name}</span>
              {typeof count === 'number' ? (
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
                  {count}
                </span>
              ) : null}
            </Label>
          </li>
        );
      })}
    </ul>
  );
}

function PriceFilter({ min, max, bounds, onChange }) {
  const [low, high] = bounds;
  // Local state mirrors the slider thumbs so the customer can drag without
  // each pixel of motion firing a URL update. We commit to the URL on
  // `onValueCommit` (release).
  const initial = [
    typeof min === 'number' ? clamp(min, low, high) : low,
    typeof max === 'number' ? clamp(max, low, high) : high,
  ];
  const [draft, setDraft] = React.useState(initial);

  // Re-sync from props when the URL changes externally (e.g. chip dismissal).
  React.useEffect(() => {
    setDraft([
      typeof min === 'number' ? clamp(min, low, high) : low,
      typeof max === 'number' ? clamp(max, low, high) : high,
    ]);
  }, [min, max, low, high]);

  const commit = (next) => {
    const [a, b] = next;
    // Map values back to "default = null" semantics: a value at the bound is
    // semantically "unconstrained" and should not appear in the URL.
    onChange(a > low ? a : null, b < high ? b : null);
  };

  return (
    <div className="flex flex-col gap-3 pt-2">
      <Slider
        min={low}
        max={high}
        step={PRICE_STEP}
        value={draft}
        onValueChange={setDraft}
        onValueCommit={commit}
        data-testid="filter-price-slider"
      />
      <div className="flex items-center justify-between font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-foreground">
        <span data-testid="filter-price-min">{formatPrice(draft[0])}</span>
        <span data-testid="filter-price-max">{formatPrice(draft[1])}</span>
      </div>
    </div>
  );
}

function SizeFilter({ values, options, onChange }) {
  const toggle = (size) => {
    const set = new Set(values || []);
    if (set.has(size)) set.delete(size);
    else set.add(size);
    onChange(Array.from(set));
  };

  return (
    <ul className="flex flex-wrap gap-2">
      {options.map((size) => {
        const checked = (values || []).includes(size);
        return (
          <li key={size}>
            <button
              type="button"
              onClick={() => toggle(size)}
              aria-pressed={checked}
              aria-label={`Toggle size ${size}`}
              className={cn(
                'inline-flex h-9 min-w-[2.5rem] items-center justify-center border px-2 font-mono text-xs uppercase tracking-[0.1em] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                checked
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              data-testid={`filter-size-${size}`}
            >
              {size}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ColorFilter({ values, options, onChange }) {
  const toggle = (name) => {
    const set = new Set(values || []);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    onChange(Array.from(set));
  };

  return (
    <ul className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const name = typeof opt === 'string' ? opt : opt.name;
        const hex = typeof opt === 'object' && opt ? opt.hex : null;
        const checked = (values || []).includes(name);
        return (
          <li key={name}>
            <button
              type="button"
              onClick={() => toggle(name)}
              aria-pressed={checked}
              aria-label={`Toggle color ${name}`}
              title={name}
              className={cn(
                'group inline-flex h-9 items-center gap-2 border px-2 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                checked
                  ? 'border-foreground'
                  : 'border-border hover:border-foreground'
              )}
              data-testid={`filter-color-${name}`}
            >
              <ColorSwatch hex={hex} name={name} checked={checked} />
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-foreground">
                {name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ColorSwatch({ hex, name, checked }) {
  // Tailwind cannot render an arbitrary user-supplied hex via utility class
  // alone. We approximate with mapped utility classes for the named palette
  // we ship; unknown names fall back to the muted token so we still render
  // a visible dot without resorting to an inline `style` attribute.
  const swatchClass = COLOR_HEX_CLASS[name] || 'bg-muted';
  return (
    <span
      className={cn(
        'relative inline-flex h-5 w-5 items-center justify-center border border-border',
        swatchClass
      )}
      aria-hidden="true"
    >
      {checked ? (
        <Check
          className={cn(
            'h-3 w-3',
            // White or beige swatches need a dark check; everything else
            // gets a white check for contrast.
            name === 'White' || name === 'Beige' ? 'text-foreground' : 'text-background'
          )}
          strokeWidth={2.5}
        />
      ) : null}
    </span>
  );
}

// Tailwind-utility map for the canonical palette. Adding a new color here is
// the recommended way to introduce a new swatch — keeps the component free
// of inline `style` attributes (Requirement 1.3).
const COLOR_HEX_CLASS = {
  Black: 'bg-black',
  White: 'bg-white',
  Grey: 'bg-zinc-400',
  Beige: 'bg-amber-100',
  Brown: 'bg-amber-900',
  Navy: 'bg-slate-900',
  Olive: 'bg-lime-800',
};

function RatingFilter({ value, onChange }) {
  return (
    <ul className="flex flex-col gap-1">
      {RATING_BINS.map((bin) => {
        const active = value === bin.value;
        return (
          <li key={bin.value}>
            <button
              type="button"
              onClick={() => onChange(active ? null : bin.value)}
              aria-pressed={active}
              className={cn(
                'flex w-full items-center gap-2 px-2 py-2 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                active ? 'bg-foreground text-background' : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              data-testid={`filter-rating-${bin.value}`}
            >
              <span className="flex items-center gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3.5 w-3.5',
                      i <= bin.value ? 'fill-current' : 'opacity-30'
                    )}
                    strokeWidth={1.5}
                  />
                ))}
              </span>
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em]">
                {bin.label}
              </span>
            </button>
          </li>
        );
      })}
      {value !== null && value !== undefined ? (
        <li>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-1 px-2 py-1 text-left font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Clear rating
          </button>
        </li>
      ) : null}
    </ul>
  );
}

/* -------------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------- */

function priceCount(min, max) {
  let n = 0;
  if (min !== null && min !== undefined) n += 1;
  if (max !== null && max !== undefined) n += 1;
  return n;
}

function clamp(n, low, high) {
  if (!Number.isFinite(n)) return low;
  if (n < low) return low;
  if (n > high) return high;
  return n;
}

export { FilterSidebar };
export default FilterSidebar;
