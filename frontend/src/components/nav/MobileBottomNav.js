import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Search, Heart, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth, useAuthModal } from '../../context/AppContext';
import MobileMenuDrawer from './MobileMenuDrawer';

/**
 * MobileBottomNav — fixed bottom navigation bar visible only below the `lg`
 * breakpoint.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 4.5, 4.6, 4.7)
 *   .kiro/specs/storefront-experience-redesign/design.md       (<MobileBottomNav>)
 *   .kiro/specs/storefront-experience-redesign/tasks.md        (task 2.5)
 *
 * Behavior:
 *   - Five destinations: Home, Shop, Search, Wishlist, Account
 *     (Requirement 4.5).
 *   - Hidden at `lg` and above via `lg:hidden` (Requirement 4.7).
 *   - Active route detected via `useLocation` and signaled with
 *     `aria-current="page"` (Requirement 4.5).
 *   - The Search destination opens the MobileMenuDrawer with
 *     `initialFocusSearch={true}` so the SearchBar is focused without a
 *     route change (Requirement 4.6). We reuse MobileMenuDrawer rather
 *     than creating a separate search-only modal — the mobile drawer
 *     already mounts a `<SearchBar variant="mobile-drawer" />` at its top,
 *     so the customer gets the same experience whether they reach search
 *     from the navbar hamburger or from this bottom-nav tile. The drawer
 *     instance owned here is independent of the one owned by Navigation
 *     so the two surfaces never compete for state.
 *   - The Account destination routes to `/profile` when the user is
 *     signed in or opens the auth modal otherwise — matching the
 *     Navigation user icon's behavior so the two entry points feel
 *     identical.
 *   - CustomerLayout already applies `pb-16` to `<main>` below `lg`
 *     (Requirement 2.8), so this `h-14` bar never overlays content.
 *
 * a11y posture:
 *   - Native `<nav>` with `aria-label="Primary mobile"`
 *     (design.md a11y table).
 *   - Each link is keyboard reachable; `aria-current="page"` on the
 *     matching route.
 *   - Each tile shows an icon plus a label so the destination is
 *     perceivable without relying on icon recognition alone (and the
 *     label gives screen-reader users an accessible name without an
 *     explicit aria-label).
 *
 * Tailwind utilities only — zero `style={}` (Requirement 1.3).
 */

// True when the current pathname matches the destination's "active" rule.
// We treat `/` as exact match; every other route matches when pathname is
// equal or starts with the path followed by `/`.
const isActiveRoute = (pathname, target) => {
  if (target === '/') return pathname === '/';
  if (pathname === target) return true;
  return pathname.startsWith(`${target}/`);
};

const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [searchOpen, setSearchOpen] = useState(false);

  const accountTarget = user ? '/profile' : null;

  const handleAccountClick = (e) => {
    if (user) return; // Let the <Link> navigate normally
    e.preventDefault();
    openAuthModal('login');
  };

  // Each tile shape:
  //   { key, label, Icon, render: () => JSX }
  // The render function is responsible for emitting the right element
  // (Link, button, or custom) so we can keep the iteration uniform.
  const tiles = [
    {
      key: 'home',
      label: 'Home',
      Icon: Home,
      target: '/',
      render: ({ active, baseClass }) => (
        <Link
          to="/"
          aria-current={active ? 'page' : undefined}
          className={baseClass}
        >
          <Home className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          <span>Home</span>
        </Link>
      ),
    },
    {
      key: 'shop',
      label: 'Shop',
      Icon: ShoppingBag,
      target: '/shop',
      render: ({ active, baseClass }) => (
        <Link
          to="/shop"
          aria-current={active ? 'page' : undefined}
          className={baseClass}
        >
          <ShoppingBag className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          <span>Shop</span>
        </Link>
      ),
    },
    {
      key: 'search',
      label: 'Search',
      Icon: Search,
      // No "target" — opening search is a state change, not a route
      // change (Requirement 4.6). aria-current is intentionally omitted
      // so we never lie about an active page.
      render: ({ baseClass }) => (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={searchOpen}
          onClick={() => setSearchOpen(true)}
          className={baseClass}
        >
          <Search className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          <span>Search</span>
        </button>
      ),
    },
    {
      key: 'wishlist',
      label: 'Wishlist',
      Icon: Heart,
      target: '/wishlist',
      render: ({ active, baseClass }) => (
        <Link
          to="/wishlist"
          aria-current={active ? 'page' : undefined}
          className={baseClass}
        >
          <Heart className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          <span>Wishlist</span>
        </Link>
      ),
    },
    {
      key: 'account',
      label: 'Account',
      Icon: User,
      target: accountTarget, // null when logged out so we never fake-active
      render: ({ active, baseClass }) => (
        // We always render a Link so the focus ring and keyboard semantics
        // are identical across tiles. The onClick intercepts when logged
        // out and routes through the auth modal instead.
        <Link
          to={accountTarget || '/'}
          onClick={handleAccountClick}
          aria-current={active ? 'page' : undefined}
          className={baseClass}
        >
          <User className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          <span>Account</span>
        </Link>
      ),
    },
  ];

  // Tailwind class shared by every tile. Active state swaps the text /
  // icon color to foreground; inactive uses muted-foreground.
  const tileBase =
    'flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 font-mono text-[0.625rem] uppercase tracking-[0.15em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset transition-colors';

  return (
    <>
      <nav
        aria-label="Primary mobile"
        className={cn(
          'fixed bottom-0 inset-x-0 z-40 h-14 border-t border-border bg-background',
          'lg:hidden'
        )}
      >
        {/* Five tiles laid out as a 5-column grid. The tiles themselves
            (Link or button) are rendered directly into the grid so each
            interactive element is a grid track; this keeps focus order
            and keyboard tab semantics straightforward. The parent
            <nav> provides the navigation landmark role. */}
        <div className="grid h-full grid-cols-5">
          {tiles.map((tile) => {
            const active =
              tile.target !== null && tile.target !== undefined
                ? isActiveRoute(location.pathname, tile.target)
                : false;
            const baseClass = cn(
              tileBase,
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            );
            return (
              <div key={tile.key} className="flex">
                {tile.render({ active, baseClass })}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Reused drawer instance — opens with focus on the SearchBar input
          (Requirement 4.6). Independent from the Navigation hamburger
          drawer instance so the two surfaces never share state. */}
      <MobileMenuDrawer
        open={searchOpen}
        onOpenChange={setSearchOpen}
        initialFocusSearch
      />
    </>
  );
};

export default MobileBottomNav;
export { MobileBottomNav };
