import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { useAuth, useCart, useWishlist, useAuthModal } from '../context/AppContext';
import { noirToast as toast } from '../lib/noir-toast';
import Image from './primitives/Image';
import Badge from './primitives/Badge';
import ColorSwatch from './common/ColorSwatch';
import { formatPrice } from '../lib/formatters';
import { cn } from '../lib/utils';

/**
 * ProductCard — Tailwind-only rewrite.
 *
 * Requirements satisfied:
 *   9.1 — Zero inline `style={` attributes (Image primitive is the sole exception
 *          for its internal aspectRatio/placeholder background).
 *   9.2 — Uses <Image> primitive for the product image.
 *   9.3 — Grayscale applied only at lg+ via `lg:grayscale lg:hover:grayscale-0`;
 *          never on touch/mobile viewports.
 *   9.4 — Renders a ColorSwatch row from `product.colors`.
 *   9.5 — Renders a Quick-Add button that appears on hover and calls addToCart.
 *   9.6 — Renders Badge variants: Featured, Out of Stock, Sale.
 *   9.7 — Wishlist toggle button has an `aria-label`.
 *
 * Source spec:
 *   .kiro/specs/storefront-experience-redesign/requirements.md (Requirement 9)
 */
const ProductCard = ({ product }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { openAuthModal } = useAuthModal();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const isInWishlist = wishlist?.items?.includes(product.id);
  const isOutOfStock = product.stock === 0;
  const isFeatured = Boolean(product.featured);
  const isOnSale = product.sale_price != null && product.sale_price < product.price;

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (isInWishlist) {
      removeFromWishlist(product.id);
      toast.wishlistRemove('Removed from wishlist', product.name);
    } else {
      addToWishlist(product.id);
      toast.wishlist('Saved to wishlist', product.name);
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openAuthModal('login');
      return;
    }

    if (isOutOfStock) return;

    const defaultSize = product.sizes?.[0] || 'M';
    const defaultColor = product.colors?.[0] || 'Black';

    setIsAddingToCart(true);
    try {
      await addToCart(product, defaultSize, defaultColor, 1);
      toast.cart(`${product.name} added to cart`);
    } catch (error) {
      if (error.message === 'MAX_QUANTITY_EXCEEDED') {
        toast.error('Maximum quantity reached (10)');
      } else {
        toast.error('Could not add to cart');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="block no-underline text-inherit focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      data-testid={`product-card-${product.id}`}
    >
      {/* ── Image container ─────────────────────────────────────────── */}
      <div className="group relative overflow-hidden bg-muted mb-3">
        {/* Product image — grayscale only at lg+ (Req 9.3) */}
        <Image
          src={product.images?.[0]}
          alt={product.name}
          aspectRatio="3/4"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          imgClassName={cn(
            'transition-[filter,transform] duration-400 ease-out',
            'lg:grayscale lg:hover:grayscale-0',
            'group-hover:scale-[1.03]'
          )}
        />

        {/* ── Badge row (top-left) ─────────────────────────────────── */}
        {(isFeatured || isOutOfStock || isOnSale) && (
          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
            {isFeatured && (
              <Badge variant="featured">Featured</Badge>
            )}
            {isOutOfStock && (
              <Badge variant="outOfStock">Out of Stock</Badge>
            )}
            {isOnSale && !isOutOfStock && (
              <Badge variant="sale">Sale</Badge>
            )}
          </div>
        )}

        {/* ── Wishlist button (top-right) ──────────────────────────── */}
        <button
          onClick={handleWishlist}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isInWishlist}
          className={cn(
            'absolute top-3 right-3 z-10',
            'flex h-8 w-8 items-center justify-center',
            'bg-background border border-border',
            'rounded-none',
            'transition-[border-color,transform] duration-200',
            'hover:border-foreground hover:scale-105',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          data-testid={`wishlist-btn-${product.id}`}
        >
          <Heart
            className={cn(
              'h-4 w-4 stroke-foreground',
              isInWishlist ? 'fill-foreground' : 'fill-none'
            )}
            strokeWidth={1.5}
          />
        </button>

        {/* ── Quick-Add button (bottom, hover-reveal) ──────────────── */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAddingToCart}
          aria-label={
            isOutOfStock
              ? `${product.name} — out of stock`
              : `Quick add ${product.name} to cart`
          }
          className={cn(
            'absolute bottom-3 right-3 z-10',
            'flex h-8 items-center justify-center gap-1.5 px-3',
            'font-mono text-[0.625rem] uppercase tracking-widest',
            'rounded-none border-none',
            'transition-[opacity,transform,background-color] duration-300',
            // Hover-reveal pattern (Req 9.5)
            'opacity-0 translate-y-2 pointer-events-none',
            'group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto',
            isOutOfStock
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-foreground text-background hover:bg-zinc-800 cursor-pointer'
          )}
          data-testid={`add-to-cart-btn-${product.id}`}
        >
          <ShoppingCart className="h-3.5 w-3.5" strokeWidth={1.5} />
          {isOutOfStock ? 'Out of Stock' : isAddingToCart ? '…' : 'Quick Add'}
        </button>
      </div>

      {/* ── Product info ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        {/* Name */}
        <h3 className="font-heading text-base font-bold tracking-tight leading-snug line-clamp-1">
          {product.name}
        </h3>

        {/* Category */}
        <p className="font-mono text-[0.6875rem] text-muted-foreground lowercase">
          {product.category}
        </p>

        {/* Color swatches (Req 9.4) */}
        {product.colors?.length > 0 && (
          <ColorSwatch colors={product.colors} className="py-0.5" />
        )}

        {/* Price row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">
              {formatPrice(isOnSale ? product.sale_price : product.price)}
            </span>
            {isOnSale && (
              <span className="font-mono text-xs text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Rating */}
          {product.rating != null && (
            <div className="flex items-center gap-1 font-mono text-[0.6875rem] text-muted-foreground">
              <span className="text-foreground">★</span>
              <span>{product.rating?.toFixed(1)}</span>
              <span>({product.reviews_count ?? product.review_count ?? 0})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
