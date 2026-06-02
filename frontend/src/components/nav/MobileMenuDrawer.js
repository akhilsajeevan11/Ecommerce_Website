import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronRight, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth, useAuthModal } from '../../context/AppContext';
import SearchBar from './SearchBar';

/**
 * MobileMenuDrawer — slide-in side panel that opens from the Navigation
 * hamburger button on viewports below the `lg` breakpoint.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 4.3, 4.4)
 *   .kiro/specs/storefront-experience-redesign/design.md       (<MobileMenuDrawer>)
 *   .kiro/specs/storefront-experience-redesign/tasks.md        (task 2.5)
 *
 * Behavior:
 *   - Built on `@radix-ui/react-dialog` which provides `role="dialog"`,
 *     `aria-modal="true"`, focus trap, Escape-to-close, and outside-click
 *     close out of the box (Requirement 4.3).
 *   - Lists primary destinations (Home, Shop, every category from
 *     `GET /api/categories`, Wishlist, Account) plus Logout when the user
 *     is signed in (Requirement 4.4).
 *   - Renders `<SearchBar variant="mobile-drawer" />` at the top so search
 *     is the first thing the customer sees (Requirement 4.4).
 *
 * Controlled / uncontrolled:
 *   The component is intentionally controlled — Navigation owns the open
 *   state so the same drawer instance can be opened from both the
 *   Navigation hamburger button and the MobileBottomNav "Search" tile
 *   (Requirement 4.6, surfaced via the `initialFocusSearch` prop).
 *
 * Props:
 *   - `open`                Boolean — drawer open state.
 *   - `onOpenChange`        Function — called with the next open state.
 *   - `initialFocusSearch`  Boolean — when true, focus the search input on
 *                            open. This is how the MobileBottomNav "Search"
 *                            tile satisfies Requirement 4.6 ("opens
 *                            SearchBar in mobile-drawer mode without
 *                            changing route").
 *
 * Tailwind utilities only — zero `style={}` (Requirement 1.3).
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const fetchCategories = async () => {
  const response = await axios.get(`${API}/categories`);
  if (Array.isArray(response.data)) return response.data;
  return [];
};

const MobileMenuDrawer = ({ open, onOpenChange, initialFocusSearch = false }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [categories, setCategories] = useState([]);

  // Lazy-load categories when the drawer first opens. Failures are
  // swallowed — the categories endpoint ships in task 4.7; until then we
  // simply omit the category section.
  useEffect(() => {
    if (!open) return undefined;
    if (categories.length > 0) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const list = await fetchCategories();
        if (cancelled) return;
        setCategories(list);
      } catch {
        if (cancelled) return;
        setCategories([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, categories.length]);

  const close = () => onOpenChange(false);

  const handleLinkClick = () => {
    // Close the drawer after any internal navigation so the customer lands
    // on the destination with focus restored to the page body.
    close();
  };

  const handleAccount = () => {
    if (user) {
      navigate('/profile');
    } else {
      openAuthModal('login');
    }
    close();
  };

  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  // Section data
  const primaryLinks = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-[70] bg-black/60',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <Dialog.Content
          aria-label="Primary navigation"
          // Radix sets role="dialog" and aria-modal="true" on Content.
          // Focus trap and outside-click close are handled by Radix.
          onOpenAutoFocus={(e) => {
            // When the drawer opens via the MobileBottomNav "Search"
            // destination, focus the search input rather than the close
            // button (Requirement 4.6).
            if (initialFocusSearch) {
              e.preventDefault();
              const input = document.querySelector(
                '[data-mobile-drawer-search] input[type="text"]'
              );
              if (input) input.focus();
            }
          }}
          className={cn(
            'fixed inset-y-0 left-0 z-[80] flex h-full w-[88%] max-w-sm flex-col bg-background shadow-elev-2',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
            'data-[state=closed]:duration-200 data-[state=open]:duration-300'
          )}
        >
          {/* Header — title + close button */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <Dialog.Title className="font-heading text-2xl font-bold uppercase tracking-[0.1em] text-foreground">
              NOIR
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Browse the storefront, search products, and reach your account.
            </Dialog.Description>
            <Dialog.Close
              aria-label="Close menu"
              className="inline-flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </Dialog.Close>
          </div>

          {/* Search — first thing the customer sees per Requirement 4.4 */}
          <div className="border-b border-border px-5 py-4" data-mobile-drawer-search>
            <SearchBar
              variant="mobile-drawer"
              autoFocus={initialFocusSearch}
              onSubmit={(q) => {
                // Match SearchBar's default behavior but also close the
                // drawer on submit so the customer sees the results page
                // unobstructed.
                navigate(`/shop?q=${encodeURIComponent(q)}`);
                close();
              }}
            />
          </div>

          {/* Scrollable nav body */}
          <nav
            aria-label="Primary mobile"
            className="flex-1 overflow-y-auto"
          >
            {/* Primary links */}
            <ul className="flex flex-col">
              {primaryLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={handleLinkClick}
                    className="flex items-center justify-between border-b border-border px-5 py-4 font-body text-base text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span>{link.label}</span>
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Categories section (Requirement 4.4). Hidden until the
                categories endpoint returns data; until task 4.7 ships the
                list will be empty and this section collapses. */}
            {categories.length > 0 ? (
              <div className="border-b border-border">
                <p
                  id="mobile-categories-heading"
                  className="px-5 pt-5 pb-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  Categories
                </p>
                <ul aria-labelledby="mobile-categories-heading" className="flex flex-col">
                  {categories.map((category) => {
                    const name = category.name || category.slug || 'Category';
                    const target = `/shop?category=${encodeURIComponent(name)}`;
                    return (
                      <li key={category.id || category.slug || name}>
                        <Link
                          to={target}
                          onClick={handleLinkClick}
                          className="flex items-center justify-between px-5 py-3 font-body text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <span>{name}</span>
                          {typeof category.product_count === 'number' ? (
                            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground">
                              {category.product_count}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {/* Account section */}
            <ul className="flex flex-col">
              <li>
                <Link
                  to="/wishlist"
                  onClick={handleLinkClick}
                  className="flex items-center justify-between border-b border-border px-5 py-4 font-body text-base text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span>Wishlist</span>
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleAccount}
                  className="flex w-full items-center justify-between border-b border-border px-5 py-4 text-left font-body text-base text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span>{user ? 'Account' : 'Sign in'}</span>
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>
              </li>
              {user ? (
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-between border-b border-border px-5 py-4 text-left font-body text-base text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span>Logout</span>
                    <LogOut
                      className="h-4 w-4"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ) : null}
            </ul>
          </nav>

          {/* User identity footer when logged in */}
          {user ? (
            <div className="border-t border-border bg-muted/30 px-5 py-3">
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
                Signed in as
              </p>
              <p className="mt-1 truncate font-body text-sm text-foreground">
                {user.name || user.email}
              </p>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default MobileMenuDrawer;
export { MobileMenuDrawer };
