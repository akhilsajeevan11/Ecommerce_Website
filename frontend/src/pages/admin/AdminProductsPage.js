import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Check, X, ImageIcon, Loader2, Upload, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AppContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected' };
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Unsupported format. Only JPEG, PNG, and WebP are accepted.' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'File size exceeds 5MB limit.' };
  }
  return { valid: true, error: null };
};

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
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [imgErrors, setImgErrors] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API}/products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProducts(response.data);
      } catch (err) {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to load products';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [token]);

  const handleDelete = async (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await axios.delete(`${API}/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Product deleted', { duration: 5000 });
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Product not found — it may have already been deleted');
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        const detail = err.response?.data?.detail || err.message || 'Failed to delete product';
        toast.error(detail);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleFeatured = async (product) => {
    const newValue = !product.is_featured;
    const previousValue = product.is_featured;

    // Optimistically update UI
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_featured: newValue } : p))
    );
    setTogglingFeaturedId(product.id);

    try {
      await axios.patch(
        `${API}/products/${product.id}/featured`,
        { is_featured: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Product ${newValue ? 'marked as featured' : 'removed from featured'}`);
    } catch (err) {
      // Revert UI state on failure
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_featured: previousValue } : p))
      );
      const detail = err.response?.data?.detail || err.message || 'Failed to update featured status';
      toast.error(detail);
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  const handleEditStart = (product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name || '',
      category: product.category || '',
      stock: product.stock ?? 0,
      price: product.price ?? 0,
      description: product.description || '',
      sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : '',
      colors: Array.isArray(product.colors) ? product.colors.join(', ') : '',
      images: Array.isArray(product.images) ? [...product.images] : [],
      imageFile: null,
    });
    setEditErrors({});
    setImageError(null);
    setImagePreview(null);
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editForm.name || editForm.name.trim() === '') {
      errors.name = 'Name is required';
    } else if (editForm.name.length > 255) {
      errors.name = 'Name must be 255 characters or less';
    }
    if (Number(editForm.price) < 0.01) {
      errors.price = 'Price must be at least 0.01';
    }
    if (Number(editForm.stock) < 0) {
      errors.stock = 'Stock must be 0 or greater';
    }
    return errors;
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error);
      setEditForm((prev) => ({ ...prev, imageFile: null }));
      setImagePreview(null);
      return;
    }

    setImageError(null);
    setEditForm((prev) => ({ ...prev, imageFile: file }));

    // Generate preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleEditSave = async (id) => {
    const errors = validateEditForm();
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    // Block save if there's an image validation error
    if (imageError) {
      return;
    }
    setEditErrors({});

    const product = products.find((p) => p.id === id);
    if (!product) return;

    const sizesArray = editForm.sizes
      ? editForm.sizes.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const colorsArray = editForm.colors
      ? editForm.colors.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    let imagesArray = editForm.images || [];

    setSubmitting(true);

    // If a new image file is selected, upload it first
    if (editForm.imageFile) {
      try {
        const formData = new FormData();
        formData.append('file', editForm.imageFile);
        formData.append('category', editForm.category || 'uploads');

        const uploadResponse = await axios.post(`${API}/admin/upload`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        const newUrl = uploadResponse.data.url;
        imagesArray = [newUrl];
      } catch (err) {
        toast.error('Image upload failed');
        setSubmitting(false);
        return; // Abort save, stay in edit mode
      }
    }

    const payload = {
      name: editForm.name.trim(),
      description: editForm.description || '',
      price: Number(editForm.price),
      category: editForm.category || '',
      sizes: sizesArray,
      colors: colorsArray,
      images: imagesArray,
      stock: Number(editForm.stock),
      barcode_id: product.barcode_id || null,
      story: product.story || null,
      video_url: product.video_url || null,
    };

    try {
      await axios.put(`${API}/products/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, ...payload, stock: Number(payload.stock), price: Number(payload.price) }
            : p
        )
      );
      setEditingId(null);
      setEditForm({});
      setImageError(null);
      setImagePreview(null);
      toast.success('Product updated');
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        toast.error('You do not have permission to update this product');
        setEditingId(null);
        setEditForm({});
        setImageError(null);
        setImagePreview(null);
      } else if (status === 404 || !err.response) {
        const detail = err.response?.data?.detail || err.message || 'Failed to update product';
        toast.error(detail);
        // Retain edited values, stay in edit mode
      } else {
        const detail = err.response?.data?.detail || err.message || 'Failed to update product';
        toast.error(detail);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({});
    setEditErrors({});
    setImageError(null);
    setImagePreview(null);
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

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <div style={{
          width: '2rem',
          height: '2rem',
          border: '2px solid #e4e4e7',
          borderTop: '2px solid #000',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p className="mono-font" style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#71717a' }}>Loading products...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 className="heading-font" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#000' }}>
        Products
      </h1>

      {error && (
        <div className="mono-font" style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.875rem' }}>
          Failed to load products: {error}
        </div>
      )}

      <div style={{ border: '1px solid #e4e4e7', overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e4e4e7', backgroundColor: '#fafafa' }}>
              {!isMobile && <th style={thStyle}>Image</th>}
              <th style={{ ...thStyle, minWidth: '120px' }}>Name</th>
              {!isMobile && <th style={thStyle}>Category</th>}
              <th style={thStyle}>Stock</th>
              <th style={thStyle}>Price</th>
              <th style={thStyle}>Featured</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={isMobile ? 5 : 7} className="mono-font" style={{ ...tdStyle, textAlign: 'center', padding: '2rem 1rem', color: '#a1a1aa' }}>
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isEditing = editingId === product.id;
                return (
                  <tr key={product.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                    {!isMobile && (
                    <td style={tdStyle}>
                      {isEditing ? (
                        <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                          {/* Show preview or existing image */}
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Preview"
                              style={{ width: '48px', height: '48px', objectFit: 'cover', display: 'block', opacity: 0.8 }}
                            />
                          ) : product.images && product.images.length > 0 && !imgErrors[product.id] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              style={{ width: '48px', height: '48px', objectFit: 'cover', display: 'block', opacity: 0.8 }}
                              onError={() => setImgErrors((prev) => ({ ...prev, [product.id]: true }))}
                            />
                          ) : (
                            <ImageIcon size={48} color="#a1a1aa" aria-label={`No image for ${product.name}`} />
                          )}
                          {/* File input overlay button */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={submitting}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(0,0,0,0.4)',
                              border: 'none',
                              cursor: submitting ? 'not-allowed' : 'pointer',
                              borderRadius: '4px',
                            }}
                            aria-label="Upload new image"
                          >
                            <Upload size={16} color="#fff" />
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleImageSelect}
                            disabled={submitting}
                          />
                          {imageError && (
                            <span style={{ position: 'absolute', top: '52px', left: 0, fontSize: '0.65rem', color: '#dc2626', whiteSpace: 'nowrap' }}>
                              {imageError}
                            </span>
                          )}
                        </div>
                      ) : (
                        product.images && product.images.length > 0 && !imgErrors[product.id] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            style={{ width: '48px', height: '48px', objectFit: 'cover', display: 'block' }}
                            onError={() => setImgErrors((prev) => ({ ...prev, [product.id]: true }))}
                          />
                        ) : (
                          <ImageIcon size={48} color="#a1a1aa" aria-label={`No image for ${product.name}`} />
                        )
                      )}
                    </td>
                    )}
                    <td style={{ ...tdStyle, fontWeight: 500, minWidth: '120px' }}>
                      {isEditing ? (
                        <div>
                          <input style={{ ...inputStyle, borderColor: editErrors.name ? '#dc2626' : '#d4d4d8' }} value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} disabled={submitting} maxLength={255} />
                          {editErrors.name && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{editErrors.name}</span>}
                        </div>
                      ) : product.name}
                    </td>
                    {!isMobile && (
                    <td className="mono-font" style={{ ...tdStyle, color: '#52525b' }}>
                      {isEditing ? (
                        <select style={inputStyle} value={editForm.category} onChange={(e) => handleEditChange('category', e.target.value)} disabled={submitting}>
                          <option value="">Select category</option>
                          {['T-Shirt', 'Hoodie', 'Jacket', 'Pants', 'Shirt', 'Sweater'].map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : product.category}
                    </td>
                    )}
                    <td className="mono-font" style={tdStyle}>
                      {isEditing ? (
                        <div>
                          <input style={{ ...inputStyle, borderColor: editErrors.stock ? '#dc2626' : '#d4d4d8' }} type="number" value={editForm.stock} onChange={(e) => handleEditChange('stock', e.target.value)} disabled={submitting} />
                          {editErrors.stock && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{editErrors.stock}</span>}
                        </div>
                      ) : product.stock}
                    </td>
                    <td className="mono-font" style={tdStyle}>
                      {isEditing ? (
                        <div>
                          <input style={{ ...inputStyle, borderColor: editErrors.price ? '#dc2626' : '#d4d4d8' }} type="number" step="0.01" value={editForm.price} onChange={(e) => handleEditChange('price', e.target.value)} disabled={submitting} />
                          {editErrors.price && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{editErrors.price}</span>}
                        </div>
                      ) : `₹${product.price.toFixed(2)}`}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleToggleFeatured(product)}
                        disabled={togglingFeaturedId === product.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: togglingFeaturedId === product.id ? 'not-allowed' : 'pointer',
                          padding: '0.25rem',
                          opacity: togglingFeaturedId === product.id ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          ...(isMobile ? { minWidth: '44px', minHeight: '44px' } : {}),
                        }}
                        aria-label={product.is_featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        {togglingFeaturedId === product.id ? (
                          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} color="#71717a" />
                        ) : (
                          <Star
                            size={18}
                            fill={product.is_featured ? '#f59e0b' : 'none'}
                            color={product.is_featured ? '#f59e0b' : '#a1a1aa'}
                          />
                        )}
                      </button>
                    </td>
                    <td style={tdStyle}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEditSave(product.id)} disabled={submitting || !!imageError} style={{ background: 'none', border: 'none', cursor: (submitting || !!imageError) ? 'not-allowed' : 'pointer', color: '#16a34a', padding: '0.25rem', opacity: (submitting || !!imageError) ? 0.5 : 1, ...(isMobile ? { minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}) }} aria-label="Save">
                            {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                          </button>
                          <button onClick={handleEditCancel} disabled={submitting} style={{ background: 'none', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', color: '#dc2626', padding: '0.25rem', opacity: submitting ? 0.5 : 1, ...(isMobile ? { minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}) }} aria-label="Cancel">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEditStart(product)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: '0.25rem', ...(isMobile ? { minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}) }} aria-label="Edit">
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId === product.id}
                            style={{ background: 'none', border: 'none', cursor: deletingId === product.id ? 'not-allowed' : 'pointer', color: '#71717a', padding: '0.25rem', opacity: deletingId === product.id ? 0.5 : 1, ...(isMobile ? { minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}) }}
                            aria-label="Delete"
                          >
                            {deletingId === product.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
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
