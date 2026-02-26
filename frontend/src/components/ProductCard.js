import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth, useWishlist, useAuthModal } from '../context/AppContext';
import { toast } from 'sonner';

const ProductCard = ({ product }) => {
  const { user } = useAuth();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { openAuthModal } = useAuthModal();

  const isInWishlist = wishlist?.items?.includes(product.id);

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
