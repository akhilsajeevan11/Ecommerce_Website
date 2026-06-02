import React, { useState, useEffect, useCallback } from 'react';
import { Bookmark, ShoppingCart } from 'lucide-react';
import { getImageUrl } from '../../utils/getImageUrl';
import { formatPrice } from '../../lib/formatters';
import { noirToast as toast } from '../../lib/noir-toast';

const STORAGE_KEY = 'noir.savedForLater.v1';

/**
 * Reads the saved-for-later list from localStorage.
 * @returns {Array<{ product_id: string, size: string, color: string, quantity: number, product?: object }>}
 */
function readSavedItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Writes the saved-for-later list to localStorage.
 * @param {Array} items
 */
function writeSavedItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or disabled — silently ignore.
  }
}

/**
 * useSaveForLater — custom hook managing the saved-for-later list.
 *
 * Provides save, move-to-cart, and remove actions with localStorage persistence.
 * Designed to be used by CartDrawer to integrate save-for-later functionality.
 *
 * @param {Record<string, object>} products — product data map keyed by product_id
 * @param {(productId: string, size: string, color: string) => Promise<void>} onRemoveFromCart
 * @param {(product: object, size: string, color: string, qty: number) => Promise<void>} onAddToCart
 */
export function useSaveForLater(products, onRemoveFromCart, onAddToCart) {
  const [savedItems, setSavedItems] = useState(readSavedItems);

  // Re-read from localStorage whenever the hook re-mounts (e.g. drawer re-opens)
  useEffect(() => {
    setSavedItems(readSavedItems());
  }, []);

  const saveItem = useCallback(
    async (item) => {
      const product = products[item.product_id];
      if (!product) return;

      try {
        await onRemoveFromCart(item.product_id, item.size, item.color);
      } catch {
        toast.error('Could not save item');
        return;
      }

      const savedEntry = {
        product_id: item.product_id,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          images: product.images,
          stock: product.stock,
        },
      };

      setSavedItems((prev) => {
        const updated = [...prev, savedEntry];
        writeSavedItems(updated);
        return updated;
      });
      toast.success('Saved for later');
    },
    [products, onRemoveFromCart]
  );

  const moveToCart = useCallback(
    async (entry, index) => {
      const product = entry.product || products[entry.product_id];
      if (!product) return;

      try {
        await onAddToCart(product, entry.size, entry.color, entry.quantity);
      } catch (error) {
        if (error.message === 'MAX_QUANTITY_EXCEEDED') {
          toast.error('Maximum quantity reached (10)');
        } else if (error.message === 'INSUFFICIENT_STOCK') {
          toast.error('Not enough stock available');
        } else {
          toast.error('Could not move to cart');
        }
        return;
      }

      setSavedItems((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        writeSavedItems(updated);
        return updated;
      });
      toast.success('Moved to cart');
    },
    [products, onAddToCart]
  );

  const removeSaved = useCallback((index) => {
    setSavedItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      writeSavedItems(updated);
      return updated;
    });
  }, []);

  return { savedItems, saveItem, moveToCart, removeSaved };
}

/**
 * SaveForLaterSection — renders the "Saved for later" list below cart items.
 *
 * This is a pure presentation component that receives state from the
 * `useSaveForLater` hook.
 *
 * @param {object} props
 * @param {Array} props.savedItems — items saved for later
 * @param {Record<string, object>} props.products — product data map
 * @param {(entry: object, index: number) => void} props.onMoveToCart
 * @param {(index: number) => void} props.onRemove
 * @returns {JSX.Element|null}
 *
 * Source spec:
 *   Requirement 10.7 — save for later / move to cart actions
 */
const SaveForLaterSection = ({ savedItems = [], products = {}, onMoveToCart, onRemove }) => {
  if (savedItems.length === 0) return null;

  return (
    <div
      className="space-y-4 pt-4 border-t border-border"
      data-testid="saved-for-later-section"
    >
      <div className="flex items-center gap-1.5">
        <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          Saved for later ({savedItems.length})
        </span>
      </div>

      <div className="space-y-4">
        {savedItems.map((entry, idx) => {
          const product = entry.product || products[entry.product_id];
          if (!product) return null;

          return (
            <div
              key={`${entry.product_id}-${entry.size}-${entry.color}-${idx}`}
              className="flex gap-3 group"
              data-testid={`saved-item-${idx}`}
            >
              <div className="w-16 h-16 overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={getImageUrl(product.images?.[0])}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <h5 className="font-heading text-sm leading-tight truncate">
                    {product.name}
                  </h5>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {entry.size} / {entry.color}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => onMoveToCart(entry, idx)}
                    className="font-mono text-[9px] uppercase tracking-widest text-foreground hover:underline transition-colors flex items-center gap-1"
                    data-testid={`saved-move-to-cart-${idx}`}
                  >
                    <ShoppingCart className="h-2.5 w-2.5" />
                    Move to cart
                  </button>
                  <button
                    onClick={() => onRemove(idx)}
                    className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
                    data-testid={`saved-remove-${idx}`}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <p className="font-mono text-xs self-start pt-0.5">
                {formatPrice(product.price)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { SaveForLaterSection, readSavedItems, writeSavedItems };
export default SaveForLaterSection;
