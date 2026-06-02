import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ShoppingCart, Heart, User, Menu, LogOut, UserCircle } from 'lucide-react';
import { useAuth, useCart, useAuthModal } from '../context/AppContext';
import { cn } from '../lib/utils';
import AuthModal from './AuthModal';
import CompleteProfileModal from './CompleteProfileModal';
import CartDrawer from './CartDrawer';
import SearchBar from './nav/SearchBar';
import MegaMenu from './nav/MegaMenu';
import MobileMenuDrawer from './nav/MobileMenuDrawer';

/**
 * Navigation — site-wide top navigation bar.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 4.1, 4.3, 1.3, 1.4)
 *   .kiro/specs/storefront-experience-redesign/design.md       (<Navigation>)
 *   .kiro/specs/storefront-experience-redesign/tasks.md        (task 2.5)
 *
 * Refactor goals (task 2.5):
 *   - Tailwind utility classes ONLY — zero `style={}` attributes
 *     anywhere in this file (Requirement 1.3).
 *   - Responsive behavior expressed via Tailwind breakpoints
 *     (`lg:flex` / `lg:hidden`); no `window.innerWidth` checks
 *     (Requirement 1.4).
 *   - Integrate SearchBar (variant="navbar") between the brand mark and
 *     the right-side icons.
 *   - Wire the "Shop" link to MegaMenu so hover/focus opens the
 *     multi-column dropdown (Requirement 4.1).
 *   - Replace the inline mobile menu and `useEffect` outside-click logic
 *     with a hamburger button below `lg` that opens MobileMenuDrawer
 *     (Requirement 4.3).
 *   - Replace the bespoke user dropdown with Radix Dropdown Menu so
 *     focus, outside-click, and Escape are managed by the library.
 *
 * Composition (left → right):
 *   - Brand mark "NOIR" → links to `/`
 *   - Center: Home link + MegaMenu trigger ("Shop") at `lg+`
 *   - Right: SearchBar (`lg+`), Wishlist, Cart (when logged in),
 *            user dropdown (when logged in) or Sign in button.
 *   - Below `lg`: hamburger button on the right opens MobileMenuDrawer.
 *
 * Preserves existing wiring with AppContext: `useAuth`, `useCart`,
 * `useAuthModal`, plus AuthModal, CompleteProfileModal, and CartDrawer.
 */
const Navigation = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { showAuthModal, authModalMode, openAuthModal, closeAuthModal, setAuthModalMode } = useAuthModal();
  const { showCompleteProfile, setShowCompleteProfile } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const cartItemCount =
    cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const isHomeActive = location.pathname === '/';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleWishlistClick = () => {
    if (user) {
      navigate('/wishlist');
    } else {
      openAuthModal('login');
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="mx-auto flex h-20 max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
          {/* Brand mark — fixed-width slot at lg+ to balance the right slot */}
          <div className="flex items-center lg:w-[180px]">
            <Link
              to="/"
              className="font-heading text-2xl font-bold uppercase tracking-[0.1em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="NOIR — home"
            >
              NOIR
            </Link>
          </div>

          {/* Center nav links — desktop only */}
          <div className="hidden flex-1 items-center justify-center gap-10 lg:flex">
            <Link
              to="/"
              className={cn(
                'font-body text-sm tracking-[0.05em] text-foreground border-b pb-0.5 transition-colors',
                isHomeActive ? 'border-foreground' : 'border-transparent hover:border-foreground'
              )}
            >
              Home
            </Link>
            {/* MegaMenu owns its own trigger element which renders the
                "Shop" link with hover/focus dropdown behavior. */}
            <MegaMenu />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 lg:w-[420px] lg:justify-end lg:gap-2">
            {/* SearchBar — desktop only. Hidden below `lg` because
                MobileMenuDrawer renders its own variant="mobile-drawer"
                SearchBar at the top of the drawer. */}
            <div className="hidden flex-1 lg:block lg:max-w-xs">
              <SearchBar variant="navbar" />
            </div>

            {/* Wishlist — always visible (logged-out customers are
                redirected through the auth modal). */}
            <button
              type="button"
              onClick={handleWishlistClick}
              aria-label="Wishlist"
              className="inline-flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Heart className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>

            {/* Cart — only when logged in (matches existing behavior). */}
            {user ? (
              <CartDrawer>
                <button
                  type="button"
                  aria-label={
                    cartItemCount > 0
                      ? `Cart, ${cartItemCount} item${cartItemCount === 1 ? '' : 's'}`
                      : 'Cart'
                  }
                  className="relative inline-flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <ShoppingCart className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                  {cartItemCount > 0 ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-1 top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-foreground px-1 font-mono text-[9px] font-bold leading-none text-background"
                    >
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  ) : null}
                </button>
              </CartDrawer>
            ) : null}

            {/* User dropdown — desktop only. Hidden below `lg` because
                MobileMenuDrawer surfaces the same destinations
                (Account / Logout). */}
            {user ? (
              <div className="hidden lg:block">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      aria-label="Account menu"
                      className="inline-flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=open]:bg-accent"
                    >
                      <User className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={6}
                      className={cn(
                        'z-50 w-56 border border-border bg-popover text-popover-foreground shadow-elev-2',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
                      )}
                    >
                      <DropdownMenu.Label className="border-b border-border px-4 py-3">
                        <p className="font-body text-sm font-semibold text-foreground">
                          {user.name || 'User'}
                        </p>
                        <p className="mt-0.5 truncate font-body text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </DropdownMenu.Label>
                      <div className="py-1">
                        <DropdownMenu.Item asChild>
                          <Link
                            to="/profile"
                            className="flex cursor-pointer items-center gap-2 px-4 py-2 font-body text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-accent"
                          >
                            <UserCircle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                            Profile
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          onSelect={(e) => {
                            // Prevent Radix from auto-restoring focus to
                            // the trigger before our navigate happens.
                            e.preventDefault();
                            handleLogout();
                          }}
                          className="flex cursor-pointer items-center gap-2 px-4 py-2 font-body text-sm text-destructive outline-none transition-colors data-[highlighted]:bg-destructive/5"
                        >
                          <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                          Logout
                        </DropdownMenu.Item>
                      </div>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="hidden h-10 bg-primary px-5 font-mono text-xs font-medium uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:inline-flex lg:items-center"
              >
                Login
              </button>
            )}

            {/* Hamburger — mobile only. Opens MobileMenuDrawer. */}
            <button
              type="button"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
            >
              <Menu className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer mounts at the Navigation level so the hamburger and
          drawer share state. The MobileBottomNav owns its own independent
          drawer instance for the Search tile (Requirement 4.6). */}
      <MobileMenuDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

      <AuthModal
        open={showAuthModal}
        onClose={closeAuthModal}
        mode={authModalMode}
        onModeChange={setAuthModalMode}
      />
      <CompleteProfileModal
        open={showCompleteProfile}
        onClose={() => setShowCompleteProfile(false)}
      />
    </>
  );
};

export default Navigation;
