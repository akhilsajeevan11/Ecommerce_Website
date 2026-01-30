import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth, useWishlist } from '../context/AppContext';
import { toast } from 'sonner';

const ProductCard = ({ product }) => {
  const { user } = useAuth();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const isInWishlist = wishlist?.items?.includes(product.id);

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to add to wishlist');
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

  return (
    <Link 
      to={`/product/${product.id}`} 
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      data-testid={`product-card-${product.id}`}
    >
      {/* Image Container */}
      <div style={{ 
        position: 'relative', 
        overflow: 'hidden', 
        background: '#f4f4f5',
        marginBottom: '12px'
      }}>
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/400x500'}
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
            width: '36px',
            height: '36px',
            background: '#fff',
            border: '1px solid #e4e4e7',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#000'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#e4e4e7'}
          data-testid={`wishlist-btn-${product.id}`}
        >
          <Heart 
            style={{ 
              width: '18px', 
              height: '18px',
              fill: isInWishlist ? '#000' : 'none',
              stroke: '#000'
            }}
          />
        </button>
      </div>

      {/* Product Info */}
      <div>
        <h3 style={{ 
          fontFamily: "'Manrope', sans-serif", 
          fontSize: '14px', 
          fontWeight: 500,
          marginBottom: '4px'
        }}>
          {product.name}
        </h3>
        <p style={{ 
          fontFamily: "'JetBrains Mono', monospace", 
          fontSize: '11px', 
          color: '#71717a',
          marginBottom: '8px'
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
            fontSize: '13px', 
            fontWeight: 600 
          }}>
            ₹{product.price?.toFixed(2)}
          </span>
          {product.rating > 0 && (
            <span style={{ 
              fontFamily: "'JetBrains Mono', monospace", 
              fontSize: '11px', 
              color: '#71717a',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ★ {product.rating?.toFixed(1)} ({product.review_count || 0})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
