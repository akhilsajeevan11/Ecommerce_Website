import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import ProductViewer3D from '../components/ProductViewer3D';
import Product360Viewer from '../components/Product360Viewer';
import { Heart, Star, Minus, Plus, ChevronLeft } from 'lucide-react';
import { useAuth, useCart, useWishlist } from '../context/AppContext';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductDetailPage = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const { addToCart } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [viewMode, setViewMode] = useState('image');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    loadProduct();
    loadReviews();
    window.scrollTo(0, 0);
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
      if (response.data.sizes?.length > 0) setSelectedSize(response.data.sizes[0]);
      if (response.data.colors?.length > 0) setSelectedColor(response.data.colors[0]);
    } catch (error) {
      toast.error('Product not found');
    }
  };

  const loadReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Load reviews error:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) {
      toast.error('Please select size and color');
      return;
    }
    await addToCart(product, selectedSize, selectedColor, quantity);
    toast.success('Added to cart');
  };

  const handleWishlist = () => {
    if (!user) {
      toast.error('Please login to add to wishlist');
      return;
    }
    const inWishlist = wishlist?.items?.includes(product.id);
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist(product.id);
      toast.success('Added to wishlist');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Please login to review');
      return;
    }
    try {
      await axios.post(`${API}/reviews`, {
        product_id: id,
        rating: reviewForm.rating,
        comment: reviewForm.comment
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Review submitted');
      setReviewForm({ rating: 5, comment: '' });
      loadReviews();
      loadProduct();
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isInWishlist = wishlist?.items?.includes(product.id);

  return (
    <div className="page-transition">
      {/* Breadcrumb */}
      <div className="px-6 md:px-12 lg:px-24 py-6">
        <Link to="/shop" className="inline-flex items-center gap-2 mono-font text-xs text-zinc-400 hover:text-black transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Shop
        </Link>
      </div>

      <div className="px-6 md:px-12 lg:px-24 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            
            {/* Left: Images */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Tabs value={viewMode} onValueChange={setViewMode}>
                {(product.model_3d_url || product.images_360?.length > 0) && (
                  <TabsList className="w-full rounded-none bg-zinc-100 mb-6">
                    <TabsTrigger value="image" className="rounded-none flex-1" data-testid="view-image-tab">Images</TabsTrigger>
                    {product.model_3d_url && (
                      <TabsTrigger value="3d" className="rounded-none flex-1" data-testid="view-3d-tab">3D</TabsTrigger>
                    )}
                    {product.images_360?.length > 0 && (
                      <TabsTrigger value="360" className="rounded-none flex-1" data-testid="view-360-tab">360°</TabsTrigger>
                    )}
                  </TabsList>
                )}

                <TabsContent value="image" className="mt-0">
                  {/* Main Image */}
                  <div className="relative bg-zinc-50 mb-4">
                    <img
                      src={product.images?.[selectedImage] || product.images?.[0]}
                      alt={product.name}
                      className="w-full aspect-[4/5] object-cover grayscale-image"
                    />
                    <button
                      onClick={handleWishlist}
                      className="absolute top-4 right-4 w-10 h-10 bg-white flex items-center justify-center border border-zinc-200 hover:border-black transition-colors"
                      data-testid="wishlist-btn"
                    >
                      <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-black' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Thumbnails */}
                  {product.images?.length > 1 && (
                    <div className="flex gap-2">
                      {product.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(idx)}
                          className={`w-16 h-20 overflow-hidden border-2 transition-colors ${
                            selectedImage === idx ? 'border-black' : 'border-zinc-200 hover:border-zinc-400'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="3d" className="mt-0">
                  <div className="aspect-[4/5] bg-zinc-50">
                    <ProductViewer3D modelUrl={product.model_3d_url} />
                  </div>
                </TabsContent>

                <TabsContent value="360" className="mt-0">
                  <div className="aspect-[4/5] bg-zinc-50">
                    <Product360Viewer images={product.images_360} />
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Right: Product Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:pt-8"
            >
              {/* Category */}
              <p className="mono-font text-xs tracking-widest text-zinc-400 uppercase mb-4">
                {product.category}
              </p>

              {/* Name */}
              <h1 className="heading-font text-3xl md:text-4xl font-bold tracking-tight mb-6" data-testid="product-title">
                {product.name}
              </h1>

              {/* Price & Rating */}
              <div className="flex items-center gap-6 mb-8">
                <span className="mono-font text-2xl font-bold">₹{product.price?.toFixed(2)}</span>
                {product.rating > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-black" />
                    <span className="mono-font text-sm">{product.rating.toFixed(1)}</span>
                    <span className="mono-font text-sm text-zinc-400">({product.review_count})</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="body-font text-zinc-600 leading-relaxed mb-8">
                {product.description}
              </p>

              <div className="border-t border-zinc-200 pt-8 space-y-6">
                {/* Size */}
                {product.sizes?.length > 0 && (
                  <div>
                    <label className="mono-font text-xs tracking-widest uppercase mb-3 block">Size</label>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-[48px] h-11 px-4 mono-font text-sm border transition-colors ${
                            selectedSize === size
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-black border-zinc-200 hover:border-black'
                          }`}
                          data-testid={`size-${size}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color */}
                {product.colors?.length > 0 && (
                  <div>
                    <label className="mono-font text-xs tracking-widest uppercase mb-3 block">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map(color => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`min-w-[72px] h-11 px-4 mono-font text-xs border transition-colors ${
                            selectedColor === color
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-black border-zinc-200 hover:border-black'
                          }`}
                          data-testid={`color-${color}`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="mono-font text-xs tracking-widest uppercase mb-3 block">Quantity</label>
                  <div className="inline-flex items-center border border-zinc-200">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-11 h-11 flex items-center justify-center hover:bg-zinc-50 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center mono-font text-sm">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-11 h-11 flex items-center justify-center hover:bg-zinc-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart */}
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="w-full h-14 rounded-none bg-black text-white hover:bg-zinc-800 mono-font text-sm tracking-wider uppercase"
                  data-testid="add-to-cart-btn"
                >
                  {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </Button>

                {/* Stock */}
                {product.stock > 0 && (
                  <p className="mono-font text-xs text-zinc-400 text-center">
                    {product.stock} items in stock
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Reviews */}
          <div className="mt-24 pt-12 border-t border-zinc-200">
            <h2 className="heading-font text-2xl font-bold mb-8">
              Reviews {reviews.length > 0 && `(${reviews.length})`}
            </h2>
            
            {/* Review Form */}
            {user && (
              <form onSubmit={handleReviewSubmit} className="mb-12 p-6 bg-zinc-50" data-testid="review-form">
                <h3 className="mono-font text-sm tracking-wider uppercase mb-6">Write a Review</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mono-font text-xs text-zinc-500 mb-2 block">Rating</label>
                    <Select
                      value={reviewForm.rating.toString()}
                      onValueChange={(val) => setReviewForm({ ...reviewForm, rating: parseInt(val) })}
                    >
                      <SelectTrigger className="w-40 rounded-none" data-testid="review-rating-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 4, 3, 2, 1].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} Star{num > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mono-font text-xs text-zinc-500 mb-2 block">Comment</label>
                    <textarea
                      className="w-full min-h-[100px] p-4 border border-zinc-200 rounded-none focus:outline-none focus:border-black transition-colors body-font text-sm"
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      placeholder="Share your thoughts..."
                      required
                      data-testid="review-comment-input"
                    />
                  </div>
                  <Button type="submit" className="rounded-none bg-black text-white hover:bg-zinc-800 mono-font text-xs tracking-wider uppercase" data-testid="review-submit-btn">
                    Submit Review
                  </Button>
                </div>
              </form>
            )}

            {/* Reviews List */}
            <div className="space-y-6">
              {reviews.length > 0 ? (
                reviews.map(review => (
                  <div key={review.id} className="pb-6 border-b border-zinc-100 last:border-0" data-testid={`review-${review.id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="body-font font-medium text-sm">{review.user_name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < review.rating ? 'fill-black text-black' : 'fill-zinc-200 text-zinc-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="mono-font text-[10px] text-zinc-400">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="body-font text-sm text-zinc-600 leading-relaxed mt-3">{review.comment}</p>
                  </div>
                ))
              ) : (
                <p className="mono-font text-sm text-zinc-400 text-center py-12">No reviews yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
