import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { useCart, useAuth } from '../context/AppContext';
import { X, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CartDrawer = ({ children }) => {
  const { cart, removeFromCart, updateCart } = useCart();
  const { token } = useAuth();
  const [products, setProducts] = useState({});
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && cart.items?.length > 0) {
      loadProducts();
    }
  }, [open, cart.items]);

  const loadProducts = async () => {
    const productIds = [...new Set(cart.items.map(item => item.product_id))];
    const promises = productIds.map(id => axios.get(`${API}/products/${id}`));
    const responses = await Promise.all(promises);
    const productsMap = {};
    responses.forEach(res => {
      productsMap[res.data.id] = res.data;
    });
    setProducts(productsMap);
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

  const getTotal = () => {
    return cart.items.reduce((sum, item) => {
      const product = products[item.product_id];
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const handleCheckout = () => {
    setOpen(false);
    navigate('/cart');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="heading-font text-2xl font-bold tracking-tight">Shopping Cart</SheetTitle>
        </SheetHeader>
        <div className="mt-8 flex flex-col h-[calc(100vh-180px)]">
          {cart.items?.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-zinc-500 mono-font text-sm">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4">
                {cart.items.map((item, idx) => {
                  const product = products[item.product_id];
                  if (!product) return null;

                  return (
                    <div key={idx} className="flex gap-4 border-b border-zinc-200 pb-4" data-testid={`cart-item-${idx}`}>
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-20 h-20 object-cover grayscale-image"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="mono-font text-xs text-zinc-500">
                          {item.size} / {item.color}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6 rounded-none"
                            onClick={() => updateQuantity(item, item.quantity - 1)}
                            data-testid={`cart-decrease-${idx}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="mono-font text-sm w-8 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6 rounded-none"
                            onClick={() => updateQuantity(item, item.quantity + 1)}
                            data-testid={`cart-increase-${idx}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{(product.price * item.quantity).toFixed(2)}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 mt-2"
                          onClick={() => removeFromCart(item.product_id, item.size, item.color)}
                          data-testid={`cart-remove-${idx}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-zinc-200 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="mono-font text-sm tracking-wider uppercase">Total</span>
                  <span className="heading-font text-2xl font-bold">₹{getTotal().toFixed(2)}</span>
                </div>
                <Button
                  className="w-full rounded-none bg-black text-white hover:bg-zinc-800 btn-noir"
                  onClick={handleCheckout}
                  disabled={!token}
                  data-testid="cart-checkout-btn"
                >
                  {token ? 'Proceed to Checkout' : 'Login to Checkout'}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
