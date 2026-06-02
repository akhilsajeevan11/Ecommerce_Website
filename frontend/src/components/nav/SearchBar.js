import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as Popover from '@radix-ui/react-popover';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { track } from '../../lib/analytics';
import { formatPrice } from '../../lib/formatters';
import Image from '../primitives/Image';

/**
 * SearchBar — navigation search input with autosuggest dropdown.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 3)
 *   .kiro/specs/storefront-experience-redesign/design.md       (<SearchBar>)
 *   .kiro/specs/storefront-experience-redesign/tasks.md        (task 2.4)
 *
 * Behavior:
 *   - Debounces the typed query by 250 ms via `useDebouncedValue` and fires
 *     `GET /api/products/search-suggest?q=<q>&limit=5` once the trimmed
 *     query has at least 2 characters (Requirement 3.1, 3.2).
 *   - Renders up to 5 product suggestions (image, name, price) and up to
 *     5 category suggestions in a single `role="listbox"` dropdown,
 *     products first then categories (Requirement 3.3).
 *   - Keyboard navigation: ArrowDown/ArrowUp move highlight within the
 *     bounds of the rendered list (no wrap, per Requirement 3.4); Enter
 *     navigates to the highlighted suggestion or falls back to
 *     `/shop?q=<trimmed>` (Requirements 3.5, 3.6); Escape closes the
 *     dropdown and retains focus on the input (Requirement 3.7).
 *   - ARIA combobox 1.1 posture: input carries `role="combobox"`,
 *     `aria-expanded`, `aria-controls=<listboxId>`, and
 *     `aria-activedescendant=<highlightedOptionId>`; the dropdown list
 *     carries `role="listbox" id=<listboxId>` and each option carries
 *     `role="option"` and a stable id (Requirement 3.8).
 *   - On 5xx (or any non-400 error such as the 404 returned today before
 *     the backend ships in task 4.7), the dropdown closes silently and
 *     direct submit via Enter still navigates to `/shop?q=<trimmed>`
 *     (Requirement 3.9).
 *   - `track('search', { q })` fires on submit so the analytics seam
 *     captures the funnel event documented in design.md.
 *
 * Variant prop:
 *   The `variant` prop tunes the visual treatment without changing
 *   accessibility semantics:
 *     - `"navbar"` (default): compact input sized for the desktop nav bar.
 *     - `"mobile-drawer"`: full-width, larger input intended for the
 *       MobileMenuDrawer header (task 2.5). Both variants share the same
 *       dropdown markup.
 *
 * Defensive notes:
 *   - The dropdown closes when focus leaves the wrapper (combobox + listbox)
 *     so blur-out behavior does not require a separate outside-click hook.
 *   - The Radix Popover root is rendered with `open` controlled — we never
 *     trap focus, since combobox dropdowns must keep input focus.
 *   - Stale request results are ignored using a per-request token, so a
 *     fast typer never sees an older response overwrite a newer one.
 *
 * Tailwind utilities only — no inline `style={}` (Requirement 1.3).
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;
const MAX_PRODUCT_SUGGESTIONS = 5;
const MAX_CATEGORY_SUGGESTIONS = 5;

const VARIANT_INPUT_CLASSES = {
  navbar:
    'h-10 w-full border border-border bg-background pl-10 pr-9 font-body text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
  'mobile-drawer':
    'h-12 w-full border border-border bg-background pl-11 pr-10 font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
};

const VARIANT_WRAPPER_CLASSES = {
  navbar: 'relative w-full max-w-sm',
  'mobile-drawer': 'relative w-full',
};

// Build a flat array of `{ kind, item, id }` entries in the order they appear
// in the dropdown. Products come first (max 5) then categories (max 5), per
// Requirement 3.3. The id is stable for the lifetime of a single response so
// `aria-activedescendant` resolves to a real DOM node.
const buildSuggestionList = (data, baseId) => {
  if (!data || typeof data !== 'object') return [];
  const products = Array.isArray(data.products) ? data.products.slice(0, MAX_PRODUCT_SUGGESTIONS) : [];
  const categories = Array.isArray(data.categories) ? data.categories.slice(0, MAX_CATEGORY_SUGGESTIONS) : [];

  const list = [];
  products.forEach((item, idx) => {
    list.push({ kind: 'product', item, id: `${baseId}-product-${idx}` });
  });
  categories.forEach((item, idx) => {
    list.push({ kind: 'category', item, id: `${baseId}-category-${idx}` });
  });
  return list;
};

// Resolve a category-name encoder. We keep this as `encodeURIComponent` so
// names with spaces/punctuation become valid URL components when navigating
// to `/shop?category=<name>`.
const encodeCategoryParam = (name) => encodeURIComponent((name || '').trim());

const SearchBar = ({
  onSubmit,
  placeholder = 'Search products...',
  autoFocus = false,
  variant = 'navbar',
  className,
}) => {
  const navigate = useNavigate();
  const reactId = useId();
  // Stable ids for ARIA wiring. `useId()` returns a unique value per
  // component instance so multiple SearchBars on a page don't collide.
  const inputId = `searchbar-input-${reactId}`;
  const listboxId = `searchbar-listbox-${reactId}`;

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [highlight, setHighlight] = useState(-1);

  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  // Increments on every fetch; stale responses compare against the current
  // value and bail out so a slow earlier request cannot overwrite a faster
  // newer one.
  const requestTokenRef = useRef(0);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const trimmedDebounced = useMemo(() => (debouncedQuery || '').trim(), [debouncedQuery]);

  // Fetch suggestions whenever the debounced query crosses the 2-character
  // threshold. Below the threshold we close the dropdown silently — no API
  // call is fired (Requirement 3.2).
  useEffect(() => {
    if (trimmedDebounced.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      setHighlight(-1);
      return undefined;
    }

    const token = requestTokenRef.current + 1;
    requestTokenRef.current = token;

    let cancelled = false;
    const load = async () => {
      try {
        const response = await axios.get(`${API}/products/search-suggest`, {
          params: { q: trimmedDebounced, limit: MAX_PRODUCT_SUGGESTIONS },
        });
        if (cancelled || requestTokenRef.current !== token) return;
        const list = buildSuggestionList(response && response.data, listboxId);
        setSuggestions(list);
        // Reset highlight on a fresh result set so ArrowDown starts at 0.
        setHighlight(-1);
        setOpen(list.length > 0);
      } catch (err) {
        if (cancelled || requestTokenRef.current !== token) return;
        // Requirement 3.9: any 5xx (or non-200 error like the 404 returned
        // until backend task 4.7 ships) closes the dropdown silently.
        // Direct submission via Enter is unaffected because submission
        // reads the current input value, not the suggestion list.
        setSuggestions([]);
        setOpen(false);
        setHighlight(-1);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [trimmedDebounced, listboxId]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setHighlight(-1);
  }, []);

  const submitQuery = useCallback(
    (raw) => {
      const trimmed = (raw || '').trim();
      if (!trimmed) return;
      try {
        track('search', { q: trimmed });
      } catch {
        // analytics seam never throws into the render tree
      }
      if (typeof onSubmit === 'function') {
        onSubmit(trimmed);
      } else {
        navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
      }
      closeDropdown();
    },
    [navigate, onSubmit, closeDropdown]
  );

  const navigateToSuggestion = useCallback(
    (entry) => {
      if (!entry) return;
      if (entry.kind === 'product') {
        const id = entry.item && entry.item.id;
        if (id !== undefined && id !== null && String(id).length > 0) {
          try {
            track('search', { q: query.trim(), suggestion: 'product', id });
          } catch {
            /* swallow */
          }
          navigate(`/product/${id}`);
        }
      } else if (entry.kind === 'category') {
        const name = entry.item && (entry.item.name || entry.item.slug);
        if (name) {
          try {
            track('search', { q: query.trim(), suggestion: 'category', name });
          } catch {
            /* swallow */
          }
          navigate(`/shop?category=${encodeCategoryParam(name)}`);
        }
      }
      closeDropdown();
    },
    [navigate, query, closeDropdown]
  );

  const handleKeyDown = (e) => {
    const hasSuggestions = open && suggestions.length > 0;

    if (e.key === 'ArrowDown') {
      if (hasSuggestions) {
        e.preventDefault();
        // Clamp at the end — Requirement 3.4 specifies movement "within the
        // bounds of the rendered list", no wrap.
        setHighlight((prev) => Math.min(suggestions.length - 1, prev + 1));
      } else if (trimmedDebounced.length >= MIN_QUERY_LENGTH && suggestions.length > 0) {
        // Re-open if it was closed (e.g. after Escape) but data still here.
        e.preventDefault();
        setOpen(true);
        setHighlight(0);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      if (hasSuggestions) {
        e.preventDefault();
        // Clamp at the top.
        setHighlight((prev) => (prev <= 0 ? 0 : prev - 1));
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (hasSuggestions && highlight >= 0 && highlight < suggestions.length) {
        navigateToSuggestion(suggestions[highlight]);
      } else {
        submitQuery(query);
      }
      return;
    }

    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        closeDropdown();
        // Requirement 3.7: Escape closes the dropdown and retains focus on
        // the input. We don't blur — focus is already on the input because
        // the keydown originated there.
      }
      return;
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    // Open eagerly when the user types past the threshold; the fetch effect
    // will populate the actual suggestions a moment later.
    if (value.trim().length >= MIN_QUERY_LENGTH) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleFocus = () => {
    if (trimmedDebounced.length >= MIN_QUERY_LENGTH && suggestions.length > 0) {
      setOpen(true);
    }
  };

  const handleBlur = (e) => {
    // Close when focus leaves the entire combobox+listbox subtree. Using
    // relatedTarget keeps the dropdown open while the user clicks a
    // suggestion (which, before activation, briefly receives focus).
    const next = e.relatedTarget;
    if (next && wrapperRef.current && wrapperRef.current.contains(next)) return;
    closeDropdown();
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setHighlight(-1);
    setOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSuggestionMouseDown = (e, entry) => {
    // Use mouseDown rather than click so the input's onBlur (which would
    // close the dropdown before the click registers) does not race the
    // navigation. We still preventDefault so focus stays where it was.
    e.preventDefault();
    navigateToSuggestion(entry);
  };

  const activeId =
    open && highlight >= 0 && highlight < suggestions.length ? suggestions[highlight].id : undefined;

  const wrapperClass = cn(VARIANT_WRAPPER_CLASSES[variant] || VARIANT_WRAPPER_CLASSES.navbar, className);
  const inputClass = VARIANT_INPUT_CLASSES[variant] || VARIANT_INPUT_CLASSES.navbar;
  const isMobileDrawer = variant === 'mobile-drawer';
  const iconLeftClass = isMobileDrawer ? 'left-3.5 h-5 w-5' : 'left-3 h-4 w-4';
  const iconRightClass = isMobileDrawer ? 'right-2.5 h-5 w-5' : 'right-2 h-4 w-4';

  // Visible products / categories slice for sectioned rendering. We keep two
  // slices so we can render an unobtrusive separator between them without
  // splitting the listbox role across two elements.
  const productsCount = suggestions.filter((s) => s.kind === 'product').length;

  return (
    <Popover.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDropdown())}>
      <div ref={wrapperRef} className={wrapperClass} onBlur={handleBlur}>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            // Submitting the form (Enter outside the highlighted-suggestion
            // path, or programmatic submit) always falls back to /shop?q=.
            // Requirement 3.6.
            if (open && highlight >= 0 && suggestions[highlight]) {
              navigateToSuggestion(suggestions[highlight]);
            } else {
              submitQuery(query);
            }
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Search products
          </label>
          <Popover.Anchor asChild>
            <div className="relative">
              <Search
                className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground', iconLeftClass)}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                inputMode="search"
                autoComplete="off"
                spellCheck="false"
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                aria-haspopup="listbox"
                placeholder={placeholder}
                value={query}
                autoFocus={autoFocus}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                className={inputClass}
              />
              {query.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear search"
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
                    iconRightClass
                  )}
                >
                  <X className="h-full w-full" strokeWidth={1.5} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </Popover.Anchor>
        </form>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            // The combobox pattern requires that focus stays on the input,
            // so we explicitly disable Radix's automatic focus management
            // and routine close-on-outside-click — we manage open state
            // ourselves via blur/keydown.
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={() => closeDropdown()}
            onEscapeKeyDown={(e) => {
              // Radix would normally swallow the escape; we already
              // handled it on the input keydown, so just ensure close.
              e.preventDefault();
              closeDropdown();
              if (inputRef.current) inputRef.current.focus();
            }}
            className={cn(
              // Match the anchor width (set on the input wrapper) so the
              // dropdown spans the same width as the input. We use
              // `--radix-popper-anchor-width` because it is exposed for
              // both `Popover.Trigger` and `Popover.Anchor`; this combobox
              // uses the latter to keep focus on the input.
              'z-50 w-[var(--radix-popper-anchor-width)] min-w-[18rem] border border-border bg-popover text-popover-foreground shadow-elev-2 outline-none',
              'data-[state=open]:animate-none data-[state=closed]:animate-none'
            )}
          >
            {suggestions.length > 0 ? (
              <ul
                id={listboxId}
                role="listbox"
                aria-label="Search suggestions"
                className="flex max-h-[28rem] flex-col overflow-y-auto py-1"
              >
                {suggestions.map((entry, idx) => {
                  const isHighlighted = idx === highlight;
                  // Render a section separator before the first category when
                  // products are also present.
                  const showSeparator =
                    entry.kind === 'category' &&
                    productsCount > 0 &&
                    idx > 0 &&
                    suggestions[idx - 1].kind === 'product';

                  if (entry.kind === 'product') {
                    const product = entry.item || {};
                    const image =
                      Array.isArray(product.images) && product.images.length > 0
                        ? product.images[0]
                        : product.image || product.thumbnail || null;

                    return (
                      <li
                        key={entry.id}
                        id={entry.id}
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setHighlight(idx)}
                        onMouseDown={(e) => handleSuggestionMouseDown(e, entry)}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors',
                          isHighlighted ? 'bg-accent' : 'bg-transparent hover:bg-accent/60'
                        )}
                      >
                        <div className="h-12 w-12 shrink-0 border border-border bg-muted">
                          <Image
                            src={image}
                            alt=""
                            decorative
                            aspectRatio="1/1"
                            sizes="48px"
                            placeholder="empty"
                            className="h-12 w-12"
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-body text-sm text-foreground">
                            {product.name || 'Untitled product'}
                          </span>
                          {product.price !== undefined && product.price !== null ? (
                            <span className="font-mono text-xs text-muted-foreground">
                              {formatPrice(product.price)}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  }

                  // Category entry
                  const category = entry.item || {};
                  const label = category.name || category.slug || 'Category';
                  return (
                    <li key={entry.id}>
                      {showSeparator ? (
                        <div
                          aria-hidden="true"
                          className="mx-3 my-1 border-t border-border"
                        />
                      ) : null}
                      <div
                        id={entry.id}
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setHighlight(idx)}
                        onMouseDown={(e) => handleSuggestionMouseDown(e, entry)}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors',
                          isHighlighted ? 'bg-accent' : 'bg-transparent hover:bg-accent/60'
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border text-muted-foreground">
                          <Search className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
                            Category
                          </span>
                          <span className="truncate font-body text-sm text-foreground">{label}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
};

export default SearchBar;
export { SearchBar };
