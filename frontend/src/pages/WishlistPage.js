import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth, useWishlist, useCart } from '../context/AppContext';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, X, ShoppingBag } from 'lucide-react';
import { getImageUrl } from '../utils/getImageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WishlistPage = () => {
  const { token } = useAuth();
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      toast.error('Please login to view wishlist');
      navigate('/');
      return;
    }
    loadWishlistProducts();
  }, [token, wishlist.items, navigate]);

  const loadWishlistProducts = async () => {
    if (!wishlist.items || wishlist.items.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      const promises = wishlist.items.map(id => 
        axios.get(`${API}/products/${id}`).catch(() => null)
      );
      const responses = await Promise.all(promises);
      const loadedProducts = responses.filter(r => r?.data).map(r => r.data);
      setProducts(loadedProducts);
    } catch (error) {
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product) => {
    const defaultSize = product.sizes?.[0] || 'M';
    const defaultColor = product.colors?.[0] || 'Black';
    await addToCart(product, defaultSize, defaultColor, 1);
    toast.success('Added to cart');
  };

  const handleRemove = async (productId) => {
    await removeFromWishlist(productId);
    toast.success('Removed from wishlist');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", color: '#71717a' }}>Loading wishlist...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div style={{ minHeight: '70vh', padding: '48px 24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 className="heading-font" style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '48px', textAlign: 'center' }}>
            Wishlist
          </h1>
          <div style={{ textAlign: 'center', padding: '64px 24px', border: '1px solid #e4e4e7' }}>
            <Heart style={{ width: '48px', height: '48px', color: '#d4d4d8', margin: '0 auto 24px' }} />
            <h2 className="heading-font" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Your wishlist is empty</h2>
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '14px', color: '#71717a', marginBottom: '32px' }}>Save items you love for later.</p>
            <Link to="/shop">
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '13px', fontWeight: 500 }}>
                <ShoppingBag style={{ width: '16px', height: '16px' }} />
                Browse Products
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '80vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <h1 className="heading-font" style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Wishlist</h1>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#71717a' }}>{products.length} items</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
          {products.map((product, idx) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}>
              <div style={{ position: 'relative', border: '1px solid #e4e4e7', overflow: 'hidden' }}>
                <Link to={`/product/${product.id}`}>
                  <img src={getImageUrl(product.images?.[0]) || 'https://via.placeholder.com/400x500'} alt={product.name}
                    style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block', filter: 'grayscale(30%)' }} />
                </Link>
                <button onClick={() => handleRemove(product.id)}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: '16px', height: '16px' }} />
                </button>
                <div style={{ padding: '12px', borderTop: '1px solid #f4f4f5' }}>
                  <button onClick={() => handleAddToCart(product)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '12px', fontWeight: 500 }}>
                    <ShoppingCart style={{ width: '14px', height: '14px' }} />Add to Cart
                  </button>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: '#000' }}>
                  <h3 className="heading-font" style={{ fontSize: '1rem', fontWeight: 500, letterSpacing: '-0.01em', margin: '0 0 4px 0' }}>{product.name}</h3>
                </Link>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#71717a', margin: '0 0 8px 0' }}>{product.category}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1rem', fontWeight: 700 }}>₹{product.price?.toFixed(2)}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: product.stock > 0 ? '#16a34a' : '#dc2626' }}>
                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
