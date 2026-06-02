import { useState, useEffect, useCallback } from 'react';
import { noirToast as toast } from '../../lib/noir-toast';
import { Upload, ImageIcon, Loader, Plus, X, MapPin, Info, Instagram } from 'lucide-react';
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

const PINCODE_RE = /^\d{6}$/;

/* ─── Reusable image-upload section ────────────────────────────────────── */
const ImageUploadSection = ({
  token,
  title,
  description,
  settingsKey,
  s3Category,
  currentUrl,
  onSaved,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { toast.error('Accepted: JPEG, PNG, WebP'); e.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); e.target.value = ''; return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedFile) { toast.error('Please select an image first'); return; }
    setUploading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', s3Category);
      const uploadResp = await axios.post(`${API}/admin/upload`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = uploadResp.data.url;
      await axios.put(`${API}/admin/site-settings`, { [settingsKey]: uploadedUrl }, { headers });
      onSaved(uploadedUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success(`${title} updated`);
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to update ${title.toLowerCase()}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #e4e4e7', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 className="heading-font" style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem', color: '#000' }}>
        {title}
      </h2>
      {description && (
        <p className="body-font" style={{ color: '#71717a', fontSize: '0.8125rem', marginBottom: '1rem' }}>
          {description}
        </p>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="mono-font" style={labelStyle}>Current image</label>
        {currentUrl ? (
          <img src={currentUrl} alt={`Current ${title.toLowerCase()}`}
            style={{ width: '100%', maxHeight: '14rem', objectFit: 'cover', border: '1px solid #e4e4e7' }} />
        ) : (
          <div style={{ width: '100%', height: '8rem', backgroundColor: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e4e4e7' }}>
            <span className="mono-font" style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>No image set</span>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label className="mono-font" style={labelStyle}>Upload new image</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #e4e4e7', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
          <ImageIcon style={{ width: '1rem', height: '1rem', color: '#71717a' }} />
          <span className="body-font" style={{ fontSize: '0.875rem', color: '#71717a' }}>
            {selectedFile ? selectedFile.name : 'Choose image…'}
          </span>
          <input type="file" style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
        </label>
      </div>

      {previewUrl && (
        <div style={{ marginBottom: '1rem' }}>
          <label className="mono-font" style={labelStyle}>Preview</label>
          <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '10rem', objectFit: 'cover', border: '1px solid #e4e4e7' }} />
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={uploading || !selectedFile}
        style={{
          padding: '0.625rem 1.5rem', backgroundColor: uploading || !selectedFile ? '#71717a' : '#000',
          color: '#fff', border: 'none', cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          opacity: uploading || !selectedFile ? 0.7 : 1,
        }}
      >
        {uploading ? <><Loader style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} /> Uploading…</> : <><Upload style={{ width: '1rem', height: '1rem' }} /> Upload & Save</>}
      </button>
    </div>
  );
};

/* ─── Instagram Feed section ────────────────────────────────────────────── */
const INSTAGRAM_SLOTS = 6;

const InstagramSection = ({ token, initialImages, initialHandle, initialUrl }) => {
  // slots: array of 6 strings (URL or '' for empty)
  const [slots, setSlots] = useState(() => {
    const base = Array(INSTAGRAM_SLOTS).fill('');
    if (Array.isArray(initialImages)) {
      initialImages.slice(0, INSTAGRAM_SLOTS).forEach((url, i) => { base[i] = url || ''; });
    }
    return base;
  });
  const [handle, setHandle] = useState(initialHandle || '');
  const [profileUrl, setProfileUrl] = useState(initialUrl || '');
  const [uploading, setUploading] = useState(null); // index being uploaded
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const handleFileChange = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { toast.error('Accepted: JPEG, PNG, WebP'); e.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); e.target.value = ''; return; }

    setUploading(idx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'instagram');
      const resp = await axios.post(`${API}/admin/upload`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      const url = resp.data.url;
      setSlots(prev => { const next = [...prev]; next[idx] = url; return next; });
      toast.success(`Photo ${idx + 1} uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleRemoveSlot = (idx) => {
    setSlots(prev => { const next = [...prev]; next[idx] = ''; return next; });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const filled = slots.filter(u => u.trim());
    try {
      await axios.put(`${API}/admin/site-settings`, {
        instagram_images: JSON.stringify(filled),
        instagram_handle: handle.trim() || '@noir',
        instagram_url: profileUrl.trim() || 'https://instagram.com/',
      }, { headers });
      toast.success('Instagram feed updated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save Instagram settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ border: '1px solid #e4e4e7', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
        <Instagram style={{ width: '1.25rem', height: '1.25rem', marginTop: '0.25rem', flexShrink: 0 }} />
        <div>
          <h2 className="heading-font" style={{ fontSize: '1.125rem', fontWeight: 600, color: '#000', marginBottom: '0.25rem' }}>
            Instagram Feed
          </h2>
          <p className="body-font" style={{ color: '#71717a', fontSize: '0.8125rem' }}>
            Upload up to 6 photos for the homepage Instagram grid. All tiles link to your profile URL.
          </p>
        </div>
      </div>

      {/* Handle + URL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label className="mono-font" style={labelStyle}>Instagram handle</label>
          <input
            type="text"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="@noir"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e4e4e7', fontSize: '0.875rem', fontFamily: 'JetBrains Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
          />
          <p className="mono-font" style={{ fontSize: '0.7rem', color: '#a1a1aa', marginTop: '0.25rem' }}>
            Shown as "Follow @handle" heading
          </p>
        </div>
        <div>
          <label className="mono-font" style={labelStyle}>Profile URL</label>
          <input
            type="url"
            value={profileUrl}
            onChange={e => setProfileUrl(e.target.value)}
            placeholder="https://instagram.com/yournoir"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e4e4e7', fontSize: '0.875rem', fontFamily: 'JetBrains Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
          />
          <p className="mono-font" style={{ fontSize: '0.7rem', color: '#a1a1aa', marginTop: '0.25rem' }}>
            Every tile click opens this URL
          </p>
        </div>
      </div>

      {/* 6 photo slots */}
      <label className="mono-font" style={{ ...labelStyle, marginBottom: '0.75rem' }}>Photos (up to 6)</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {slots.map((url, idx) => (
          <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', border: '1px solid #e4e4e7', backgroundColor: '#f4f4f5', overflow: 'hidden' }}>
            {url ? (
              <>
                <img
                  src={url}
                  alt={`Instagram photo ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <button
                  onClick={() => handleRemoveSlot(idx)}
                  aria-label={`Remove photo ${idx + 1}`}
                  style={{
                    position: 'absolute', top: '0.25rem', right: '0.25rem',
                    background: '#000', color: '#fff', border: 'none', borderRadius: '50%',
                    width: '1.25rem', height: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', opacity: 0.85,
                  }}
                >
                  <X style={{ width: '0.75rem', height: '0.75rem' }} />
                </button>
              </>
            ) : (
              <label style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploading === idx ? 'not-allowed' : 'pointer', gap: '0.25rem' }}>
                {uploading === idx ? (
                  <Loader style={{ width: '1.25rem', height: '1.25rem', color: '#a1a1aa', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <ImageIcon style={{ width: '1.25rem', height: '1.25rem', color: '#a1a1aa' }} />
                    <span className="mono-font" style={{ fontSize: '0.65rem', color: '#a1a1aa' }}>Photo {idx + 1}</span>
                  </>
                )}
                <input
                  type="file"
                  style={{ display: 'none' }}
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading !== null}
                  onChange={e => handleFileChange(e, idx)}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSaveAll}
        disabled={saving}
        style={{
          padding: '0.625rem 1.5rem', backgroundColor: saving ? '#71717a' : '#000',
          color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving
          ? <><Loader style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} /> Saving…</>
          : <><Upload style={{ width: '1rem', height: '1rem' }} /> Save Instagram Settings</>
        }
      </button>
    </div>
  );
};

/* ─── Pincode Manager section ───────────────────────────────────────────── */
const PincodeManager = ({ token }) => {
  const [pincodes, setPincodes] = useState([]);
  const [mode, setMode] = useState('serve_all'); // 'serve_all' | 'allowlist'
  const [loadingList, setLoadingList] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchPincodes = useCallback(async () => {
    setLoadingList(true);
    try {
      const resp = await axios.get(`${API}/admin/delivery/pincodes`, { headers });
      setPincodes(resp.data.pincodes || []);
      setMode(resp.data.mode);
    } catch {
      toast.error('Failed to load pincode list');
    } finally {
      setLoadingList(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPincodes(); }, [fetchPincodes]);

  const handleAddSingle = async () => {
    const pin = inputValue.trim();
    if (!PINCODE_RE.test(pin)) { toast.error('Enter a valid 6-digit pincode'); return; }
    if (pincodes.includes(pin)) { toast.error('Pincode already in list'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/delivery/pincodes/add`, { pincodes: [pin] }, { headers });
      setInputValue('');
      await fetchPincodes();
      toast.success(`Added ${pin}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add pincode');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (pin) => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/delivery/pincodes/remove`, { pincodes: [pin] }, { headers });
      await fetchPincodes();
      toast.success(`Removed ${pin}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove pincode');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAdd = async () => {
    const raw = bulkValue.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
    const valid = raw.filter(p => PINCODE_RE.test(p));
    const invalid = raw.filter(p => !PINCODE_RE.test(p));
    if (invalid.length) { toast.error(`Invalid pincodes ignored: ${invalid.join(', ')}`); }
    if (!valid.length) return;
    setSaving(true);
    try {
      await axios.post(`${API}/admin/delivery/pincodes/add`, { pincodes: valid }, { headers });
      setBulkValue('');
      setShowBulk(false);
      await fetchPincodes();
      toast.success(`Added ${valid.length} pincodes`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add pincodes');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all pincodes and switch to serve-all mode?')) return;
    setSaving(true);
    try {
      await axios.put(`${API}/admin/delivery/pincodes`, { pincodes: [] }, { headers });
      await fetchPincodes();
      toast.success('All pincodes cleared — now in serve-all mode');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to clear pincodes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ border: '1px solid #e4e4e7', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <MapPin style={{ width: '1.25rem', height: '1.25rem', marginTop: '0.25rem', flexShrink: 0 }} />
        <div>
          <h2 className="heading-font" style={{ fontSize: '1.125rem', fontWeight: 600, color: '#000', marginBottom: '0.25rem' }}>
            Delivery Pincodes
          </h2>
          <p className="body-font" style={{ color: '#71717a', fontSize: '0.8125rem' }}>
            Control which pincodes can receive delivery. When the list is empty, all valid 6-digit pincodes are serviceable (serve-all mode).
          </p>
        </div>
      </div>

      {/* Mode badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
        padding: '0.25rem 0.75rem', marginBottom: '1.25rem',
        backgroundColor: mode === 'serve_all' ? '#f0fdf4' : '#eff6ff',
        border: `1px solid ${mode === 'serve_all' ? '#bbf7d0' : '#bfdbfe'}`,
        fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace',
        color: mode === 'serve_all' ? '#16a34a' : '#2563eb',
      }}>
        <Info style={{ width: '0.875rem', height: '0.875rem' }} />
        {mode === 'serve_all'
          ? 'Serve-all mode — every valid pincode gets delivery'
          : `Allowlist mode — ${pincodes.length} pincode${pincodes.length !== 1 ? 's' : ''} configured`}
      </div>

      {/* Add single */}
      <div style={{ marginBottom: '1rem' }}>
        <label className="mono-font" style={labelStyle}>Add pincode</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={inputValue}
            onChange={e => setInputValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSingle())}
            placeholder="e.g. 560001"
            style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #e4e4e7', fontSize: '0.875rem', fontFamily: 'JetBrains Mono, monospace', outline: 'none' }}
          />
          <button
            onClick={handleAddSingle}
            disabled={saving || inputValue.length !== 6}
            style={{
              padding: '0.5rem 1rem', backgroundColor: saving || inputValue.length !== 6 ? '#71717a' : '#000',
              color: '#fff', border: 'none', cursor: saving || inputValue.length !== 6 ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem',
              opacity: saving || inputValue.length !== 6 ? 0.6 : 1,
            }}
          >
            <Plus style={{ width: '0.875rem', height: '0.875rem' }} /> Add
          </button>
        </div>
      </div>

      {/* Bulk add toggle */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => setShowBulk(v => !v)}
          style={{ background: 'none', border: '1px solid #e4e4e7', padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer', color: '#52525b' }}
        >
          {showBulk ? 'Hide bulk add' : 'Bulk add pincodes'}
        </button>

        {showBulk && (
          <div style={{ marginTop: '0.75rem' }}>
            <label className="mono-font" style={labelStyle}>Paste pincodes (comma, space, or newline separated)</label>
            <textarea
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              rows={4}
              placeholder="110001, 560001&#10;400001"
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e4e4e7', fontSize: '0.875rem', fontFamily: 'JetBrains Mono, monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <button
              onClick={handleBulkAdd}
              disabled={saving || !bulkValue.trim()}
              style={{
                marginTop: '0.5rem', padding: '0.5rem 1rem', backgroundColor: saving || !bulkValue.trim() ? '#71717a' : '#000',
                color: '#fff', border: 'none', cursor: saving || !bulkValue.trim() ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                opacity: saving || !bulkValue.trim() ? 0.6 : 1,
              }}
            >
              <Plus style={{ width: '0.875rem', height: '0.875rem' }} /> Add all
            </button>
          </div>
        )}
      </div>

      {/* Pincode list */}
      {loadingList ? (
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader style={{ width: '1.25rem', height: '1.25rem', color: '#a1a1aa', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : pincodes.length === 0 ? (
        <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', border: '1px solid #f4f4f5', textAlign: 'center' }}>
          <p className="mono-font" style={{ color: '#a1a1aa', fontSize: '0.8125rem' }}>
            No pincodes added — currently in serve-all mode
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label className="mono-font" style={{ ...labelStyle, marginBottom: 0 }}>
              {pincodes.length} pincode{pincodes.length !== 1 ? 's' : ''} configured
            </label>
            <button
              onClick={handleClearAll}
              disabled={saving}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: '#dc2626', textDecoration: 'underline', padding: 0 }}
            >
              Clear all
            </button>
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0.375rem',
            maxHeight: '12rem', overflowY: 'auto',
            border: '1px solid #f4f4f5', padding: '0.75rem',
            backgroundColor: '#fafafa',
          }}>
            {pincodes.map(pin => (
              <span key={pin} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.125rem 0.5rem', border: '1px solid #d4d4d8',
                backgroundColor: '#fff', fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.75rem', color: '#3f3f46',
              }}>
                {pin}
                <button
                  onClick={() => handleRemove(pin)}
                  disabled={saving}
                  aria-label={`Remove ${pin}`}
                  style={{ background: 'none', border: 'none', padding: '0 0.125rem', cursor: 'pointer', color: '#a1a1aa', display: 'flex', alignItems: 'center' }}
                >
                  <X style={{ width: '0.75rem', height: '0.75rem' }} />
                </button>
              </span>
            ))}
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────────────────── */
const AdminSiteSettingsPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [heroBannerUrl, setHeroBannerUrl] = useState(null);
  const [brandStoryImageUrl, setBrandStoryImageUrl] = useState(null);
  const [igImages, setIgImages] = useState([]);
  const [igHandle, setIgHandle] = useState('');
  const [igUrl, setIgUrl] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const resp = await axios.get(`${API}/site-settings`);
        const d = resp.data || {};
        setHeroBannerUrl(d.hero_banner_url || null);
        setBrandStoryImageUrl(d.brand_story_image_url || null);
        // Parse instagram_images JSON array
        if (typeof d.instagram_images === 'string' && d.instagram_images.trim()) {
          try { setIgImages(JSON.parse(d.instagram_images) || []); } catch { setIgImages([]); }
        }
        setIgHandle(d.instagram_handle || '');
        setIgUrl(d.instagram_url || '');
      } catch {
        // silent — sections just show "No image set"
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <Loader style={{ width: '1.5rem', height: '1.5rem', color: '#a1a1aa', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 className="heading-font" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: '#000' }}>
        Site Settings
      </h1>
      <p className="body-font" style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Manage homepage images, brand assets, and delivery configuration.
      </p>

      {/* Hero Banner */}
      <ImageUploadSection
        token={token}
        title="Hero Banner"
        description="Full-bleed image shown at the top of the homepage (recommended: 1920×1080px or wider)."
        settingsKey="hero_banner_url"
        s3Category="hero-banner"
        currentUrl={heroBannerUrl}
        onSaved={setHeroBannerUrl}
      />

      {/* Brand Story Image */}
      <ImageUploadSection
        token={token}
        title="Brand Story Image"
        description='Right-column image in the "Crafted with intention" section on the homepage (recommended: portrait ratio 4:5).'
        settingsKey="brand_story_image_url"
        s3Category="brand-story"
        currentUrl={brandStoryImageUrl}
        onSaved={setBrandStoryImageUrl}
      />

      {/* Instagram Feed */}
      {!loading && (
        <InstagramSection
          token={token}
          initialImages={igImages}
          initialHandle={igHandle}
          initialUrl={igUrl}
        />
      )}

      {/* Pincode Manager */}
      <PincodeManager token={token} />
    </div>
  );
};

export default AdminSiteSettingsPage;
