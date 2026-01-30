import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth, useWishlist, useCart } from '../context/AppContext';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, X, ShoppingBag } from 'lucide-react';

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
      <div className="page-transition min-h-screen flex items-center justify-center">
        <p className="mono-font text-zinc-500">Loading wishlist...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="page-transition min-h-screen px-6 md:px-12 lg:px-24 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="heading-font text-4xl md:text-6xl font-bold tracking-tight mb-12">Wishlist</h1>
          <div className="text-center py-24 border border-zinc-200">
            <Heart className="w-16 h-16 mx-auto mb-6 text-zinc-300" />
            <h2 className="heading-font text-2xl font-bold mb-2">Your wishlist is empty</h2>
            <p className="mono-font text-sm text-zinc-500 mb-8">Save items you love for later.</p>
            <Link to="/shop">
              <Button className="rounded-none bg-black text-white hover:bg-zinc-800 btn-noir">
                <ShoppingBag className="w-4 h-4 mr-2" />Browse Products
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
        <div className="flex items-center justify-between mb-12">
          <h1 className="heading-font text-4xl md:text-6xl font-bold tracking-tight">Wishlist</h1>
          <p className="mono-font text-sm text-zinc-500">{products.length} items</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, idx) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }} className="group">
              <div className="relative overflow-hidden border border-zinc-200">
                <Link to={`/product/${product.id}`}>
                  <img src={product.images?.[0] || 'https://via.placeholder.com/400x500'} alt={product.name}
                    className="w-full aspect-[3/4] object-cover grayscale-image" />
                </Link>
                <button onClick={() => handleRemove(product.id)}
                  className="absolute top-4 right-4 bg-white/90 p-2 rounded-none hover:bg-white">
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 translate-y-full group-hover:translate-y-0 transition-transform">
                  <Button onClick={() => handleAddToCart(product)}
                    className="w-full rounded-none bg-black text-white hover:bg-zinc-800 btn-noir text-sm">
                    <ShoppingCart className="w-4 h-4 mr-2" />Add to Cart
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                <Link to={`/product/${product.id}`}>
                  <h3 className="heading-font text-lg font-medium tracking-tight hover:opacity-70">{product.name}</h3>
                </Link>
                <p className="mono-font text-sm text-zinc-500">{product.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="mono-font text-lg font-bold">₹{product.price?.toFixed(2)}</span>
                  <span className={`mono-font text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
