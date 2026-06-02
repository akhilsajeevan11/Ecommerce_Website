import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * MegaMenu — desktop multi-column dropdown anchored to the Navigation
 * "Shop" link.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 4.1, 4.2)
 *   .kiro/specs/storefront-experience-redesign/design.md       (<MegaMenu>)
 *   .kiro/specs/storefront-experience-redesign/tasks.md        (task 2.5)
 *
 * Behavior:
 *   - Opens on hover or focus of the trigger or the panel (Requirement 4.1).
 *   - When focus leaves the wrapper subtree, close within 200 ms — the timer
 *     is cleared if focus re-enters during that window (Requirement 4.2).
 *   - Lists every category returned by `GET /api/categories` with its
 *     server-computed `product_count`. The categories endpoint ships in
 *     task 4.7 — until then the fetch may 404. We treat any error as
 *     "no categories" and still render a "Browse all" fallback link to
 *     `/shop` so the trigger is never useless.
 *   - Visible only at the `lg` breakpoint and above (Requirement 4.1 — the
 *     parent Navigation gates this with `hidden lg:flex` so the MegaMenu
 *     trigger itself is the same element used as the desktop "Shop" link).
 *   - Escape closes immediately; focus returns to the trigger.
 *
 * a11y posture:
 *   - Trigger and panel are wrapped together (`onFocus` / `onBlur` /
 *     `onMouseEnter` / `onMouseLeave` apply to the wrapper). The trigger
 *     carries `aria-expanded`, `aria-controls=<panelId>`, `aria-haspopup="menu"`.
 *   - Panel carries `role="menu"`, `id=<panelId>`, `aria-label="Shop categories"`.
 *   - Each category link is `role="menuitem"` and reachable via Tab.
 *
 * Tailwind utilities only — zero `style={}` (Requirement 1.3).
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FOCUS_OUT_CLOSE_MS = 200;

const fetchCategories = async () => {
  const response = await axios.get(`${API}/categories`);
  if (Array.isArray(response.data)) return response.data;
  return [];
};

const MegaMenu = ({ className }) => {
  const reactId = useId();
  const panelId = `megamenu-panel-${reactId}`;
  const triggerId = `megamenu-trigger-${reactId}`;

  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  // Pending close timer — cleared if focus/hover re-enters before it fires.
  const closeTimerRef = useRef(null);

  // Fetch once on mount. Failures are silent — render a "Browse all" link
  // and nothing else so the trigger remains a useful entry to /shop.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await fetchCategories();
        if (cancelled) return;
        setCategories(list);
      } catch {
        if (cancelled) return;
        setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, FOCUS_OUT_CLOSE_MS);
  }, [clearCloseTimer]);

  // Cleanup pending timer on unmount so it never fires on a stale instance.
  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const handleMouseEnter = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    scheduleClose();
  };

  const handleFocus = () => {
    clearCloseTimer();
    setOpen(true);
  };

  // Schedule close when focus leaves the entire trigger+panel subtree.
  // Re-entry within 200 ms cancels via `clearCloseTimer` in handleFocus.
  const handleBlur = (e) => {
    const next = e.relatedTarget;
    if (next && wrapperRef.current && wrapperRef.current.contains(next)) return;
    scheduleClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      clearCloseTimer();
      setOpen(false);
      // Return focus to the trigger so keyboard users land somewhere
      // predictable.
      if (triggerRef.current) triggerRef.current.focus();
    }
  };

  // Split categories into balanced columns. Four-column layout at xl and
  // above, three at lg. We render all categories in a single grid and let
  // CSS column counts handle distribution.
  const hasCategories = categories.length > 0;

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn('relative', className)}
    >
      <Link
        ref={triggerRef}
        id={triggerId}
        to="/shop"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'inline-flex items-center gap-1 font-body text-sm tracking-[0.05em] text-foreground',
          'border-b pb-0.5 transition-colors',
          open ? 'border-foreground' : 'border-transparent hover:border-foreground'
        )}
      >
        Shop
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </Link>

      {open ? (
        <div
          id={panelId}
          role="menu"
          aria-label="Shop categories"
          className={cn(
            // Anchor the panel below the trigger spanning the navbar width.
            // We use a fixed-position-like effect with absolute and a wide
            // min-width so all categories breathe.
            'absolute left-1/2 top-full z-50 mt-3 w-[min(72rem,90vw)] -translate-x-1/2',
            'border border-border bg-popover text-popover-foreground shadow-elev-2'
          )}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 p-6 lg:grid-cols-3 xl:grid-cols-4">
            {/* Always show the "Browse all" entry as the first menuitem so
                the panel is useful even before the categories endpoint
                ships in task 4.7. */}
            <Link
              role="menuitem"
              to="/shop"
              className="group flex items-baseline justify-between gap-3 border-b border-transparent py-2 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-foreground group-hover:text-foreground">
                Browse all
              </span>
            </Link>

            {hasCategories
              ? categories.map((category) => {
                  const name = category.name || category.slug || 'Category';
                  const count =
                    typeof category.product_count === 'number' ? category.product_count : null;
                  // Encode the category name for the URL — `serializeShopParams`
                  // (task 6.1) will normalize this on the receiving end.
                  const target = `/shop?category=${encodeURIComponent(name)}`;
                  return (
                    <Link
                      key={category.id || category.slug || name}
                      role="menuitem"
                      to={target}
                      className="group flex items-baseline justify-between gap-3 border-b border-transparent py-2 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span className="font-body text-sm text-foreground group-hover:underline">
                        {name}
                      </span>
                      {count !== null ? (
                        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground">
                          {count}
                        </span>
                      ) : null}
                    </Link>
                  );
                })
              : null}
          </div>

          {!hasCategories && !loading ? (
            <div className="border-t border-border bg-muted/40 px-6 py-3">
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
                Categories load when the catalog is ready.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default MegaMenu;
export { MegaMenu };
