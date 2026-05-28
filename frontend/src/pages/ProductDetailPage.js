import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import ProductViewer3D from '../components/ProductViewer3D';
import Product360Viewer from '../components/Product360Viewer';
import { Heart, Star, Minus, Plus, ChevronLeft } from 'lucide-react';
import { useAuth, useCart, useWishlist, useAuthModal } from '../context/AppContext';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';
import { getImageUrl } from '../utils/getImageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductDetailPage = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const { addToCart } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { openAuthModal } = useAuthModal();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [viewMode, setViewMode] = useState('image');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (!user) { openAuthModal('login'); return; }
    if (!selectedSize || !selectedColor) { toast.error('Please select size and color'); return; }

    try {
      await addToCart(product, selectedSize, selectedColor, quantity);
      toast.success('Added to cart');
    } catch (error) {
      if (error.message === 'MAX_QUANTITY_EXCEEDED') {
        toast.error('Maximum quantity reached (10)');
      } else if (error.message === 'INSUFFICIENT_STOCK') {
        toast.error(`Only ${product.stock} available`);
      } else {
        toast.error('Could not add to cart');
      }
    }
  };

  const handleWishlist = () => {
    if (!user) { openAuthModal('login'); return; }
    const inWishlist = wishlist?.items?.includes(product.id);
    if (inWishlist) { removeFromWishlist(product.id); toast.success('Removed from wishlist'); }
    else { addToWishlist(product.id); toast.success('Added to wishlist'); }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) { openAuthModal('login'); return; }
    try {
      await axios.post(`${API}/reviews`, {
        product_id: id, rating: reviewForm.rating, comment: reviewForm.comment
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Review submitted');
      setReviewForm({ rating: 5, comment: '' });
      loadReviews();
      loadProduct();
    } catch (error) { toast.error('Failed to submit review'); }
  };

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const isInWishlist = wishlist?.items?.includes(product.id);
  const pad = isMobile ? '16px' : '48px';

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div style={{ padding: `24px ${pad}` }}>
        <Link to="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#a1a1aa', textDecoration: 'none' }}>
          <ChevronLeft style={{ width: '16px', height: '16px' }} />
          Back to Shop
        </Link>
      </div>

      <div style={{ padding: `0 ${pad} 96px` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '32px' : '80px' }}>

            {/* Left: Images */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Tabs value={viewMode} onValueChange={setViewMode}>
                {(product.model_3d_url || product.images_360?.length > 0) && (
                  <TabsList style={{ width: '100%', borderRadius: 0, background: '#f4f4f5', marginBottom: '24px', display: 'flex' }}>
                    <TabsTrigger value="image" style={{ flex: 1, borderRadius: 0 }} data-testid="view-image-tab">Images</TabsTrigger>
                    {product.model_3d_url && <TabsTrigger value="3d" style={{ flex: 1, borderRadius: 0 }} data-testid="view-3d-tab">3D</TabsTrigger>}
                    {product.images_360?.length > 0 && <TabsTrigger value="360" style={{ flex: 1, borderRadius: 0 }} data-testid="view-360-tab">360°</TabsTrigger>}
                  </TabsList>
                )}

                <TabsContent value="image" style={{ marginTop: 0 }}>
                  <div style={{ position: 'relative', background: '#fafafa', marginBottom: '16px', overflow: 'hidden' }}>
                    <img
                      src={getImageUrl(product.images?.[selectedImage] || product.images?.[0])}
                      alt={product.name}
                      style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', filter: 'grayscale(100%)', transition: 'filter 0.4s ease, transform 0.5s ease' }}
                      onMouseOver={(e) => { e.target.style.filter = 'grayscale(0%)'; e.target.style.transform = 'scale(1.03)'; }}
                      onMouseOut={(e) => { e.target.style.filter = 'grayscale(100%)'; e.target.style.transform = 'scale(1)'; }}
                    />
                    <button onClick={handleWishlist} data-testid="wishlist-btn" style={{
                      position: 'absolute', top: '16px', right: '16px', width: '40px', height: '40px',
                      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid #e4e4e7', cursor: 'pointer', borderRadius: 0
                    }}>
                      <Heart style={{ width: '20px', height: '20px', fill: isInWishlist ? '#000' : 'none', stroke: '#000' }} />
                    </button>
                  </div>
                  {product.images?.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {product.images.map((img, idx) => (
                        <button key={idx} onClick={() => setSelectedImage(idx)} style={{
                          width: '64px', height: '80px', overflow: 'hidden', border: selectedImage === idx ? '2px solid #000' : '2px solid #e4e4e7',
                          cursor: 'pointer', padding: 0, background: 'none', borderRadius: 0
                        }}>
                          <img src={getImageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="3d" style={{ marginTop: 0 }}>
                  <div style={{ aspectRatio: '4/5', background: '#fafafa' }}><ProductViewer3D modelUrl={product.model_3d_url} /></div>
                </TabsContent>
                <TabsContent value="360" style={{ marginTop: 0 }}>
                  <div style={{ aspectRatio: '4/5', background: '#fafafa' }}><Product360Viewer images={product.images_360} /></div>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Right: Product Info */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }} style={{ paddingTop: isMobile ? 0 : '32px' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.2em', color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '16px' }}>
                {product.category}
              </p>
              <h1 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: isMobile ? '28px' : '36px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '24px', lineHeight: 1.1 }} data-testid="product-title">
                {product.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '24px', fontWeight: 700 }}>₹{product.price?.toFixed(2)}</span>
                {product.rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Star style={{ width: '16px', height: '16px', fill: '#000' }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>{product.rating.toFixed(1)}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#a1a1aa' }}>({product.review_count})</span>
                  </div>
                )}
              </div>
              <p style={{ fontFamily: "'Manrope', sans-serif", color: '#52525b', lineHeight: 1.7, marginBottom: '32px', fontSize: '15px' }}>
                {product.description}
              </p>

              <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Size */}
                {product.sizes?.length > 0 && (
                  <div>
                    <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Size</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {product.sizes.map(size => (
                        <button key={size} onClick={() => setSelectedSize(size)} data-testid={`size-${size}`} style={{
                          minWidth: '48px', height: '44px', padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px',
                          border: selectedSize === size ? '1px solid #000' : '1px solid #e4e4e7',
                          background: selectedSize === size ? '#000' : '#fff',
                          color: selectedSize === size ? '#fff' : '#000',
                          cursor: 'pointer', borderRadius: 0, transition: 'all 0.2s'
                        }}>{size}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color */}
                {product.colors?.length > 0 && (
                  <div>
                    <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Color</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {product.colors.map(color => (
                        <button key={color} onClick={() => setSelectedColor(color)} data-testid={`color-${color}`} style={{
                          minWidth: '72px', height: '44px', padding: '0 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px',
                          border: selectedColor === color ? '1px solid #000' : '1px solid #e4e4e7',
                          background: selectedColor === color ? '#000' : '#fff',
                          color: selectedColor === color ? '#fff' : '#000',
                          cursor: 'pointer', borderRadius: 0, transition: 'all 0.2s'
                        }}>{color}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Quantity</label>
                  <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #e4e4e7' }}>
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Minus style={{ width: '16px', height: '16px' }} />
                    </button>
                    <span style={{ width: '48px', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Plus style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>

                {/* Add to Cart */}
                <button onClick={handleAddToCart} disabled={product.stock === 0} data-testid="add-to-cart-btn" style={{
                  width: '100%', height: '56px', background: '#000', color: '#fff', border: 'none', cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
                  opacity: product.stock === 0 ? 0.5 : 1, transition: 'opacity 0.2s'
                }}>
                  {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>

                {product.stock > 0 && (
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#a1a1aa', textAlign: 'center' }}>
                    {product.stock} items in stock
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Reviews Section */}
          <div style={{ marginTop: '96px', paddingTop: '48px', borderTop: '1px solid #e4e4e7' }}>
            <h2 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: '24px', fontWeight: 700, marginBottom: '32px' }}>
              Reviews {reviews.length > 0 && `(${reviews.length})`}
            </h2>

            {/* Review Form */}
            {user && (
              <form onSubmit={handleReviewSubmit} data-testid="review-form" style={{ marginBottom: '48px', padding: '24px', background: '#fafafa' }}>
                <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '24px' }}>Write a Review</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#71717a', display: 'block', marginBottom: '8px' }}>Rating</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map(num => (
                        <button key={num} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: num })} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '4px'
                        }}>
                          <Star style={{ width: '20px', height: '20px', fill: num <= reviewForm.rating ? '#000' : '#e4e4e7', stroke: num <= reviewForm.rating ? '#000' : '#e4e4e7' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#71717a', display: 'block', marginBottom: '8px' }}>Comment</label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      placeholder="Share your thoughts..."
                      required
                      data-testid="review-comment-input"
                      style={{
                        width: '100%', minHeight: '100px', padding: '16px', border: '1px solid #e4e4e7', borderRadius: 0,
                        fontFamily: "'Manrope', sans-serif", fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <button type="submit" data-testid="review-submit-btn" style={{
                    alignSelf: 'flex-start', padding: '12px 24px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase'
                  }}>
                    Submit Review
                  </button>
                </div>
              </form>
            )}

            {/* Reviews List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {reviews.length > 0 ? (
                reviews.map(review => (
                  <div key={review.id} data-testid={`review-${review.id}`} style={{ paddingBottom: '24px', borderBottom: '1px solid #f4f4f5' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>{review.user_name}</p>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} style={{ width: '12px', height: '12px', fill: i < review.rating ? '#000' : '#e4e4e7', stroke: i < review.rating ? '#000' : '#e4e4e7' }} />
                          ))}
                        </div>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#a1a1aa' }}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '14px', color: '#52525b', lineHeight: 1.7, marginTop: '12px' }}>{review.comment}</p>
                  </div>
                ))
              ) : (
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#a1a1aa', textAlign: 'center', padding: '48px 0' }}>No reviews yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
