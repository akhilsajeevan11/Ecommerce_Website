import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const CartContext = createContext();
const WishlistContext = createContext();
const AuthModalContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useAuth = () => useContext(AuthContext);
export const useCart = () => useContext(CartContext);
export const useWishlist = () => useContext(WishlistContext);
export const useAuthModal = () => useContext(AuthModalContext);

export const AppProviders = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [cart, setCart] = useState({ items: [] });
  const [wishlist, setWishlist] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

  const openAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };
  const closeAuthModal = () => setShowAuthModal(false);

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
      // Check if profile is incomplete (social login users)
      if (!response.data.phone) {
        setTimeout(() => setShowCompleteProfile(true), 1500);
      }
    } catch (error) {
      console.error('Load user error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Refresh user error:', error);
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

  const login = async (identifier, password) => {
    const response = await axios.post(`${API}/auth/login`, { identifier, password });
    const { access_token, user: userData } = response.data;
    console.log('[AppContext] Login successful:', { userId: userData.id, tokenType: response.data.token_type });
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    return response.data;
  };

  const sendOtp = async (email, password, name, phone, dob) => {
    const response = await axios.post(`${API}/auth/send-otp`, { email, password, name, phone: phone || null, dob: dob || null });
    console.log('[AppContext] OTP sent to:', email);
    return response.data;
  };

  const verifyOtpAndRegister = async (email, otp) => {
    const response = await axios.post(`${API}/auth/verify-otp-register`, { email, otp });
    console.log('[AppContext] OTP verified, user registered:', { userId: response.data.user.id, email: response.data.user.email });
    // Don't auto-login — user will be redirected to login form
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCart({ items: [] });
    setWishlist({ items: [] });
    localStorage.removeItem('token');
  };

  const socialLogin = (accessToken) => {
    console.log('[AppContext] Social login with token');
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
    // loadUser will be triggered by the token useEffect
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
    <AuthContext.Provider value={{ user, token, login, sendOtp, verifyOtpAndRegister, socialLogin, logout, loading, refreshUser, showCompleteProfile, setShowCompleteProfile }}>
      <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateCart, clearCart }}>
        <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist }}>
          <AuthModalContext.Provider value={{ showAuthModal, authModalMode, openAuthModal, closeAuthModal, setAuthModalMode }}>
            {children}
          </AuthModalContext.Provider>
        </WishlistContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
};
