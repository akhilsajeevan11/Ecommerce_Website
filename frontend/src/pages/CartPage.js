import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useCart, useAuth } from '../context/AppContext';
import { Minus, Plus, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';
import { getImageUrl } from '../utils/getImageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CartPage = () => {
  const { cart, removeFromCart, updateCart } = useCart();
  const { token } = useAuth();
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (cart.items?.length > 0) {
      loadProducts();
    } else {
      setLoading(false);
    }
  }, [cart.items]);

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
    } catch (error) {
      console.error('Load products error:', error);
      toast.error('Failed to load cart items');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;
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

  const getSubtotal = () => {
    return cart.items.reduce((sum, item) => {
      const product = products[item.product_id];
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const getShipping = () => {
    const subtotal = getSubtotal();
    return subtotal > 5000 ? 0 : 199;
  };

  const getTotal = () => {
    return getSubtotal() + getShipping();
  };

  const handleCheckout = () => {
    if (!token) {
      toast.error('Please login to checkout');
      return;
    }
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="page-transition min-h-screen flex items-center justify-center">
        <p className="mono-font text-zinc-500">Loading cart...</p>
      </div>
    );
  }

  // Empty cart state
  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="page-transition min-h-screen px-6 md:px-12 lg:px-24 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="heading-font text-4xl md:text-6xl font-bold tracking-tight mb-12">
            Shopping Cart
          </h1>
          <div className="text-center py-24 border border-zinc-200">
            <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-zinc-300" />
            <h2 className="heading-font text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="mono-font text-sm text-zinc-500 mb-8">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Link to="/shop">
              <Button className="rounded-none bg-black text-white hover:bg-zinc-800 btn-noir">
                Continue Shopping
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition min-h-screen px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="heading-font text-4xl md:text-6xl font-bold tracking-tight mb-12">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cart.items.map((item, idx) => {
              const product = products[item.product_id];
              if (!product) return null;

              return (
                <motion.div
                  key={`${item.product_id}-${item.size}-${item.color}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="flex gap-6 border-b border-zinc-200 pb-6"
                  data-testid={`cart-item-${idx}`}
                >
                  {/* Product Image */}
                  <Link to={`/product/${product.id}`}>
                    <img
                      src={getImageUrl(product.images?.[0]) || 'https://via.placeholder.com/150'}
                      alt={product.name}
                      className="w-28 h-36 object-cover grayscale-image"
                    />
                  </Link>

                  {/* Product Details */}
                  <div className="flex-1">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="heading-font text-lg font-medium tracking-tight hover:opacity-70 transition-opacity">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="mono-font text-xs text-zinc-500 mt-1">
                      {product.category}
                    </p>
                    <p className="mono-font text-sm text-zinc-600 mt-2">
                      Size: {item.size} / Color: {item.color}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 mt-4">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-none"
                        onClick={() => updateQuantity(item, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        data-testid={`cart-decrease-${idx}`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="mono-font text-sm w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-none"
                        onClick={() => updateQuantity(item, item.quantity + 1)}
                        data-testid={`cart-increase-${idx}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Price and Remove */}
                  <div className="text-right">
                    <p className="mono-font text-lg font-bold">
                      ₹{(product.price * item.quantity).toFixed(2)}
                    </p>
                    <p className="mono-font text-xs text-zinc-500 mt-1">
                      ₹{product.price.toFixed(2)} each
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="mt-4 h-8 w-8"
                      onClick={() => handleRemove(item)}
                      data-testid={`cart-remove-${idx}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="border border-zinc-200 p-6 sticky top-24">
              <h2 className="heading-font text-xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="body-font text-zinc-600">Subtotal</span>
                  <span className="mono-font font-medium">₹{getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="body-font text-zinc-600">Shipping</span>
                  <span className="mono-font font-medium">
                    {getShipping() === 0 ? 'FREE' : `₹${getShipping().toFixed(2)}`}
                  </span>
                </div>
                {getShipping() > 0 && (
                  <p className="mono-font text-xs text-zinc-500">
                    Free shipping on orders over ₹5,000
                  </p>
                )}
              </div>

              <div className="border-t border-zinc-200 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="heading-font text-lg font-bold">Total</span>
                  <span className="mono-font text-xl font-bold">₹{getTotal().toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full rounded-none bg-black text-white hover:bg-zinc-800 btn-noir"
                onClick={handleCheckout}
                data-testid="checkout-btn"
              >
                {token ? 'Proceed to Checkout' : 'Login to Checkout'}
              </Button>

              <Link to="/shop" className="block mt-4">
                <Button variant="outline" className="w-full rounded-none">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
