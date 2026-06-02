import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Sparkles } from 'lucide-react';
import { getImageUrl } from '../../utils/getImageUrl';
import { formatPrice } from '../../lib/formatters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * CartUpsell — "You may also like" section in the cart drawer.
 *
 * Fetches up to 6 products from the same categories as items in the cart,
 * then filters out items already in the cart and takes the first 3.
 *
 * @param {object} props
 * @param {{ product_id: string, size: string, color: string, quantity: number }[]} props.cartItems
 * @param {Record<string, object>} props.products — product data map keyed by product_id
 * @returns {JSX.Element|null}
 *
 * Source spec:
 *   Requirement 10.8 — "You may also like" row of up to 3 ProductCard instances
 */
const CartUpsell = ({ cartItems = [], products = {} }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cartItems.length === 0) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        // Collect unique categories from cart items
        const categories = [
          ...new Set(
            cartItems
              .map((item) => products[item.product_id]?.category)
              .filter(Boolean)
          ),
        ];

        if (categories.length === 0) {
          setSuggestions([]);
          setLoading(false);
          return;
        }

        const res = await axios.get(`${API}/products`, {
          params: {
            category: categories.join(','),
            limit: 6,
          },
        });

        const data = res.data?.items || res.data || [];
        const cartProductIds = new Set(cartItems.map((i) => i.product_id));

        // Filter out items already in cart, take first 3
        const filtered = data
          .filter((p) => !cartProductIds.has(p.id))
          .slice(0, 3);

        setSuggestions(filtered);
      } catch {
        // Silently hide on error (per spec)
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [cartItems, products]);

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="cart-upsell">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          You may also like
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
        {suggestions.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="flex-shrink-0 w-[120px] group block no-underline text-inherit"
            data-testid={`upsell-card-${product.id}`}
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-muted mb-1.5">
              <img
                src={getImageUrl(product.images?.[0])}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <h5 className="font-heading text-xs leading-tight truncate">
              {product.name}
            </h5>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
              {formatPrice(product.price)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CartUpsell;
