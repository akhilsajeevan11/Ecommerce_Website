import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Box, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setFeaturedProducts(response.data.slice(0, 6));
    } catch (error) {
      console.error('Error fetching featured products:', error);
    }
  };

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        height: 'calc(100vh - 80px)', 
        overflow: 'hidden',
        background: '#000'
      }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <img
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2000&auto=format&fit=crop"
            alt="Monochrome Luxury"
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              filter: 'grayscale(100%) brightness(0.7)',
            }}
          />
        </div>
        
        <div style={{ 
          position: 'relative', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '0 24px',
          textAlign: 'center',
          color: '#fff'
        }}>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{ 
              fontFamily: "'Bodoni Moda', serif", 
              fontSize: 'clamp(48px, 10vw, 120px)', 
              fontWeight: 700, 
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              marginBottom: '24px',
              textTransform: 'uppercase'
            }}
          >
            MONOCHROME<br />LUXURY
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            style={{ 
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              marginBottom: '48px',
              opacity: 0.8
            }}
          >
            Timeless Fashion in Black & White
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <Link to="/shop">
              <button style={{ 
                background: '#fff', 
                color: '#000', 
                padding: '16px 40px', 
                fontSize: '14px', 
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                borderRadius: 0,
                fontFamily: 'inherit',
                transition: 'transform 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Shop Now
                <ArrowRight style={{ width: '18px', height: '18px' }} />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Collection Section */}
      <section style={{ padding: '120px 48px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end', 
            marginBottom: '64px' 
          }}>
            <div>
              <h2 style={{ 
                fontFamily: "'Bodoni Moda', serif", 
                fontSize: 'clamp(32px, 5vw, 64px)', 
                fontWeight: 700, 
                marginBottom: '16px',
                lineHeight: 1,
                letterSpacing: '-0.02em'
              }}>
                Featured Collection
              </h2>
              <p style={{ 
                fontFamily: "'JetBrains Mono', monospace", 
                fontSize: '11px', 
                letterSpacing: '0.2em', 
                textTransform: 'uppercase', 
                color: '#71717a' 
              }}>
                Curated pieces for the season
              </p>
            </div>
            <Link to="/shop">
              <button style={{ 
                background: '#fff', 
                color: '#000', 
                border: '1px solid #e4e4e7', 
                padding: '12px 24px', 
                fontSize: '13px',
                cursor: 'pointer',
                borderRadius: 0,
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = '#000'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = '#e4e4e7'}
              >
                View All
              </button>
            </Link>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '48px' 
          }}>
            {featuredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ background: '#f8f8f8', padding: '100px 48px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '48px' 
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                <Box style={{ width: '32px', height: '32px', strokeWidth: 1.5 }} />
              </div>
              <h3 style={{ 
                fontFamily: "'Bodoni Moda', serif", 
                fontSize: '20px', 
                fontWeight: 600, 
                marginBottom: '12px' 
              }}>
                Premium Quality
              </h3>
              <p style={{ 
                fontFamily: "'Manrope', sans-serif", 
                color: '#71717a', 
                fontSize: '14px', 
                lineHeight: 1.6 
              }}>
                Handpicked materials and meticulous craftsmanship in every piece
              </p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                <RotateCcw style={{ width: '32px', height: '32px', strokeWidth: 1.5 }} />
              </div>
              <h3 style={{ 
                fontFamily: "'Bodoni Moda', serif", 
                fontSize: '20px', 
                fontWeight: 600, 
                marginBottom: '12px' 
              }}>
                Free Returns
              </h3>
              <p style={{ 
                fontFamily: "'Manrope', sans-serif", 
                color: '#71717a', 
                fontSize: '14px', 
                lineHeight: 1.6 
              }}>
                30-day return policy for a completely risk-free shopping experience
              </p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                <Sparkles style={{ width: '32px', height: '32px', strokeWidth: 1.5 }} />
              </div>
              <h3 style={{ 
                fontFamily: "'Bodoni Moda', serif", 
                fontSize: '20px', 
                fontWeight: 600, 
                marginBottom: '12px' 
              }}>
                Exclusive Design
              </h3>
              <p style={{ 
                fontFamily: "'Manrope', sans-serif", 
                color: '#71717a', 
                fontSize: '14px', 
                lineHeight: 1.6 
              }}>
                Limited edition pieces designed specifically for our monochrome collection
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;


