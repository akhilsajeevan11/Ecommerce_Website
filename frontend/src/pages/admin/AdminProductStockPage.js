import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AppContext';
import { noirToast as toast } from '../../lib/noir-toast';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { getStockStatus } from '../../utils/stockStatus';
import { filterProducts } from '../../utils/filterProducts';
import { sortProducts } from '../../utils/sortProducts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STOCK_STATUS_OPTIONS = ['all', 'IN STOCK', 'LOW STOCK', 'OUT OF STOCK'];

const selectStyle = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #e4e4e7',
  backgroundColor: '#fff',
  color: '#000',
  fontSize: '0.875rem',
  fontFamily: 'JetBrains Mono, monospace',
  outline: 'none',
  cursor: 'pointer',
  minWidth: '10rem',
};

const SORTABLE_COLUMNS = [
  { key: 'name', label: 'Product Name' },
  { key: 'category', label: 'Category' },
  { key: 'stock', label: 'Stock' },
  { key: 'price', label: 'Price' },
];

const Skeleton = ({ style: s }) => (
  <div style={{ backgroundColor: '#f4f4f5', ...s }} />
);

const AdminProductStockPage = () => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categoryStock, setCategoryStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState('stock');
  const [sortDirection, setSortDirection] = useState('desc');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    if (!token || !user?.is_admin) return;
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [productRes, categoryRes] = await Promise.all([
        axios.get(`${API}/admin/stock/by-product`, { headers }),
        axios.get(`${API}/admin/stock/by-category`, { headers }),
      ]);
      setProducts(productRes.data);
      setCategoryStock(categoryRes.data);
    } catch (error) {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesStatus = stockStatusFilter === 'all' || getStockStatus(product.stock).label === stockStatusFilter;
      return matchesCategory && matchesStatus;
    });
  }, [products, categoryFilter, stockStatusFilter]);

  const searched = filterProducts(filteredProducts, searchQuery);
  const sorted = sortProducts(searched, sortColumn, sortDirection);

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const thStyle = { padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', cursor: 'pointer', userSelect: 'none', fontFamily: 'JetBrains Mono, monospace' };
  const tdStyle = { padding: '0.75rem 1rem', fontSize: '0.875rem' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} style={{ padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        <h1 className="heading-font" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '1.5rem' }}>
          Product Stock
        </h1>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle} aria-label="Filter by category">
            <option value="all">All Categories</option>
            {categoryStock.map((cat) => (
              <option key={cat.category} value={cat.category}>{cat.category}</option>
            ))}
          </select>
          <select value={stockStatusFilter} onChange={(e) => setStockStatusFilter(e.target.value)} style={selectStyle} aria-label="Filter by stock status">
            {STOCK_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === 'all' ? 'All Status' : opt}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#a1a1aa' }} />
          <input
            type="text"
            placeholder="Search by name or category…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mono-font"
            style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', border: '1px solid #e4e4e7', fontSize: '0.875rem', outline: 'none' }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ border: '1px solid #e4e4e7' }}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} style={{ height: '3rem', width: '100%', borderBottom: '1px solid #f4f4f5' }} />
            ))}
          </div>
        ) : (
          <div style={{ border: '1px solid #e4e4e7', overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e4e4e7', backgroundColor: '#fafafa' }}>
                  {SORTABLE_COLUMNS.map((col) => (
                    <th key={col.key} onClick={() => handleSort(col.key)} style={thStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {col.label}
                        {sortColumn === col.key && (
                          sortDirection === 'asc' ? <ChevronUp style={{ width: '0.75rem', height: '0.75rem' }} /> : <ChevronDown style={{ width: '0.75rem', height: '0.75rem' }} />
                        )}
                      </span>
                    </th>
                  ))}
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="mono-font" style={{ ...tdStyle, textAlign: 'center', padding: '2rem 1rem', color: '#a1a1aa' }}>
                      No products found
                    </td>
                  </tr>
                ) : (
                  sorted.map((product) => {
                    const status = getStockStatus(product.stock);
                    const badgeColors = {
                      'OUT OF STOCK': { bg: '#fee2e2', color: '#991b1b' },
                      'LOW STOCK': { bg: '#fef3c7', color: '#92400e' },
                      'IN STOCK': { bg: '#f4f4f5', color: '#27272a' },
                    };
                    const badge = badgeColors[status.label] || badgeColors['IN STOCK'];
                    return (
                      <tr key={product.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{product.name}</td>
                        <td className="mono-font" style={{ ...tdStyle, color: '#52525b' }}>{product.category}</td>
                        <td className="mono-font" style={tdStyle}>{product.stock}</td>
                        <td className="mono-font" style={tdStyle}>₹{product.price.toFixed(2)}</td>
                        <td style={tdStyle}>
                          <span className="mono-font" style={{ display: 'inline-block', padding: '0.125rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: badge.bg, color: badge.color }}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminProductStockPage;
