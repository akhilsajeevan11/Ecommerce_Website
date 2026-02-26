import { useEffect, useState } from 'react';
import { Slider } from '../components/ui/slider';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import ProductCard from '../components/ProductCard';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [maxPrice, setMaxPrice] = useState(50000);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const ALL_CATEGORIES = ["T-Shirt", "Hoodie", "Jacket", "Pants", "Shirt", "Sweater"];

  useEffect(() => {
    loadProducts();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, selectedCategories, priceRange]);

    const loadProducts = async () => {
      try {
        const response = await axios.get(`${API}/products`);
        setProducts(response.data);
        // Ensure ALL_CATEGORIES are available for filtering
        setCategories(ALL_CATEGORIES);
        const prices = response.data.map(p => p.price);
        const max = Math.max(...prices, 50000);
        setMaxPrice(max);
        setPriceRange([0, max]);
      } catch (error) {
        console.error('Load products error:', error);
      }
    };


  const applyFilters = () => {
    let filtered = products;
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => selectedCategories.includes(p.category));
    }
    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    setFilteredProducts(filtered);
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Mobile Filters Overlay
  const MobileFiltersOverlay = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileFiltersOpen(false)} />
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '280px', background: '#fff', padding: '24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: '20px', fontWeight: 700 }}>Filters</h2>
          <button onClick={() => setMobileFiltersOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
        <FilterContent 
          categories={categories}
          selectedCategories={selectedCategories}
          toggleCategory={toggleCategory}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          maxPrice={maxPrice}
        />
      </div>
    </div>
  );

    return (
      <div className="page-transition" style={{ background: '#fff', minHeight: '100vh' }}>
        <div style={{ padding: isMobile ? '32px 16px' : '64px 48px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            
            {/* Header */}
            <div style={{ marginBottom: '64px' }}>
              <h1 style={{ 
                fontFamily: "'Bodoni Moda', serif", 
                fontSize: isMobile ? '48px' : '72px', 
                fontWeight: 700, 
                letterSpacing: '-0.02em',
                marginBottom: '16px',
                lineHeight: 1
              }} data-testid="page-title">
                All Products
              </h1>
              <p style={{ 
                fontFamily: "'JetBrains Mono', monospace", 
                fontSize: '12px', 
                letterSpacing: '0.05em',
                color: '#71717a',
                textTransform: 'lowercase'
              }}>
                {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
              </p>
            </div>


            {/* Mobile Filter Button */}
            {isMobile && (
              <div style={{ marginBottom: '24px' }}>
                <Button 
                  variant="outline" 
                  style={{ borderRadius: 0, width: '100%', justifyContent: 'flex-start', height: '44px' }}
                  onClick={() => setMobileFiltersOpen(true)}
                  data-testid="mobile-filter-btn"
                >
                  <SlidersHorizontal style={{ width: '16px', height: '16px', marginRight: '12px' }} />
                  Filters
                </Button>
              </div>
            )}

            {/* Mobile Filters Overlay */}
            {mobileFiltersOpen && isMobile && <MobileFiltersOverlay />}

            {/* Main Layout */}
            <div style={{ 
              display: 'flex', 
              gap: isMobile ? '0' : '64px',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              
              {/* Desktop Sidebar */}
              {!isMobile && (
                <aside style={{ width: '220px', flexShrink: 0 }}>
                  <div style={{ position: 'sticky', top: '120px' }}>
                    <h2 style={{ 
                      fontFamily: "'Bodoni Moda', serif", 
                      fontSize: '20px', 
                      fontWeight: 700, 
                      marginBottom: '32px',
                      letterSpacing: '-0.01em'
                    }}>
                      Filters
                    </h2>
                    <FilterContent 
                      categories={categories}
                      selectedCategories={selectedCategories}
                      toggleCategory={toggleCategory}
                      priceRange={priceRange}
                      setPriceRange={setPriceRange}
                      maxPrice={maxPrice}
                    />
                  </div>
                </aside>
              )}

              {/* Products Grid */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {filteredProducts.length > 0 ? (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                    gap: isMobile ? '16px' : '32px'
                  }}>
                    {filteredProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                      >
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '96px 0' }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", color: '#71717a', fontSize: '13px' }}>
                      No products found
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

    // Filter Content Component
    const FilterContent = ({ categories, selectedCategories, toggleCategory, priceRange, setPriceRange, maxPrice }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {/* Category Filter */}
        <div>
          <h3 style={{ 
            fontFamily: "'JetBrains Mono', monospace", 
            fontSize: '11px', 
            marginBottom: '24px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#000'
          }}>
            Category
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categories.map(category => (
              <div key={category} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Checkbox
                  id={`cat-${category}`}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                  style={{ borderRadius: 0, width: '16px', height: '16px', border: '1px solid #000' }}
                  data-testid={`filter-category-${category}`}
                />
                <Label 
                  htmlFor={`cat-${category}`} 
                  style={{ 
                    fontFamily: "'Manrope', sans-serif", 
                    fontSize: '13px', 
                    cursor: 'pointer',
                    fontWeight: 400,
                    color: '#000',
                    lineHeight: 1
                  }}
                >
                  {category}
                </Label>
              </div>
            ))}
          </div>
        </div>
  
        {/* Price Range Filter */}
        <div>
          <h3 style={{ 
            fontFamily: "'JetBrains Mono', monospace", 
            fontSize: '11px', 
            marginBottom: '24px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#000'
          }}>
            Price Range
          </h3>
          <Slider
            min={0}
            max={maxPrice}
            step={100}
            value={priceRange}
            onValueChange={setPriceRange}
            style={{ marginBottom: '16px' }}
            data-testid="price-slider"
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px', 
            color: '#71717a',
            letterSpacing: '0.05em'
          }}>
            <span>₹{priceRange[0]}</span>
            <span>₹{priceRange[1]}</span>
          </div>
        </div>
      </div>
    );

export default ProductListPage;
