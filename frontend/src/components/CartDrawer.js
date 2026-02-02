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
        <SheetContent side="right" className="w-full sm:max-w-md bg-white border-l-0 p-0 flex flex-col">
          <div className="p-6 pb-0 flex justify-between items-center">
            <SheetTitle className="font-heading text-3xl font-normal tracking-tight">Shopping Cart</SheetTitle>
          </div>
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            {cart.items?.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-zinc-400 font-mono text-xs tracking-widest uppercase">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-8">
                  {cart.items.map((item, idx) => {
                    const product = products[item.product_id];
                    if (!product) return null;

                    return (
                      <div key={idx} className="flex gap-6 group" data-testid={`cart-item-${idx}`}>
                        <div className="relative aspect-square w-24 h-24 overflow-hidden bg-zinc-100">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110"
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="font-heading text-lg leading-tight">{product.name}</h4>
                              <p className="font-mono text-sm">₹{(product.price * item.quantity).toLocaleString()}</p>
                            </div>
                            <p className="font-mono text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">
                              {item.size} / {item.color}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center border border-zinc-200">
                              <button
                                className="px-2 py-1 hover:bg-zinc-50 transition-colors"
                                onClick={() => updateQuantity(item, item.quantity - 1)}
                                data-testid={`cart-decrease-${idx}`}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-mono text-xs w-8 text-center">{item.quantity}</span>
                              <button
                                className="px-2 py-1 hover:bg-zinc-50 transition-colors"
                                onClick={() => updateQuantity(item, item.quantity + 1)}
                                data-testid={`cart-increase-${idx}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-black transition-colors"
                              onClick={() => removeFromCart(item.product_id, item.size, item.color)}
                              data-testid={`cart-remove-${idx}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-auto pt-8 border-t border-zinc-100 space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-400">Subtotal</span>
                    <span className="font-heading text-3xl">₹{getTotal().toLocaleString()}</span>
                  </div>
                  <div className="space-y-3">
                    <Button
                      className="w-full h-14 rounded-none bg-black text-white hover:bg-zinc-900 font-mono text-xs tracking-[0.2em] uppercase transition-all duration-300 group"
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
                      <p className="text-[10px] font-mono text-zinc-400 text-center tracking-wider">
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
