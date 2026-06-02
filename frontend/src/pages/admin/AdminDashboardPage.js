import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AppContext';
import { noirToast as toast } from '../../lib/noir-toast';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, Archive, ShoppingBag } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getStockStatus } from '../../utils/stockStatus';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/* ── Skeleton placeholder ─────────────────────────────── */
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-zinc-200 ${className}`} style={{ backgroundColor: '#e4e4e7' }} />
);

/* ── Summary Card ─────────────────────────────────────── */
const SummaryCard = ({ label, value, icon: Icon, loading }) => (
  <div style={{ border: '1px solid #e4e4e7', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span className="mono-font" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a' }}>{label}</span>
      <Icon style={{ width: '1rem', height: '1rem', color: '#a1a1aa' }} />
    </div>
    {loading ? (
      <Skeleton className="h-10 w-24" />
    ) : (
      <span className="heading-font" style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em' }}>{value}</span>
    )}
  </div>
);

/* ── NOIR palette for charts ──────────────────────────── */
const NOIR_COLORS = ['#000000', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

/* ── Custom Tooltip ───────────────────────────────────── */
const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ border: '1px solid #d4d4d8', backgroundColor: '#fff', padding: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <p className="heading-font" style={{ fontSize: '0.875rem', fontWeight: 700 }}>{d.name}</p>
      <p className="mono-font" style={{ fontSize: '0.75rem', color: '#71717a' }}>{d.category ?? d.name}</p>
      <p className="mono-font" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
        Stock: <span style={{ fontWeight: 600 }}>{d.stock ?? d.total_stock}</span>
      </p>
    </div>
  );
};


/* ── Chart Panel ──────────────────────────────────────── */
const ChartPanel = ({ productStock, categoryStock, loading }) => {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const barData = [...productStock].sort((a, b) => b.stock - a.stock);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
      {/* Bar Chart */}
      <div style={{ border: '1px solid #e4e4e7', padding: '1.5rem' }}>
        <h3 className="mono-font" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', marginBottom: '1rem' }}>
          Stock by Product
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: '#71717a' }} interval={0} angle={-35} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: '#71717a' }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="stock" fill="#000000" radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div style={{ border: '1px solid #e4e4e7', padding: '1.5rem' }}>
        <h3 className="mono-font" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', marginBottom: '1rem' }}>
          Stock by Category
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={categoryStock} dataKey="total_stock" nameKey="category" cx="50%" cy="50%" outerRadius={90} stroke="#ffffff" strokeWidth={2} label={({ category }) => category}>
              {categoryStock.map((_, i) => (
                <Cell key={i} fill={NOIR_COLORS[i % NOIR_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend formatter={(value) => (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#3f3f46' }}>{value}</span>
            )} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};



/* ── Filter Bar ───────────────────────────────────────── */
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

const FilterBar = ({ categories, categoryFilter, stockStatusFilter, onCategoryChange, onStockStatusChange }) => (
  <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
    <select
      value={categoryFilter}
      onChange={(e) => onCategoryChange(e.target.value)}
      style={selectStyle}
      aria-label="Filter by category"
    >
      <option value="all">All Categories</option>
      {categories.map((cat) => (
        <option key={cat.category} value={cat.category}>{cat.category}</option>
      ))}
    </select>
    <select
      value={stockStatusFilter}
      onChange={(e) => onStockStatusChange(e.target.value)}
      style={selectStyle}
      aria-label="Filter by stock status"
    >
      {STOCK_STATUS_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>{opt === 'all' ? 'All Stock Status' : opt}</option>
      ))}
    </select>
  </div>
);


/* ── Main Page Component ──────────────────────────────── */
const AdminDashboardPage = () => {
  const { token, user } = useAuth();

  const [productStock, setProductStock] = useState([]);
  const [categoryStock, setCategoryStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');

  /* ── Data fetching ──── */
  const fetchData = useCallback(async () => {
    if (!token || !user?.is_admin) return;
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [productRes, categoryRes] = await Promise.all([
        axios.get(`${API}/admin/stock/by-product`, { headers }),
        axios.get(`${API}/admin/stock/by-category`, { headers }),
      ]);
      setProductStock(productRes.data);
      setCategoryStock(categoryRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Filter logic: compose category + stock status with AND ── */
  const filteredProducts = useMemo(() => {
    return productStock.filter((product) => {
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesStatus = stockStatusFilter === 'all' || getStockStatus(product.stock).label === stockStatusFilter;
      return matchesCategory && matchesStatus;
    });
  }, [productStock, categoryFilter, stockStatusFilter]);

  /* ── Derive filtered summary, dead stock, and category stock ── */
  const filteredSummary = useMemo(() => ({
    total_stock: filteredProducts.reduce((sum, p) => sum + p.stock, 0),
    total_products: filteredProducts.length,
    dead_stock_count: filteredProducts.filter((p) => p.stock === 0).length,
    out_of_stock_count: filteredProducts.filter((p) => p.stock === 0).length,
  }), [filteredProducts]);

  const filteredCategoryStock = useMemo(() => {
    const catMap = {};
    filteredProducts.forEach((p) => {
      catMap[p.category] = (catMap[p.category] || 0) + p.stock;
    });
    return Object.entries(catMap).map(([category, total_stock]) => ({ category, total_stock }));
  }, [filteredProducts]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ padding: '2rem 1.5rem' }}
    >
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className="heading-font" style={{ fontSize: '3.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Dashboard
          </h1>
        </div>

        {/* ── Filter Bar ── */}
        <FilterBar
          categories={categoryStock}
          categoryFilter={categoryFilter}
          stockStatusFilter={stockStatusFilter}
          onCategoryChange={setCategoryFilter}
          onStockStatusChange={setStockStatusFilter}
        />

        {/* ── Summary Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
          <SummaryCard label="Total Stock" value={filteredSummary.total_stock} icon={Package} loading={loading} />
          <SummaryCard label="Total Products" value={filteredSummary.total_products} icon={ShoppingBag} loading={loading} />
          <SummaryCard label="Dead Stock" value={filteredSummary.dead_stock_count} icon={Archive} loading={loading} />
          <SummaryCard label="Out of Stock" value={filteredSummary.out_of_stock_count} icon={AlertTriangle} loading={loading} />
        </div>

        {/* ── Chart Panel ── */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 className="heading-font" style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '1.5rem' }}>Stock Analytics</h2>
          <ChartPanel productStock={filteredProducts} categoryStock={filteredCategoryStock} loading={loading} />
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboardPage;
