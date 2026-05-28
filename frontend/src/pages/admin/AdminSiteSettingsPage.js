import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, ImageIcon, Loader } from 'lucide-react';
import { useAuth } from '../../context/AppContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const labelStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  marginBottom: '0.375rem',
  display: 'block',
  letterSpacing: '0.05em',
  fontFamily: 'JetBrains Mono, monospace',
};

const AdminSiteSettingsPage = () => {
  const { token } = useAuth();
  const [heroBannerUrl, setHeroBannerUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/site-settings`);
      setHeroBannerUrl(response.data.hero_banner_url || null);
    } catch (error) {
      console.error('Failed to fetch site settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Accepted formats: JPEG, PNG, WebP');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max image size is 5MB');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadAndSave = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    setUploading(true);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Step 1: Upload image to S3 via backend
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', 'hero-banner');
      const uploadResp = await axios.post(`${API}/admin/upload`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = uploadResp.data.url;

      // Step 2: Save the URL to site settings
      await axios.put(`${API}/admin/site-settings`, { hero_banner_url: uploadedUrl }, { headers });

      setHeroBannerUrl(uploadedUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success('Hero banner updated successfully');
    } catch (error) {
      console.error('Upload/save error:', error);
      const detail = error.response?.data?.detail || 'Failed to update hero banner';
      toast.error(detail);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1
        className="heading-font"
        style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: '#000' }}
      >
        Site Settings
      </h1>
      <p className="body-font" style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Manage your homepage hero banner and other site-wide settings.
      </p>

      {/* Hero Banner Section */}
      <div style={{ border: '1px solid #e4e4e7', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2
          className="heading-font"
          style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#000' }}
        >
          Hero Banner
        </h2>

        {/* Current Banner Preview */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="mono-font" style={labelStyle}>Current Banner</label>
          {loading ? (
            <div style={{ width: '100%', height: '12rem', backgroundColor: '#e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader style={{ width: '1.5rem', height: '1.5rem', color: '#71717a', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : heroBannerUrl ? (
            <img
              src={heroBannerUrl}
              alt="Current hero banner"
              style={{ width: '100%', maxHeight: '16rem', objectFit: 'cover', border: '1px solid #e4e4e7' }}
            />
          ) : (
            <div style={{ width: '100%', height: '12rem', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="mono-font" style={{ color: '#71717a', fontSize: '0.75rem' }}>No banner set</span>
            </div>
          )}
        </div>

        {/* Upload New Banner */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="mono-font" style={labelStyle}>Upload New Banner</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #e4e4e7', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
            <ImageIcon style={{ width: '1rem', height: '1rem', color: '#71717a' }} />
            <span className="body-font" style={{ fontSize: '0.875rem', color: '#71717a' }}>
              {selectedFile ? selectedFile.name : 'Choose image...'}
            </span>
            <input
              type="file"
              style={{ display: 'none' }}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* New Image Preview */}
        {previewUrl && (
          <div style={{ marginBottom: '1rem' }}>
            <label className="mono-font" style={labelStyle}>Preview</label>
            <img
              src={previewUrl}
              alt="New banner preview"
              style={{ width: '100%', maxHeight: '12rem', objectFit: 'cover', border: '1px solid #e4e4e7' }}
            />
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleUploadAndSave}
          disabled={uploading || !selectedFile}
          style={{
            padding: '0.625rem 1.5rem',
            backgroundColor: uploading || !selectedFile ? '#71717a' : '#000',
            color: '#fff',
            border: 'none',
            cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: uploading || !selectedFile ? 0.7 : 1,
          }}
        >
          {uploading ? (
            <>
              <Loader style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
              Uploading...
            </>
          ) : (
            <>
              <Upload style={{ width: '1rem', height: '1rem' }} />
              Upload & Save Banner
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminSiteSettingsPage;
