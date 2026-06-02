import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Check, X, ImageIcon, Loader2, Upload, Star } from 'lucide-react';
import { noirToast as toast } from '../../lib/noir-toast';
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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API}/products`, {
          headers: { Authorization: `Bearer ${token}` },
          // Fetch up to 60 products per page for the admin table.
          // The storefront API now returns an envelope { items, total, page, limit, has_more }
          // so we extract .items; fall back to the raw array for backwards compat.
          params: { limit: 60 },
        });
        const data = response.data;
        setProducts(Array.isArray(data) ? data : (data.items ?? []));
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
      toast.success('Product deleted');
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
      toast.featured(`Product ${newValue ? 'marked as featured' : 'removed from featured'}`);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <p className="font-mono text-sm text-zinc-500">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Products</h1>
        <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
          {products.length} product{products.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div className="font-mono mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">
          Failed to load products: {error}
        </div>
      )}

      {/* Table */}
      <div className="border border-zinc-200 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="hidden md:table-cell font-mono px-4 py-3 text-xs uppercase tracking-widest text-zinc-500">Image</th>
              <th className="font-mono px-4 py-3 text-xs uppercase tracking-widest text-zinc-500 min-w-[140px]">Name</th>
              <th className="hidden lg:table-cell font-mono px-4 py-3 text-xs uppercase tracking-widest text-zinc-500">Category</th>
              <th className="font-mono px-4 py-3 text-xs uppercase tracking-widest text-zinc-500">Stock</th>
              <th className="font-mono px-4 py-3 text-xs uppercase tracking-widest text-zinc-500">Price</th>
              <th className="font-mono px-4 py-3 text-xs uppercase tracking-widest text-zinc-500">Featured</th>
              <th className="font-mono px-4 py-3 text-xs uppercase tracking-widest text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="font-mono text-center py-12 text-zinc-400 text-sm">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isEditing = editingId === product.id;
                return (
                  <tr key={product.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                    {/* Image */}
                    <td className="hidden md:table-cell px-4 py-3">
                      {isEditing ? (
                        <div className="relative w-12 h-12">
                          {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover opacity-80" />
                          ) : product.images?.[0] && !imgErrors[product.id] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 object-cover opacity-80"
                              onError={() => setImgErrors((prev) => ({ ...prev, [product.id]: true }))}
                            />
                          ) : (
                            <ImageIcon className="w-12 h-12 text-zinc-300" />
                          )}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={submitting}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors disabled:cursor-not-allowed"
                            aria-label="Upload new image"
                          >
                            <Upload className="w-4 h-4 text-white" />
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleImageSelect}
                            disabled={submitting}
                          />
                          {imageError && (
                            <span className="absolute top-14 left-0 font-mono text-[10px] text-red-600 whitespace-nowrap">
                              {imageError}
                            </span>
                          )}
                        </div>
                      ) : (
                        product.images?.[0] && !imgErrors[product.id] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-12 h-12 object-cover"
                            onError={() => setImgErrors((prev) => ({ ...prev, [product.id]: true }))}
                          />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-zinc-300" aria-label={`No image for ${product.name}`} />
                        )
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 font-medium min-w-[140px]">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <input
                            className={`w-full px-2 py-1.5 text-sm border font-mono outline-none focus:border-black ${editErrors.name ? 'border-red-400' : 'border-zinc-300'}`}
                            value={editForm.name}
                            onChange={(e) => handleEditChange('name', e.target.value)}
                            disabled={submitting}
                            maxLength={255}
                          />
                          {editErrors.name && <span className="font-mono text-xs text-red-600">{editErrors.name}</span>}
                        </div>
                      ) : (
                        <span className="line-clamp-2">{product.name}</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="hidden lg:table-cell px-4 py-3 font-mono text-zinc-500">
                      {isEditing ? (
                        <select
                          className="w-full px-2 py-1.5 text-sm border border-zinc-300 font-mono outline-none focus:border-black bg-white"
                          value={editForm.category}
                          onChange={(e) => handleEditChange('category', e.target.value)}
                          disabled={submitting}
                        >
                          <option value="">Select category</option>
                          {['T-Shirt', 'Hoodie', 'Jacket', 'Pants', 'Shirt', 'Sweater'].map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : product.category}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 font-mono">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <input
                            className={`w-20 px-2 py-1.5 text-sm border font-mono outline-none focus:border-black ${editErrors.stock ? 'border-red-400' : 'border-zinc-300'}`}
                            type="number"
                            value={editForm.stock}
                            onChange={(e) => handleEditChange('stock', e.target.value)}
                            disabled={submitting}
                          />
                          {editErrors.stock && <span className="font-mono text-xs text-red-600">{editErrors.stock}</span>}
                        </div>
                      ) : (
                        <span className={product.stock === 0 ? 'text-red-500' : product.stock <= 5 ? 'text-amber-500' : 'text-zinc-700'}>
                          {product.stock}
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 font-mono">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <input
                            className={`w-24 px-2 py-1.5 text-sm border font-mono outline-none focus:border-black ${editErrors.price ? 'border-red-400' : 'border-zinc-300'}`}
                            type="number"
                            step="0.01"
                            value={editForm.price}
                            onChange={(e) => handleEditChange('price', e.target.value)}
                            disabled={submitting}
                          />
                          {editErrors.price && <span className="font-mono text-xs text-red-600">{editErrors.price}</span>}
                        </div>
                      ) : `₹${Number(product.price).toFixed(2)}`}
                    </td>

                    {/* Featured toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleFeatured(product)}
                        disabled={togglingFeaturedId === product.id}
                        className="inline-flex items-center justify-center w-10 h-10 hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={product.is_featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        {togglingFeaturedId === product.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                        ) : (
                          <Star
                            className="w-4 h-4"
                            fill={product.is_featured ? '#f59e0b' : 'none'}
                            color={product.is_featured ? '#f59e0b' : '#a1a1aa'}
                          />
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditSave(product.id)}
                            disabled={submitting || !!imageError}
                            className="inline-flex items-center justify-center w-9 h-9 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Save"
                          >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={handleEditCancel}
                            disabled={submitting}
                            className="inline-flex items-center justify-center w-9 h-9 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            aria-label="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditStart(product)}
                            className="inline-flex items-center justify-center w-9 h-9 text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId === product.id}
                            className="inline-flex items-center justify-center w-9 h-9 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Delete"
                          >
                            {deletingId === product.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
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
