import React, { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { MOCK_PRODUCTS } from '../data/adminMockData';

const thStyle = {
  padding: '0.75rem 1rem',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#71717a',
  fontFamily: 'JetBrains Mono, monospace',
  textAlign: 'left',
};

const tdStyle = { padding: '0.75rem 1rem', fontSize: '0.875rem' };

const AdminProductsPage = () => {
  const [products, setProducts] = useState(() => [...MOCK_PRODUCTS]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleEditStart = (product) => {
    setEditingId(product.id);
    setEditForm({ name: product.name, category: product.category, stock: product.stock, price: product.price });
  };

  const handleEditSave = (id) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...editForm, stock: Number(editForm.stock), price: Number(editForm.price) } : p))
    );
    setEditingId(null);
    setEditForm({});
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const inputStyle = {
    width: '100%',
    padding: '0.375rem 0.5rem',
    fontSize: '0.875rem',
    border: '1px solid #d4d4d8',
    outline: 'none',
    fontFamily: 'JetBrains Mono, monospace',
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 className="heading-font" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#000' }}>
        Products
      </h1>

      <div style={{ border: '1px solid #e4e4e7', overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e4e4e7', backgroundColor: '#fafafa' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Stock</th>
              <th style={thStyle}>Price</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="mono-font" style={{ ...tdStyle, textAlign: 'center', padding: '2rem 1rem', color: '#a1a1aa' }}>
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isEditing = editingId === product.id;
                return (
                  <tr key={product.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                      {isEditing ? (
                        <input style={inputStyle} value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} />
                      ) : product.name}
                    </td>
                    <td className="mono-font" style={{ ...tdStyle, color: '#52525b' }}>
                      {isEditing ? (
                        <input style={inputStyle} value={editForm.category} onChange={(e) => handleEditChange('category', e.target.value)} />
                      ) : product.category}
                    </td>
                    <td className="mono-font" style={tdStyle}>
                      {isEditing ? (
                        <input style={inputStyle} type="number" value={editForm.stock} onChange={(e) => handleEditChange('stock', e.target.value)} />
                      ) : product.stock}
                    </td>
                    <td className="mono-font" style={tdStyle}>
                      {isEditing ? (
                        <input style={inputStyle} type="number" step="0.01" value={editForm.price} onChange={(e) => handleEditChange('price', e.target.value)} />
                      ) : `₹${product.price.toFixed(2)}`}
                    </td>
                    <td style={tdStyle}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEditSave(product.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: '0.25rem' }} aria-label="Save">
                            <Check size={16} />
                          </button>
                          <button onClick={handleEditCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.25rem' }} aria-label="Cancel">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEditStart(product)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: '0.25rem' }} aria-label="Edit">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: '0.25rem' }} aria-label="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProductsPage;
