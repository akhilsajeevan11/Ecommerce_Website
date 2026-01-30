import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Box, RotateCcw, Sparkles, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

// Fallback products when API is unavailable
const fallbackProducts = [
  { id: 1, name: 'Classic Black Tee', category: 'T-Shirt', price: 2999.00, rating: 4.5, reviews_count: 12, images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'] },
  { id: 2, name: 'Minimalist Hoodie', category: 'Hoodie', price: 6999.00, rating: 4.8, reviews_count: 24, images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400'] },
  { id: 3, name: 'Structured Blazer', category: 'Jacket', price: 14999.00, rating: 4.9, reviews_count: 18, images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400'] },
  { id: 4, name: 'Wide Leg Trousers', category: 'Pants', price: 7999.00, rating: 4.6, reviews_count: 15, images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400'] },
  { id: 5, name: 'Oversized Shirt', category: 'Shirt', price: 4999.00, rating: 4.7, reviews_count: 22, images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400'] },
  { id: 6, name: 'Knit Sweater', category: 'Sweater', price: 8999.00, rating: 4.8, reviews_count: 19, images: ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400'] },
];

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState(fallbackProducts);

  useEffect(() => {
    // Fetch featured products
    fetch(`${API_URL}/products?skip=0&limit=6`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setFeaturedProducts(data);
        }
      })
      .catch(err => console.error('Error fetching products:', err));
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <section style={{ position: 'relative', height: 'calc(100vh - 64px)', background: '#000', color: '#fff' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop"
            alt="Hero"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7, filter: 'grayscale(100%)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} />
        </div>
        <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 className="heading-font" style={{ fontSize: 'clamp(3.5rem, 12vw, 8rem)', fontWeight: 400, marginBottom: '16px', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
              MONOCHROME
              <br />
              LUXURY
            </h1>
            <p className="mono-font" style={{ fontSize: '12px', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '40px', color: '#fff', opacity: 0.9 }}>
              Timeless Fashion in Black & White
            </p>
            <Link to="/shop">
              <button style={{ 
                borderRadius: '0px', 
                background: '#fff', 
                color: '#000', 
                padding: '14px 32px', 
                fontSize: '14px', 
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease'
              }}>
                Shop Now
                <ArrowRight style={{ width: '18px', height: '18px' }} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Collection Section */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
            <div>
              <h2 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', fontWeight: 700, marginBottom: '8px', fontStyle: 'normal', letterSpacing: '-0.025em', lineHeight: 1 }}>
                Featured Collection
              </h2>
              <p className="mono-font" style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#71717a' }}>
                Curated pieces for the season
              </p>
            </div>
            <Link to="/shop">
              <button style={{ 
                background: '#fff', 
                color: '#000', 
                border: '1px solid #e4e4e7', 
                padding: '10px 20px', 
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}>
                View All
              </button>
            </Link>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
            {featuredProducts.map(product => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Link 
                  to={`/product/${product.id}`} 
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div style={{ position: 'relative', overflow: 'hidden', background: '#f4f4f5', marginBottom: '16px' }}>
                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/400x500'}
                      alt={product.name}
                      style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', filter: 'grayscale(100%)', transition: 'all 0.4s ease' }}
                      onMouseOver={(e) => { e.target.style.filter = 'grayscale(0%)'; e.target.style.transform = 'scale(1.05)'; }}
                      onMouseOut={(e) => { e.target.style.filter = 'grayscale(100%)'; e.target.style.transform = 'scale(1)'; }}
                    />
                    <button
                      style={{
                        position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px',
                        background: '#fff', border: '1px solid #e4e4e7', borderRadius: '0px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                      }}
                      onClick={(e) => e.preventDefault()}
                    >
                      <Heart style={{ width: '16px', height: '16px', stroke: '#000' }} />
                    </button>
                  </div>
                  <h3 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{product.name}</h3>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#71717a', marginBottom: '12px', textTransform: 'lowercase' }}>{product.category}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 600 }}>₹{product.price?.toFixed(2)}</span>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#000' }}>★</span> {product.rating?.toFixed(1)} ({product.reviews_count || 0})
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section - The NOIR Philosophy */}
      <section style={{ background: '#18181b', color: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '48px', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, marginBottom: '32px', lineHeight: 1.2, fontStyle: 'normal' }}>
                The NOIR
                <br />
                Philosophy
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p className="body-font" style={{ fontSize: '15px', color: '#a1a1aa', lineHeight: 1.8 }}>
                  We believe in the power of simplicity. Our designs strip away the unnecessary,
                  leaving only what matters: form, texture, and craftsmanship.
                </p>
                <p className="body-font" style={{ fontSize: '15px', color: '#a1a1aa', lineHeight: 1.8 }}>
                  Every piece is a statement of confidence, designed for those who understand
                  that true luxury doesn't shout—it whispers.
                </p>
              </div>
            </div>
            <div>
              <img
                src="https://images.unsplash.com/photo-1760512901586-f70030a53cd1?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
                alt="About NOIR"
                style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Immersive Shopping Experience Section */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', fontWeight: 700, marginBottom: '64px', lineHeight: 1, textAlign: 'center', fontStyle: 'normal', letterSpacing: '-0.025em' }}>
            Immersive Shopping Experience
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '40px 32px', border: '1px solid #e4e4e7', textAlign: 'center' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                margin: '0 auto 24px', 
                background: '#fef3c7', 
                borderRadius: '8px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Box style={{ width: '28px', height: '28px', color: '#f59e0b' }} />
              </div>
              <h3 className="heading-font-normal" style={{ fontSize: '17px', fontWeight: 400, marginBottom: '12px' }}>3D Product Viewer</h3>
              <p className="body-font" style={{ color: '#71717a', lineHeight: 1.7, fontSize: '13px' }}>
                Explore products from every angle with interactive 3D models
              </p>
            </div>
            <div style={{ padding: '40px 32px', border: '1px solid #e4e4e7', textAlign: 'center' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                margin: '0 auto 24px', 
                background: '#dbeafe', 
                borderRadius: '8px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <RotateCcw style={{ width: '28px', height: '28px', color: '#3b82f6' }} />
              </div>
              <h3 className="heading-font-normal" style={{ fontSize: '17px', fontWeight: 400, marginBottom: '12px' }}>360° View</h3>
              <p className="body-font" style={{ color: '#71717a', lineHeight: 1.7, fontSize: '13px' }}>
                See every detail with our 360-degree product photography
              </p>
            </div>
            <div style={{ padding: '40px 32px', border: '1px solid #e4e4e7', textAlign: 'center' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                margin: '0 auto 24px', 
                background: '#18181b', 
                borderRadius: '8px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Sparkles style={{ width: '28px', height: '28px', color: '#fbbf24' }} />
              </div>
              <h3 className="heading-font-normal" style={{ fontSize: '17px', fontWeight: 400, marginBottom: '12px' }}>Premium Quality</h3>
              <p className="body-font" style={{ color: '#71717a', lineHeight: 1.7, fontSize: '13px' }}>
                Handpicked materials and meticulous craftsmanship in every piece
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

