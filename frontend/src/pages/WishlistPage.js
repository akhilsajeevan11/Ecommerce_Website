import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useWishlist, useCart } from '../context/AppContext';
import { noirToast } from '../lib/noir-toast';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Share2, Check } from 'lucide-react';
import ProductCard from '../components/ProductCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WishlistPage = () => {
  const { token } = useAuth();
  const { wishlist } = useWishlist();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadWishlistProducts = useCallback(async () => {
    if (!wishlist.items || wishlist.items.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      const promises = wishlist.items.map((id) =>
        axios.get(`${API}/products/${id}`).catch(() => null)
      );
      const responses = await Promise.all(promises);
      const loadedProducts = responses.filter((r) => r?.data).map((r) => r.data);
      setProducts(loadedProducts);
    } catch {
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  }, [wishlist.items]);

  useEffect(() => {
    if (!token) {
      toast.error('Please login to view wishlist');
      navigate('/');
      return;
    }
    loadWishlistProducts();
  }, [token, loadWishlistProducts, navigate]);

  const handleShareWishlist = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Wishlist link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="font-mono text-sm text-muted-foreground">Loading wishlist...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-[70vh] px-6 py-12">
        <div className="max-w-xl mx-auto">
          <h1 className="font-heading text-4xl font-bold tracking-tight mb-12 text-center">
            Wishlist
          </h1>
          <div className="text-center py-16 px-6 border border-border">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-6" />
            <h2 className="font-heading text-2xl font-bold mb-2">Your wishlist is empty</h2>
            <p className="font-body text-sm text-muted-foreground mb-8">
              Save items you love for later.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-body text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] px-4 sm:px-6 py-12">
      <div className="max-w-screen-xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-baseline gap-4">
            <h1 className="font-heading text-4xl font-bold tracking-tight">Wishlist</h1>
            <span className="font-mono text-sm text-muted-foreground">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Share wishlist button */}
          <button
            onClick={handleShareWishlist}
            aria-label="Share wishlist"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border font-body text-sm font-medium hover:border-foreground transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span className="text-success">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share wishlist
              </>
            )}
          </button>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-8">
          {products.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
