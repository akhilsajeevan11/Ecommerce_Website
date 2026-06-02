import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { useCart, useAuth } from '../context/AppContext';
import { Minus, Plus, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { noirToast as toast } from '../lib/noir-toast';
import axios from 'axios';
import { getImageUrl } from '../utils/getImageUrl';
import { formatPrice } from '../lib/formatters';
import { track } from '../lib/analytics';

// Cart organisms
import FreeShippingProgressBar from './cart/FreeShippingProgressBar';
import CouponInput from './cart/CouponInput';
import CartUpsell from './cart/CartUpsell';
import { SaveForLaterSection, useSaveForLater } from './cart/SaveForLater';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * CartDrawer — the slide-in cart panel triggered from the Navigation cart icon.
 *
 * Integrates four cart organisms (Task 11.1):
 *   1. FreeShippingProgressBar — visual progress toward ₹2999 threshold
 *   2. CouponInput — 4-state coupon code machine with idempotent re-apply
 *   3. SaveForLater — per-line action moving items to a localStorage-backed saved list
 *   4. CartUpsell — "You may also like" suggestions from cart-item categories
 *
 * Analytics (Requirement 16.9):
 *   - track('view_cart', {...}) on drawer open
 *   - track('begin_checkout', {...}) on checkout click
 *
 * Source spec:
 *   Requirements 10.1–10.9, 16.9
 *   .kiro/specs/storefront-experience-redesign/design.md (Cart Drawer wireframe)
 */
const CartDrawer = ({ children }) => {
  const { cart, addToCart, removeFromCart, updateCart } = useCart();
  const { token } = useAuth();
  const [products, setProducts] = useState({});
  const [open, setOpen] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const navigate = useNavigate();
  const hasTrackedOpen = useRef(false);

  const { savedItems, saveItem, moveToCart, removeSaved } = useSaveForLater(products, removeFromCart, addToCart);

  // Load product data when drawer opens or cart changes
  useEffect(() => {
    if (open && cart.items?.length > 0) {
      loadProducts();
    }
  }, [open, cart.items]);

  // Track view_cart when drawer opens
  useEffect(() => {
    if (open && !hasTrackedOpen.current) {
      hasTrackedOpen.current = true;
      const subtotal = getTotal();
      track('view_cart', {
        items: cart.items?.map((item) => ({
          product_id: item.product_id,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        })) || [],
        item_count: cart.items?.length || 0,
        subtotal,
      });
    }
    if (!open) {
      hasTrackedOpen.current = false;
    }
  }, [open]);

  const loadProducts = async () => {
    try {
      const productIds = [...new Set(cart.items.map(item => item.product_id))];
      const promises = productIds.map(id => axios.get(`${API}/products/${id}`));
      const responses = await Promise.all(promises);
      const productsMap = {};
      responses.forEach(res => {
        productsMap[res.data.id] = res.data;
      });
      setProducts(productsMap);
    } catch {
      // If product loading fails, keep existing data
    }
  };

  const updateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;
    const product = products[item.product_id];
    if (product && newQuantity > Math.min(product.stock, 10)) return;
    const newItems = cart.items.map(i =>
      i.product_id === item.product_id && i.size === item.size && i.color === item.color
        ? { ...i, quantity: newQuantity }
        : i
    );
    await updateCart(newItems);
  };

  const handleRemove = async (item) => {
    await removeFromCart(item.product_id, item.size, item.color);
    toast.success('Item removed from cart');
  };

  const getTotal = useCallback(() => {
    return cart.items.reduce((sum, item) => {
      const product = products[item.product_id];
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  }, [cart.items, products]);

  const handleCheckout = () => {
    // Track begin_checkout
    const subtotal = getTotal();
    track('begin_checkout', {
      items: cart.items?.map((item) => ({
        product_id: item.product_id,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      })) || [],
      item_count: cart.items?.length || 0,
      subtotal,
      coupon_discount: couponDiscount,
    });

    setOpen(false);
    navigate('/cart');
  };

  const handleCouponRemove = () => {
    setCouponDiscount(0);
  };

  const subtotal = getTotal();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md bg-white border-l-0 p-0 flex flex-col">
            <div className="p-6 pb-0 flex justify-between items-center">
              <SheetTitle className="font-heading text-3xl font-normal tracking-tight">Shopping Cart</SheetTitle>
              <SheetDescription className="sr-only">
                Review the items in your cart and proceed to checkout.
              </SheetDescription>
            </div>
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            {cart.items?.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">Your cart is empty</p>

                {/* Show saved-for-later even when cart is empty */}
                <div className="w-full">
                  <SaveForLaterSection
                    savedItems={savedItems}
                    products={products}
                    onMoveToCart={moveToCart}
                    onRemove={removeSaved}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Free Shipping Progress Bar */}
                <div className="mb-6">
                  <FreeShippingProgressBar subtotal={subtotal} />
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6">
                  {cart.items.map((item, idx) => {
                    const product = products[item.product_id];
                    if (!product) return null;

                    return (
                      <div key={idx} className="flex gap-4 group" data-testid={`cart-item-${idx}`}>
                        <div className="relative aspect-square w-20 h-20 overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={getImageUrl(product.images[0])}
                            alt={product.name}
                            className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110"
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-heading text-base leading-tight truncate">{product.name}</h4>
                              <p className="font-mono text-sm flex-shrink-0">{formatPrice(product.price * item.quantity)}</p>
                            </div>
                            <p className="font-mono text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                              {item.size} / {item.color}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-border">
                              <button
                                className="px-2 py-1 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => updateQuantity(item, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                aria-label={`Decrease quantity of ${product.name}`}
                                data-testid={`cart-decrease-${idx}`}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-mono text-xs w-8 text-center">{item.quantity}</span>
                              <button
                                className="px-2 py-1 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => updateQuantity(item, item.quantity + 1)}
                                disabled={item.quantity >= product.stock || item.quantity >= 10}
                                aria-label={`Increase quantity of ${product.name}`}
                                data-testid={`cart-increase-${idx}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                onClick={() => saveItem(item)}
                                aria-label={`Save ${product.name} for later`}
                                data-testid={`cart-save-${idx}`}
                              >
                                <Bookmark className="h-2.5 w-2.5" />
                                Save
                              </button>
                              <button
                                className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => handleRemove(item)}
                                data-testid={`cart-remove-${idx}`}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Saved for Later Section */}
                  <SaveForLaterSection
                    savedItems={savedItems}
                    products={products}
                    onMoveToCart={moveToCart}
                    onRemove={removeSaved}
                  />
                </div>
                
                {/* Bottom section: Coupon, Subtotal, Upsell, Checkout */}
                <div className="mt-auto pt-6 border-t border-border space-y-5">
                  {/* Coupon Input */}
                  <CouponInput
                    onApply={async (code) => {
                      // Stub: accept NOIR10 for demo
                      await new Promise((r) => setTimeout(r, 800));
                      const normalized = code.trim().toUpperCase();
                      if (normalized === 'NOIR10') {
                        setCouponDiscount(10);
                        return { ok: true, discount: 10 };
                      }
                      return { ok: false, error: 'Invalid coupon code' };
                    }}
                    onRemove={handleCouponRemove}
                  />

                  {/* Subtotal */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-end">
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Subtotal</span>
                      <span className="font-heading text-2xl">{formatPrice(subtotal)}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-success">Discount ({couponDiscount}%)</span>
                        <span className="font-mono text-sm text-success">
                          −{formatPrice(subtotal * (couponDiscount / 100))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upsell */}
                  <CartUpsell cartItems={cart.items} products={products} />

                  {/* Checkout Button */}
                  <div className="space-y-3">
                    <Button
                      className="w-full h-14 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs tracking-[0.2em] uppercase transition-all duration-300 group"
                      onClick={handleCheckout}
                      disabled={!token || cart.items.length === 0}
                      data-testid="cart-checkout-btn"
                    >
                      {token ? (
                        <span className="flex items-center justify-center gap-2">
                          Checkout <Plus className="w-3 h-3 transition-transform group-hover:rotate-90" />
                        </span>
                      ) : 'Login to Checkout'}
                    </Button>
                    {cart.items.length > 0 && (
                      <p className="text-[10px] font-mono text-muted-foreground text-center tracking-wider">
                        SHIPPING & TAXES CALCULATED AT CHECKOUT
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
