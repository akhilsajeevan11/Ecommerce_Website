import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AppContext';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { MOCK_PRODUCTS, MOCK_CATEGORIES, USE_MOCK } from '../data/adminMockData';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #e4e4e7',
  fontSize: '0.875rem',
  outline: 'none',
  backgroundColor: '#fff',
  color: '#000',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  marginBottom: '0.375rem',
  display: 'block',
  letterSpacing: '0.05em',
  fontFamily: 'JetBrains Mono, monospace',
};

const errorStyle = {
  color: '#dc2626',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
  fontFamily: 'JetBrains Mono, monospace',
};

const Skeleton = ({ style: s }) => (
  <div style={{ backgroundColor: '#f4f4f5', ...s }} />
);

const REMARK_SUGGESTIONS = ['Damaged', 'Returned', 'Expired', 'Defective', 'Unsold', 'Discontinued', 'Other'];

const AdminDeadStockPage = () => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState(USE_MOCK ? MOCK_PRODUCTS : []);
  const [categoryStock, setCategoryStock] = useState(USE_MOCK ? MOCK_CATEGORIES : []);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [remarks, setRemarks] = useState({});
  const [editingRemark, setEditingRemark] = useState(null);
  const [remarkInput, setRemarkInput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualEntries, setManualEntries] = useState([]);
  const [addForm, setAddForm] = useState({ name: '', category: '', price: '', remark: '' });
  const [addErrors, setAddErrors] = useState({});

  const fetchData = useCallback(async () => {
    if (USE_MOCK) return;
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
      toast.error('Failed to load dead stock data');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deadStock = useMemo(() => {
    const fromProducts = products.filter((p) => {
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return p.stock === 0 && matchesCategory;
    });
    const fromManual = manualEntries.filter((p) => {
      return categoryFilter === 'all' || p.category === categoryFilter;
    });
    return [...fromProducts, ...fromManual];
  }, [products, categoryFilter, manualEntries]);

  const saveRemark = (productId) => {
    setRemarks((prev) => ({ ...prev, [productId]: remarkInput.trim() }));
    setEditingRemark(null);
    setRemarkInput('');
    toast.success('Remark saved');
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!addForm.name.trim()) errs.name = 'Name is required';
    if (!addForm.category.trim()) errs.category = 'Category is required';
    const price = parseFloat(addForm.price);
    if (!addForm.price.trim()) errs.price = 'Price is required';
    else if (isNaN(price) || price <= 0) errs.price = 'Price must be a positive number';
    if (Object.keys(errs).length) { setAddErrors(errs); return; }

    const newEntry = {
      id: `manual-${Date.now()}`,
      name: addForm.name.trim(),
      category: addForm.category.trim(),
      stock: 0,
      price,
    };
    if (addForm.remark.trim()) {
      setRemarks((prev) => ({ ...prev, [newEntry.id]: addForm.remark.trim() }));
    }
    setManualEntries((prev) => [...prev, newEntry]);
    setAddForm({ name: '', category: '', price: '', remark: '' });
    setAddErrors({});
    setShowAddForm(false);
    toast.success('Dead stock entry added');
  };

  const thStyle = { padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', fontFamily: 'JetBrains Mono, monospace' };
  const tdStyle = { padding: '0.75rem 1rem', fontSize: '0.875rem' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} style={{ padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className="heading-font" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Dead Stock
          </h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? 'Cancel' : 'Add Dead Stock'}
          </button>
        </div>

        {/* Add Dead Stock Form */}
        {showAddForm && (
          <div style={{ border: '1px solid #e4e4e7', padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#fafafa' }}>
            <h2 className="heading-font" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Add Dead Stock Entry</h2>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="mono-font" style={labelStyle}>Name *</label>
                  <input style={inputStyle} value={addForm.name} onChange={(e) => { setAddForm((f) => ({ ...f, name: e.target.value })); if (addErrors.name) setAddErrors((p) => { const n = { ...p }; delete n.name; return n; }); }} placeholder="Product name" />
                  {addErrors.name && <p style={errorStyle}>{addErrors.name}</p>}
                </div>
                <div>
                  <label className="mono-font" style={labelStyle}>Category *</label>
                  <input style={inputStyle} value={addForm.category} onChange={(e) => { setAddForm((f) => ({ ...f, category: e.target.value })); if (addErrors.category) setAddErrors((p) => { const n = { ...p }; delete n.category; return n; }); }} placeholder="e.g., T-Shirt" />
                  {addErrors.category && <p style={errorStyle}>{addErrors.category}</p>}
                </div>
                <div>
                  <label className="mono-font" style={labelStyle}>Price *</label>
                  <input style={inputStyle} type="number" min="0" step="0.01" value={addForm.price} onChange={(e) => { setAddForm((f) => ({ ...f, price: e.target.value })); if (addErrors.price) setAddErrors((p) => { const n = { ...p }; delete n.price; return n; }); }} placeholder="0.00" />
                  {addErrors.price && <p style={errorStyle}>{addErrors.price}</p>}
                </div>
              </div>
              <div>
                <label className="mono-font" style={labelStyle}>Remark</label>
                <input style={inputStyle} value={addForm.remark} onChange={(e) => setAddForm((f) => ({ ...f, remark: e.target.value }))} placeholder="e.g., Damaged, Returned, Expired..." />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {REMARK_SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setAddForm((f) => ({ ...f, remark: s }))}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #d4d4d8', backgroundColor: addForm.remark === s ? '#000' : '#fff', color: addForm.remark === s ? '#fff' : '#52525b', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button type="submit" style={{ padding: '0.5rem 1.5rem', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Category filter */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle} aria-label="Filter by category">
            <option value="all">All Categories</option>
            {categoryStock.map((cat) => (
              <option key={cat.category} value={cat.category}>{cat.category}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ border: '1px solid #e4e4e7' }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} style={{ height: '3rem', width: '100%', borderBottom: '1px solid #f4f4f5' }} />
            ))}
          </div>
        ) : deadStock.length === 0 ? (
          <div style={{ border: '1px solid #e4e4e7', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '8rem' }}>
            <p className="mono-font" style={{ fontSize: '0.875rem', color: '#a1a1aa' }}>No dead stock detected</p>
          </div>
        ) : (
          <div style={{ border: '1px solid #e4e4e7', overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e4e4e7', backgroundColor: '#fafafa' }}>
                  <th style={thStyle}>Product Name</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Stock</th>
                  <th style={thStyle}>Price</th>
                  <th style={{ ...thStyle, minWidth: '12rem' }}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {deadStock.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{product.name}</td>
                    <td className="mono-font" style={{ ...tdStyle, color: '#52525b' }}>{product.category}</td>
                    <td className="mono-font" style={tdStyle}>{product.stock}</td>
                    <td className="mono-font" style={tdStyle}>₹{product.price.toFixed(2)}</td>
                    <td style={tdStyle}>
                      {editingRemark === product.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            style={{ ...inputStyle, width: 'auto', flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                            value={remarkInput}
                            onChange={(e) => setRemarkInput(e.target.value)}
                            placeholder="e.g., Damaged, Returned..."
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') saveRemark(product.id); if (e.key === 'Escape') { setEditingRemark(null); setRemarkInput(''); } }}
                          />
                          <button onClick={() => saveRemark(product.id)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>Save</button>
                          <button onClick={() => { setEditingRemark(null); setRemarkInput(''); }} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fff', color: '#000', border: '1px solid #d4d4d8', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
                        </div>
                      ) : (
                        <div
                          onClick={() => { setEditingRemark(product.id); setRemarkInput(remarks[product.id] || ''); }}
                          style={{ cursor: 'pointer', minHeight: '1.5rem', display: 'flex', alignItems: 'center' }}
                          title="Click to add/edit remark"
                        >
                          {remarks[product.id] ? (
                            <span className="mono-font" style={{ fontSize: '0.8rem', color: '#52525b', padding: '0.125rem 0.5rem', backgroundColor: '#f4f4f5', display: 'inline-block' }}>
                              {remarks[product.id]}
                            </span>
                          ) : (
                            <span className="mono-font" style={{ fontSize: '0.75rem', color: '#a1a1aa', fontStyle: 'italic' }}>
                              Click to add remark
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminDeadStockPage;
