import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const CartContext = createContext();
const WishlistContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useAuth = () => useContext(AuthContext);
export const useCart = () => useContext(CartContext);
export const useWishlist = () => useContext(WishlistContext);

export const AppProviders = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [cart, setCart] = useState({ items: [] });
  const [wishlist, setWishlist] = useState({ items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadUser();
      loadCart();
      loadWishlist();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Load user error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart(response.data);
    } catch (error) {
      console.error('Load cart error:', error);
    }
  };

  const loadWishlist = async () => {
    try {
      const response = await axios.get(`${API}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlist(response.data);
    } catch (error) {
      console.error('Load wishlist error:', error);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCart({ items: [] });
    setWishlist({ items: [] });
    localStorage.removeItem('token');
  };

  const updateCart = async (items) => {
    if (!token) return;
    try {
      const response = await axios.post(`${API}/cart`, { items }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart(response.data);
    } catch (error) {
      console.error('Update cart error:', error);
    }
  };

  const addToCart = async (product, size, color, quantity = 1) => {
    const existingItem = cart.items.find(
      item => item.product_id === product.id && item.size === size && item.color === color
    );

    let newItems;
    if (existingItem) {
      newItems = cart.items.map(item =>
        item.product_id === product.id && item.size === size && item.color === color
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newItems = [...cart.items, { product_id: product.id, quantity, size, color }];
    }

    await updateCart(newItems);
  };

  const removeFromCart = async (productId, size, color) => {
    const newItems = cart.items.filter(
      item => !(item.product_id === productId && item.size === size && item.color === color)
    );
    await updateCart(newItems);
  };

  const clearCart = () => {
    setCart({ items: [] });
  };

  const addToWishlist = async (productId) => {
    if (!token) return;
    try {
      await axios.post(`${API}/wishlist/add`, { product_id: productId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadWishlist();
    } catch (error) {
      console.error('Add to wishlist error:', error);
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!token) return;
    try {
      await axios.post(`${API}/wishlist/remove`, { product_id: productId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadWishlist();
    } catch (error) {
      console.error('Remove from wishlist error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateCart, clearCart }}>
        <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist }}>
          {children}
        </WishlistContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
};
