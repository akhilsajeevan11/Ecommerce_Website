import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, X, ImageIcon, Film, Loader } from 'lucide-react';
import { MOCK_CATEGORIES } from '../data/adminMockData';
import { validateProductForm } from '../utils/validateProductForm';
import { isAdminSubdomain } from '../utils/subdomain';
import { useAuth } from '../context/AppContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const INITIAL_FORM = {
  name: '',
  barcode_id: '',
  price: '',
  stock: '',
  category: '',
  sizes: '',
  colors: '',
  description: '',
  story: '',
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

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

const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: '4rem' };

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

const AdminAddProductPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateFile = (file, type) => {
    if (type === 'image') {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Accepted formats: JPEG, PNG, WebP';
      if (file.size > MAX_IMAGE_SIZE) return 'Max image size is 5MB';
    } else {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) return 'Accepted formats: MP4, WebM';
      if (file.size > MAX_VIDEO_SIZE) return 'Max video size is 50MB';
    }
    return null;
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, 'image');
    if (err) { setErrors((prev) => ({ ...prev, image: err })); e.target.value = ''; return; }
    setErrors((prev) => { const n = { ...prev }; delete n.image; return n; });
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, 'video');
    if (err) { setErrors((prev) => ({ ...prev, video: err })); e.target.value = ''; return; }
    setErrors((prev) => { const n = { ...prev }; delete n.video; return n; });
    setVideoFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateProductForm(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Step 1: Upload image to S3 via backend (if provided)
      let imageUrl = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadResp = await axios.post(`${API}/admin/upload`, formData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        });
        imageUrl = uploadResp.data.url;
      }

      // Step 2: Upload video to S3 (if provided)
      let videoUrl = null;
      if (videoFile) {
        const formData = new FormData();
        formData.append('file', videoFile);
        const uploadResp = await axios.post(`${API}/admin/upload`, formData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        });
        videoUrl = uploadResp.data.url;
      }

      // Step 3: Create product with all data
      const productPayload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category: form.category.trim(),
        stock: parseInt(form.stock, 10),
        sizes: form.sizes ? form.sizes.split(',').map((s) => s.trim()).filter(Boolean) : [],
        colors: form.colors ? form.colors.split(',').map((c) => c.trim()).filter(Boolean) : [],
        images: imageUrl ? [imageUrl] : [],
        barcode_id: form.barcode_id.trim() || null,
        story: form.story.trim() || null,
        video_url: videoUrl,
      };

      await axios.post(`${API}/products`, productPayload, { headers });

      toast.success('Product created successfully');
      navigate(isAdminSubdomain() ? '/products' : '/admin/products');
    } catch (error) {
      console.error('Create product error:', error);
      const detail = error.response?.data?.detail || 'Failed to create product';
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldLabel = (label, required) => (
    <label className="mono-font" style={labelStyle}>
      {label}
      {required && ' *'}
    </label>
  );

  const fieldError = (field) =>
    errors[field] ? <p style={errorStyle}>{errors[field]}</p> : null;

  return (
    <div style={{ padding: '2rem' }}>
      <h1
        className="heading-font"
        style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: '#000' }}
      >
        Add Product
      </h1>
      <p className="body-font" style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Fill in the product details below. Fields marked with * are required.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            {fieldLabel('Name', true)}
            <input style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Product name" />
            {fieldError('name')}
          </div>
          <div>
            {fieldLabel('Barcode ID', true)}
            <input style={inputStyle} value={form.barcode_id} onChange={(e) => set('barcode_id', e.target.value)} placeholder="e.g., SKU-001" />
            {fieldError('barcode_id')}
          </div>
          <div>
            {fieldLabel('Price', true)}
            <input style={inputStyle} type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00" />
            {fieldError('price')}
          </div>
          <div>
            {fieldLabel('Stock', true)}
            <input style={inputStyle} type="number" min="0" step="1" value={form.stock} onChange={(e) => set('stock', e.target.value)} placeholder="0" />
            {fieldError('stock')}
          </div>
          <div>
            {fieldLabel('Category', true)}
            <input style={inputStyle} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g., T-Shirt" />
            {fieldError('category')}
          </div>
          <div>
            {fieldLabel('Sizes', false)}
            <input style={inputStyle} value={form.sizes} onChange={(e) => set('sizes', e.target.value)} placeholder="S, M, L, XL" />
          </div>
          <div>
            {fieldLabel('Colors', false)}
            <input style={inputStyle} value={form.colors} onChange={(e) => set('colors', e.target.value)} placeholder="Black, White" />
          </div>
        </div>

        <div>
          {fieldLabel('Description', true)}
          <textarea style={textareaStyle} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Product description" rows={3} />
          {fieldError('description')}
        </div>

        <div>
          {fieldLabel('Story', false)}
          <textarea style={textareaStyle} value={form.story} onChange={(e) => set('story', e.target.value)} placeholder="Brand story (optional)" rows={2} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            {fieldLabel('Image', false)}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #e4e4e7', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
              <ImageIcon style={{ width: '1rem', height: '1rem', color: '#71717a' }} />
              <span className="body-font" style={{ fontSize: '0.875rem', color: '#71717a' }}>{imageFile ? imageFile.name : 'Choose image...'}</span>
              <input type="file" style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
            </label>
            {fieldError('image')}
            {imagePreview && (
              <div style={{ marginTop: '0.5rem', position: 'relative', display: 'inline-block' }}>
                <img src={imagePreview} alt="Preview" style={{ width: '5rem', height: '5rem', objectFit: 'cover', border: '1px solid #e4e4e7' }} />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                  style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem', background: '#000', color: '#fff', borderRadius: '50%', width: '1.25rem', height: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                  <X style={{ width: '0.75rem', height: '0.75rem' }} />
                </button>
              </div>
            )}
          </div>
          <div>
            {fieldLabel('Video', false)}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #e4e4e7', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
              <Film style={{ width: '1rem', height: '1rem', color: '#71717a' }} />
              <span className="body-font" style={{ fontSize: '0.875rem', color: '#71717a' }}>{videoFile ? videoFile.name : 'Choose video...'}</span>
              <input type="file" style={{ display: 'none' }} accept="video/mp4,video/webm" onChange={handleVideoChange} />
            </label>
            {fieldError('video')}
            {videoFile && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Film style={{ width: '1rem', height: '1rem', color: '#a1a1aa' }} />
                <span className="mono-font" style={{ fontSize: '0.75rem', color: '#52525b' }}>{videoFile.name}</span>
                <button type="button" onClick={() => setVideoFile(null)}
                  style={{ background: '#000', color: '#fff', borderRadius: '50%', width: '1.25rem', height: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <X style={{ width: '0.75rem', height: '0.75rem' }} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ paddingTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '0.625rem 1rem',
              backgroundColor: submitting ? '#71717a' : '#000',
              color: '#fff',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <>
                <Loader style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                Creating...
              </>
            ) : (
              <>
                <Upload style={{ width: '1rem', height: '1rem' }} />
                Create Product
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddProductPage;
