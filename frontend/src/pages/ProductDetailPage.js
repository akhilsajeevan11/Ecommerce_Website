import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { Heart, Star, Minus, Plus, ChevronRight, Ruler } from 'lucide-react';
import { noirToast as toast } from '../lib/noir-toast';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

import ProductGallery from '../components/product/ProductGallery';
import LowStockPill from '../components/product/LowStockPill';
import PincodeEstimator from '../components/product/PincodeEstimator';
import SizeGuideModal from '../components/product/SizeGuideModal';
import RelatedProducts from '../components/product/RelatedProducts';
import RecentlyViewed from '../components/product/RecentlyViewed';
import SocialShareRow from '../components/product/SocialShareRow';

import Heading from '../components/primitives/Heading';
import Text from '../components/primitives/Text';
import IconButton from '../components/primitives/IconButton';

import { useAuth, useCart, useWishlist, useAuthModal } from '../context/AppContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { buildJsonLdProduct } from '../utils/seo';
import { track } from '../lib/analytics';
import { formatPrice } from '../lib/formatters';
import { cn } from '../lib/utils';

// Three.js-based components are deferred via React.lazy so the Three.js bundle
// (~500 KB) is NOT included in the initial JS payload. The dynamic import()
// only fires when the user clicks the "3D" or "360°" tab on this page.
//
// Requirements 14.5 + 14.6:
//   - Three.js is excluded from the initial bundle (lazy chunk).
//   - The chunk only resolves on user interaction (tab click).
//
// The /* webpackChunkName */ magic comments give the lazy chunks human-readable
// names in the build output (e.g. "three-viewer.chunk.js") so bundle analysis
// with `yarn analyze` is easy to read.
const ProductViewer3D = lazy(
  () => import(/* webpackChunkName: "three-viewer" */ '../components/ProductViewer3D')
);
// Product360Viewer is a plain image carousel with no Three.js dependency; it is
// lazy-loaded here purely to keep ProductDetailPage's initial parse cost low.
const Product360Viewer = lazy(
  () => import(/* webpackChunkName: "viewer-360" */ '../components/Product360Viewer')
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * ProductDetailPage — `/product/:id` route.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md
 *     Requirement 8 (gallery, low-stock, pincode, size guide, related,
 *                    recently-viewed, social share, breadcrumb, JSON-LD)
 *     Requirement 1.3 (no inline `style={}` attributes)
 *     Requirement 1.4 (no `window.innerWidth` references)
 *     Requirement 16.3 / 16.9 (JSON-LD product, analytics emission)
 *   .kiro/specs/storefront-experience-redesign/design.md
 *     Product Detail (`/product/:id`) wireframe + JSON-LD schema
 *
 * Composition (top → bottom):
 *   1. <Helmet> per-route title/meta/og/canonical + JSON-LD Product
 *   2. Breadcrumb — Home / Shop / {category} / {product name}
 *   3. Two-column layout (lg+):
 *        - Left: ProductGallery (with 3D / 360 tabs when available)
 *        - Right: Info column — category caption, H1, price/rating,
 *          LowStockPill, description, size selector + size-guide trigger,
 *          color selector, quantity stepper, primary Add-to-Cart,
 *          PincodeEstimator, SocialShareRow, wishlist
 *   4. RelatedProducts strip (silently hidden on 5xx / empty)
 *   5. RecentlyViewed strip (excludes current product)
 *   6. Reviews section (existing logic preserved, refactored to Tailwind)
 *   7. Sticky bottom Add-to-Cart bar (lg:hidden) — visible after the user
 *      scrolls past the inline button, sits above MobileBottomNav at
 *      `bottom-14`
 *
 * State:
 *   - Product / reviews fetched on mount and on `id` change.
 *   - Selected size, color, image index, quantity are local UI state.
 *   - Recently-viewed is recorded via `useRecentlyViewed.recordView` once
 *     per product load (Requirement 8.10).
 *   - Sticky bar visibility is driven by an IntersectionObserver on the
 *     inline Add-to-Cart button (no `window.innerWidth` checks; the bar
 *     itself is gated to `lg:hidden` via Tailwind).
 *
 * Analytics:
 *   - Emits `track('view_item', { product_id })` once per successful
 *     product load (Requirement 16.9).
 *   - Wishlist / share / cart events are emitted by their respective
 *     organisms or context handlers.
 *
 * Styling: Tailwind utility classes only — no inline `style={}` on this
 * page (Requirement 1.3). The only allowed inline styles in the project
 * live inside the `<Image>` primitive itself.
 */

/** Inline breadcrumb for `Home / Shop / {category} / {product name}`. */
function BreadcrumbNav({ category, productName }) {
  const trail = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
  ];
  if (category && typeof category === 'string' && category.trim() !== '') {
    trail.push({
      label: category,
      to: `/shop?category=${encodeURIComponent(category.trim())}`,
    });
  }

  return (
    <nav
      aria-label="Breadcrumb"
      data-testid="pdp-breadcrumb"
      className="mb-6 lg:mb-8"
    >
      <ol className="flex flex-wrap items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground">
        {trail.map((entry, idx) => (
          <li key={`${entry.label}-${idx}`} className="flex items-center gap-2">
            <Link
              to={entry.to}
              className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {entry.label}
            </Link>
            <ChevronRight aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
          </li>
        ))}
        <li>
          <span aria-current="page" className="line-clamp-1 max-w-[40ch] text-foreground">
            {productName || 'Product'}
          </span>
        </li>
      </ol>
    </nav>
  );
}

const ProductDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();

  const { user, token } = useAuth();
  const { addToCart } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { openAuthModal } = useAuthModal();
  const { recordView } = useRecentlyViewed();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [viewMode, setViewMode] = useState('image');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [stickyBarVisible, setStickyBarVisible] = useState(false);

  const inlineAddToCartRef = useRef(null);
  const recordedRef = useRef(null);

  // ── Data loading ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      try {
        const response = await axios.get(`${API}/products/${id}`);
        if (cancelled) return;
        setProduct(response.data);
        if (response.data?.sizes?.length > 0) setSelectedSize(response.data.sizes[0]);
        if (response.data?.colors?.length > 0) setSelectedColor(response.data.colors[0]);
      } catch (error) {
        if (cancelled) return;
        toast.error('Product not found');
      }
    };

    const loadReviews = async () => {
      try {
        const response = await axios.get(`${API}/reviews/${id}`);
        if (cancelled) return;
        setReviews(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Load reviews error:', error);
      }
    };

    setProduct(null);
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
    setViewMode('image');
    recordedRef.current = null;

    loadProduct();
    loadReviews();

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ── view_item analytics + recently-viewed insertion ──────────────────
  useEffect(() => {
    if (!product || !product.id) return;
    // Guard against double-fire from React strict-mode and rapid re-renders.
    if (recordedRef.current === product.id) return;
    recordedRef.current = product.id;

    track('view_item', { product_id: product.id });
    recordView({
      id: product.id,
      name: product.name,
      price: product.price,
      image: Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : null,
    });
  }, [product, recordView]);

  // ── Sticky bottom bar visibility (IntersectionObserver) ──────────────
  // The bar only ever renders below `lg` (Tailwind `lg:hidden`); the
  // observer drives WHEN it appears, not WHETHER it's used at the
  // breakpoint. No `window.innerWidth` checks.
  useEffect(() => {
    const node = inlineAddToCartRef.current;
    if (!node) {
      setStickyBarVisible(false);
      return undefined;
    }
    if (typeof IntersectionObserver === 'undefined') {
      // Older browsers — fall back to always-visible below `lg`.
      setStickyBarVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // The inline button is "in view" → hide the sticky bar.
        // It scrolled out of view → show the sticky bar.
        setStickyBarVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [product]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (product.sizes?.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (product.colors?.length > 0 && !selectedColor) {
      toast.error('Please select a color');
      return;
    }

    try {
      await addToCart(product, selectedSize, selectedColor, quantity);
      toast.cart('Added to cart', product.name);
    } catch (error) {
      if (error?.message === 'MAX_QUANTITY_EXCEEDED') {
        toast.error('Maximum quantity reached (10)');
      } else if (error?.message === 'INSUFFICIENT_STOCK') {
        toast.error(`Only ${product.stock} available`);
      } else {
        toast.error('Could not add to cart');
      }
    }
  }, [product, user, selectedSize, selectedColor, quantity, addToCart, openAuthModal]);

  const handleWishlistToggle = useCallback(() => {
    if (!product) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    const inWishlist = Array.isArray(wishlist?.items) && wishlist.items.includes(product.id);
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast.wishlistRemove('Removed from wishlist', product.name);
    } else {
      addToWishlist(product.id);
      toast.wishlist('Saved to wishlist', product.name);
    }
  }, [product, user, wishlist, addToWishlist, removeFromWishlist, openAuthModal]);

  const handleReviewSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!token) {
        openAuthModal('login');
        return;
      }
      try {
        await axios.post(
          `${API}/reviews`,
          { product_id: id, rating: reviewForm.rating, comment: reviewForm.comment },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Review submitted');
        setReviewForm({ rating: 5, comment: '' });
        // Re-fetch the review list and product so the new rating shows.
        const [reviewsRes, productRes] = await Promise.all([
          axios.get(`${API}/reviews/${id}`),
          axios.get(`${API}/products/${id}`),
        ]);
        setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
        setProduct(productRes.data);
      } catch {
        toast.error('Failed to submit review');
      }
    },
    [id, token, reviewForm, openAuthModal]
  );

  // ── Derived rendering values (computed before any early return so the
  //     hooks order stays stable across render passes) ──────────────────
  const isInWishlist = useMemo(
    () => Array.isArray(wishlist?.items) && product && wishlist.items.includes(product.id),
    [wishlist, product]
  );

  const canonicalUrl = useMemo(() => {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return `${window.location.origin}${location.pathname}`;
    }
    return location.pathname;
  }, [location.pathname]);

  // ── Loading state ────────────────────────────────────────────────────
  if (!product) {
    return (
      <div
        data-testid="pdp-loading"
        className="flex min-h-[60vh] items-center justify-center bg-background"
      >
        <div
          aria-label="Loading product"
          role="status"
          className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent"
        />
      </div>
    );
  }

  const stock = typeof product.stock === 'number' ? product.stock : 0;
  const outOfStock = stock <= 0;
  const has3D = typeof product.model_3d_url === 'string' && product.model_3d_url !== '';
  const has360 = Array.isArray(product.images_360) && product.images_360.length > 0;
  const hasViewModeTabs = has3D || has360;

  const pageTitle = `${product.name} | NOIR`;
  const metaDescription =
    typeof product.description === 'string'
      ? product.description.slice(0, 160)
      : `Shop ${product.name} from NOIR.`;
  const ogImage =
    Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '';
  const jsonLd = buildJsonLdProduct(product, canonicalUrl);

  return (
    <div className="page-transition min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonicalUrl} />
        {ogImage ? <meta property="og:image" content={ogImage} /> : null}
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-10 lg:px-12 lg:py-12">
        <BreadcrumbNav category={product.category} productName={product.name} />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
          {/* ─── Gallery / 3D / 360 column ────────────────────────────── */}
          <div className="min-w-0">
            {hasViewModeTabs ? (
              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList className="mb-6 flex w-full rounded-none bg-muted p-1">
                  <TabsTrigger
                    value="image"
                    data-testid="view-image-tab"
                    className="flex-1 rounded-none font-mono text-xs uppercase tracking-[0.15em]"
                  >
                    Images
                  </TabsTrigger>
                  {has3D ? (
                    <TabsTrigger
                      value="3d"
                      data-testid="view-3d-tab"
                      className="flex-1 rounded-none font-mono text-xs uppercase tracking-[0.15em]"
                    >
                      3D
                    </TabsTrigger>
                  ) : null}
                  {has360 ? (
                    <TabsTrigger
                      value="360"
                      data-testid="view-360-tab"
                      className="flex-1 rounded-none font-mono text-xs uppercase tracking-[0.15em]"
                    >
                      360°
                    </TabsTrigger>
                  ) : null}
                </TabsList>

                <TabsContent value="image" className="mt-0">
                  <ProductGallery images={product.images} alt={product.name} />
                </TabsContent>
                {has3D ? (
                  <TabsContent value="3d" className="mt-0">
                    <div className="aspect-[4/5] w-full bg-muted">
                      {/* Suspense boundary: ProductViewer3D (Three.js) is lazy-loaded.
                          The import() fires only when this TabsContent becomes active
                          (i.e., when the user clicks the "3D" tab). */}
                      <Suspense
                        fallback={
                          <div className="flex h-full w-full items-center justify-center">
                            <div
                              aria-label="Loading 3D viewer"
                              role="status"
                              className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent"
                            />
                          </div>
                        }
                      >
                        <ProductViewer3D modelUrl={product.model_3d_url} />
                      </Suspense>
                    </div>
                  </TabsContent>
                ) : null}
                {has360 ? (
                  <TabsContent value="360" className="mt-0">
                    <div className="aspect-[4/5] w-full bg-muted">
                      {/* Suspense boundary: Product360Viewer is lazy-loaded.
                          The import() fires only when this TabsContent becomes active
                          (i.e., when the user clicks the "360°" tab). */}
                      <Suspense
                        fallback={
                          <div className="flex h-full w-full items-center justify-center">
                            <div
                              aria-label="Loading 360° viewer"
                              role="status"
                              className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent"
                            />
                          </div>
                        }
                      >
                        <Product360Viewer images={product.images_360} />
                      </Suspense>
                    </div>
                  </TabsContent>
                ) : null}
              </Tabs>
            ) : (
              <ProductGallery images={product.images} alt={product.name} />
            )}
          </div>

          {/* ─── Info column ──────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-col gap-6 lg:pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-3">
                {product.category ? (
                  <Text variant="micro" tone="muted" data-testid="product-category">
                    {product.category}
                  </Text>
                ) : null}
                <Heading
                  as="h1"
                  size="h2"
                  className="font-heading"
                  data-testid="product-title"
                >
                  {product.name}
                </Heading>
              </div>

              <IconButton
                aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-pressed={isInWishlist || undefined}
                onClick={handleWishlistToggle}
                data-testid="wishlist-btn"
                variant="outline"
                className="shrink-0"
              >
                <Heart
                  aria-hidden="true"
                  className={cn(
                    'h-5 w-5',
                    isInWishlist ? 'fill-foreground text-foreground' : 'text-foreground'
                  )}
                  strokeWidth={1.5}
                />
              </IconButton>
            </div>

            {/* Price + rating */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span
                className="font-mono text-2xl font-bold text-foreground"
                data-testid="product-price"
              >
                {formatPrice(product.price)}
              </span>
              {product.rating > 0 ? (
                <div className="flex items-center gap-2">
                  <Star aria-hidden="true" className="h-4 w-4 fill-foreground text-foreground" />
                  <span className="font-mono text-sm text-foreground">
                    {Number(product.rating).toFixed(1)}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    ({product.review_count})
                  </span>
                </div>
              ) : null}
            </div>

            <LowStockPill stock={stock} />

            {product.description ? (
              <Text variant="body" tone="muted" className="text-foreground/80">
                {product.description}
              </Text>
            ) : null}

            <div className="flex flex-col gap-6 border-t border-border pt-6">
              {/* Size selector + Size guide trigger */}
              {product.sizes?.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label
                      htmlFor="size-group"
                      className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-foreground"
                    >
                      Size
                    </label>
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      data-testid="open-size-guide"
                      className="inline-flex items-center gap-1 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Ruler aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
                      Size guide
                    </button>
                  </div>
                  <div
                    id="size-group"
                    role="radiogroup"
                    aria-label="Size"
                    className="flex flex-wrap gap-2"
                  >
                    {product.sizes.map((size) => {
                      const active = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setSelectedSize(size)}
                          data-testid={`size-${size}`}
                          className={cn(
                            'inline-flex h-11 min-w-12 items-center justify-center px-4 font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            active
                              ? 'border border-foreground bg-foreground text-background'
                              : 'border border-border bg-background text-foreground hover:border-foreground'
                          )}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Color selector */}
              {product.colors?.length > 0 ? (
                <div>
                  <label
                    htmlFor="color-group"
                    className="mb-3 block font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-foreground"
                  >
                    Color
                  </label>
                  <div
                    id="color-group"
                    role="radiogroup"
                    aria-label="Color"
                    className="flex flex-wrap gap-2"
                  >
                    {product.colors.map((color) => {
                      const active = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setSelectedColor(color)}
                          data-testid={`color-${color}`}
                          className={cn(
                            'inline-flex h-11 min-w-[72px] items-center justify-center px-4 font-mono text-xs uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            active
                              ? 'border border-foreground bg-foreground text-background'
                              : 'border border-border bg-background text-foreground hover:border-foreground'
                          )}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Quantity stepper */}
              <div>
                <span className="mb-3 block font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-foreground">
                  Quantity
                </span>
                <div
                  className="inline-flex items-center border border-border"
                  role="group"
                  aria-label="Quantity"
                >
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    data-testid="qty-decrease"
                    className="inline-flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    <Minus aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <span
                    aria-live="polite"
                    data-testid="qty-value"
                    className="inline-flex h-11 min-w-12 items-center justify-center font-mono text-sm text-foreground"
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    aria-label="Increase quantity"
                    data-testid="qty-increase"
                    className="inline-flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-40"
                    disabled={quantity >= 10}
                  >
                    <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Inline Add-to-Cart button (also acts as the IntersectionObserver target) */}
              <button
                ref={inlineAddToCartRef}
                type="button"
                onClick={handleAddToCart}
                disabled={outOfStock}
                aria-disabled={outOfStock || undefined}
                data-testid="add-to-cart-btn"
                className={cn(
                  'inline-flex h-14 w-full items-center justify-center font-mono text-xs font-semibold uppercase tracking-[0.2em] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  outOfStock
                    ? 'cursor-not-allowed bg-muted text-muted-foreground'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                )}
              >
                {outOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>

              {!outOfStock ? (
                <Text
                  variant="micro"
                  tone="muted"
                  className="text-center"
                  data-testid="stock-line"
                >
                  {`${stock} items in stock`}
                </Text>
              ) : null}
            </div>

            {/* Pincode estimator */}
            <div className="border-t border-border pt-6">
              <PincodeEstimator />
            </div>

            {/* Social share */}
            <div className="border-t border-border pt-6">
              <SocialShareRow
                url={canonicalUrl}
                title={product.name}
                imageUrl={ogImage}
              />
            </div>
          </div>
        </div>

        {/* Related + Recently Viewed strips */}
        <div className="mt-16 flex flex-col gap-16 lg:mt-24 lg:gap-20">
          <RelatedProducts productId={product.id} limit={6} />
          <RecentlyViewed currentProductId={product.id} maxItems={10} />
        </div>

        {/* Reviews section — preserved business logic, refactored to Tailwind */}
        <section
          aria-labelledby="reviews-heading"
          className="mt-16 border-t border-border pt-12 lg:mt-24"
        >
          <Heading
            as="h2"
            size="h3"
            id="reviews-heading"
            className="mb-8 font-heading text-2xl font-bold"
          >
            {reviews.length > 0 ? `Reviews (${reviews.length})` : 'Reviews'}
          </Heading>

          {user ? (
            <form
              onSubmit={handleReviewSubmit}
              data-testid="review-form"
              className="mb-12 flex flex-col gap-4 bg-muted p-6"
            >
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-foreground">
                Write a Review
              </h3>

              <div className="flex flex-col gap-2">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground">
                  Rating
                </span>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const filled = num <= reviewForm.rating;
                    return (
                      <button
                        key={num}
                        type="button"
                        role="radio"
                        aria-checked={num === reviewForm.rating}
                        aria-label={`${num} star${num === 1 ? '' : 's'}`}
                        onClick={() => setReviewForm({ ...reviewForm, rating: num })}
                        className="p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Star
                          aria-hidden="true"
                          className={cn(
                            'h-5 w-5',
                            filled ? 'fill-foreground text-foreground' : 'text-border'
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="review-comment"
                  className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted-foreground"
                >
                  Comment
                </label>
                <textarea
                  id="review-comment"
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                  }
                  placeholder="Share your thoughts..."
                  required
                  data-testid="review-comment-input"
                  className="min-h-[100px] w-full resize-y border border-border bg-background p-4 font-body text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <button
                type="submit"
                data-testid="review-submit-btn"
                className="inline-flex h-11 w-fit items-center justify-center bg-primary px-6 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Submit Review
              </button>
            </form>
          ) : null}

          <div className="flex flex-col gap-6">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <article
                  key={review.id}
                  data-testid={`review-${review.id}`}
                  className="border-b border-border pb-6 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="font-body text-sm font-medium text-foreground">
                        {review.user_name}
                      </p>
                      <div className="flex gap-0.5" aria-label={`${review.rating} out of 5`}>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Star
                            key={i}
                            aria-hidden="true"
                            className={cn(
                              'h-3 w-3',
                              i < review.rating
                                ? 'fill-foreground text-foreground'
                                : 'text-border'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="font-mono text-[0.6875rem] text-muted-foreground">
                      {review.created_at
                        ? new Date(review.created_at).toLocaleDateString()
                        : ''}
                    </span>
                  </div>
                  <p className="mt-3 font-body text-sm leading-relaxed text-foreground/80">
                    {review.comment}
                  </p>
                </article>
              ))
            ) : (
              <p className="py-12 text-center font-mono text-sm text-muted-foreground">
                No reviews yet
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Sticky bottom Add-to-Cart bar — below `lg`, above MobileBottomNav.
          Visibility is driven by the IntersectionObserver on the inline
          button so the bar only appears once the user has scrolled past
          it (Requirement 8.5). */}
      <div
        aria-hidden={!stickyBarVisible}
        data-testid="sticky-add-to-cart"
        className={cn(
          'fixed inset-x-0 bottom-14 z-30 border-t border-border bg-background px-4 py-3 transition-transform duration-300 ease-out lg:hidden',
          stickyBarVisible ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        )}
      >
        <div className="mx-auto flex max-w-screen-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 font-heading text-sm font-bold text-foreground">
              {product.name}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatPrice(product.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={outOfStock}
            aria-disabled={outOfStock || undefined}
            data-testid="sticky-add-to-cart-btn"
            className={cn(
              'inline-flex h-11 items-center justify-center px-5 font-mono text-xs font-semibold uppercase tracking-[0.2em] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              outOfStock
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            )}
          >
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>

      <SizeGuideModal
        open={sizeGuideOpen}
        onOpenChange={setSizeGuideOpen}
        category={product.category}
      />
    </div>
  );
};

export default ProductDetailPage;
