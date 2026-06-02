import React from 'react';
import { getImageUrl } from '../../utils/getImageUrl';
import { formatPrice } from '../../lib/formatters';
import { Gift } from 'lucide-react';

/**
 * OrderSummary — Displays cart contents and cost breakdown during checkout.
 * 
 * @param {object} props
 * @param {Array} props.cartItems
 * @param {Record<string, object>} props.products
 * @param {number} props.subtotal
 * @param {number} props.shipping
 * @param {boolean} props.hasGiftWrap
 * @param {number} props.couponDiscount
 * @param {number} props.total
 * @returns {JSX.Element}
 *
 * Source spec:
 *   Requirement 11.6 — Sticky right-rail at lg+, inline below active step on mobile.
 *   (Note: the sticky/inline layout wrapper is handled by CheckoutWizard, 
 *    this component is just the inner content box).
 */
const OrderSummary = ({
  cartItems = [],
  products = {},
  subtotal = 0,
  shipping = 0,
  hasGiftWrap = false,
  couponDiscount = 0,
  total = 0,
}) => {
  return (
    <div className="bg-muted/30 border border-border p-6" data-testid="checkout-order-summary">
      <h2 className="font-heading text-xl mb-6">Order Summary</h2>
      
      {/* Items List */}
      <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
        {cartItems.map((item, idx) => {
          const product = products[item.product_id];
          if (!product) return null;

          return (
            <div key={idx} className="flex gap-4">
              <div className="relative aspect-square w-16 h-16 overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={getImageUrl(product.images?.[0])}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <h4 className="font-body text-sm font-medium leading-tight truncate">{product.name}</h4>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {item.size} / {item.color}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-mono text-xs text-muted-foreground">Qty {item.quantity}</span>
                  <span className="font-mono text-sm">{formatPrice(product.price * item.quantity)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakdown */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-body text-sm text-muted-foreground">Subtotal</span>
          <span className="font-mono text-sm">{formatPrice(subtotal)}</span>
        </div>
        
        {couponDiscount > 0 && (
          <div className="flex justify-between items-center">
            <span className="font-body text-sm text-success">Discount</span>
            <span className="font-mono text-sm text-success">−{formatPrice(couponDiscount)}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="font-body text-sm text-muted-foreground">Shipping</span>
          <span className="font-mono text-sm">
            {shipping === 0 ? 'FREE' : formatPrice(shipping)}
          </span>
        </div>

        {hasGiftWrap && (
          <div className="flex justify-between items-center">
            <span className="font-body text-sm text-muted-foreground flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5" /> Gift Wrap
            </span>
            <span className="font-mono text-sm">{formatPrice(49)}</span>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-border pt-3 mt-1">
          <span className="font-heading text-lg">Total</span>
          <span className="font-mono text-xl">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
