import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { useAuth, useCart, useWishlist, useAuthModal } from '../context/AppContext';
import { toast } from 'sonner';
import { getImageUrl } from '../utils/getImageUrl';

const ProductCard = ({ product }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { openAuthModal } = useAuthModal();
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const isInWishlist = wishlist?.items?.includes(product.id);
  const isOutOfStock = product.stock === 0;

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (isInWishlist) {
      removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist(product.id);
      toast.success('Added to wishlist');
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openAuthModal('login');
      return;
    }

    if (isOutOfStock) return;

    const defaultSize = product.sizes?.[0] || 'M';
    const defaultColor = product.colors?.[0] || 'Black';

    setIsAddingToCart(true);
    try {
      await addToCart(product, defaultSize, defaultColor, 1);
      toast.success(`${product.name} added to cart`);
    } catch (error) {
      if (error.message === 'MAX_QUANTITY_EXCEEDED') {
        toast.error('Maximum quantity reached (10)');
      } else {
        toast.error('Could not add to cart');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <Link 
      to={`/product/${product.id}`} 
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      data-testid={`product-card-${product.id}`}
    >
      {/* Image Container */}
      <div 
        style={{ 
          position: 'relative', 
          overflow: 'hidden', 
          background: '#f4f4f5',
          marginBottom: '12px'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={getImageUrl(product.images?.[0]) || 'https://via.placeholder.com/400x500'}
          alt={product.name}
          style={{ 
            width: '100%', 
            aspectRatio: '3/4', 
            objectFit: 'cover',
            filter: 'grayscale(100%)',
            transition: 'filter 0.4s ease, transform 0.5s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.filter = 'grayscale(0%)';
            e.target.style.transform = 'scale(1.03)';
          }}
          onMouseOut={(e) => {
            e.target.style.filter = 'grayscale(100%)';
            e.target.style.transform = 'scale(1)';
          }}
        />
        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            background: '#fff',
            border: '1px solid #e4e4e7',
            borderRadius: '0px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#000';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e4e4e7';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          data-testid={`wishlist-btn-${product.id}`}
        >
          <Heart 
            style={{ 
              width: '16px', 
              height: '16px',
              fill: isInWishlist ? '#000' : 'none',
              stroke: '#000',
              strokeWidth: 1.5
            }}
          />
        </button>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAddingToCart}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            height: '32px',
            padding: isOutOfStock ? '0 12px' : '0 8px',
            background: isOutOfStock ? '#a1a1aa' : '#000',
            border: 'none',
            borderRadius: '0px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            zIndex: 10,
            opacity: isHovered || isOutOfStock ? 1 : 0,
            transform: isHovered || isOutOfStock ? 'translateY(0)' : 'translateY(8px)',
            pointerEvents: isHovered || isOutOfStock ? 'auto' : 'none'
          }}
          onMouseOver={(e) => {
            if (!isOutOfStock) {
              e.currentTarget.style.background = '#27272a';
            }
          }}
          onMouseOut={(e) => {
            if (!isOutOfStock) {
              e.currentTarget.style.background = '#000';
            }
          }}
          data-testid={`add-to-cart-btn-${product.id}`}
        >
          <ShoppingCart
            style={{
              width: '14px',
              height: '14px',
              stroke: '#fff',
              strokeWidth: 1.5
            }}
          />
          {isOutOfStock && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: '#fff',
              fontWeight: 500,
              letterSpacing: '0.02em'
            }}>
              Out of Stock
            </span>
          )}
        </button>
      </div>

      {/* Product Info */}
      <div>
        <h3 style={{ 
          fontFamily: "'Bodoni Moda', serif", 
          fontSize: '16px', 
          fontWeight: 700,
          marginBottom: '4px',
          letterSpacing: '-0.01em'
        }}>
          {product.name}
        </h3>
        <p style={{ 
          fontFamily: "'JetBrains Mono', monospace", 
          fontSize: '11px', 
          color: '#71717a',
          marginBottom: '12px',
          textTransform: 'lowercase'
        }}>
          {product.category}
        </p>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <span style={{ 
            fontFamily: "'JetBrains Mono', monospace", 
            fontSize: '14px', 
            fontWeight: 600,
            color: '#000'
          }}>
            ₹{product.price?.toFixed(2)}
          </span>
          <div style={{ 
            fontFamily: "'JetBrains Mono', monospace", 
            fontSize: '11px', 
            color: '#a1a1aa',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{ color: '#000' }}>★</span>
            <span style={{ color: '#71717a' }}>{product.rating?.toFixed(1)}</span>
            <span style={{ color: '#a1a1aa' }}>({product.reviews_count || product.review_count || 0})</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
