import React, { useState } from 'react';
import { useAuth } from '../context/AppContext';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const labelStyle = {
  fontFamily: "'Manrope', sans-serif", fontSize: '10px', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.2em', color: '#000',
};

const inputStyle = {
  width: '100%', padding: '8px 0', border: 'none',
  borderBottom: '1px solid #e4e4e7', fontFamily: "'Manrope', sans-serif",
  fontSize: '14px', outline: 'none', backgroundColor: 'transparent', color: '#000',
};

const errorStyle = {
  fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: '#dc2626', marginTop: '4px',
};

const CompleteProfileModal = ({ open, onClose }) => {
  const { token, user, refreshUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    if (!/^\+?[\d\s-]{7,15}$/.test(phone.trim())) { setError('Please enter a valid phone number'); return; }
    setError('');
    setLoading(true);
    try {
      await axios.put(`${API}/auth/profile`, { phone: phone.trim(), dob: dob || null }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Profile updated');
      if (refreshUser) await refreshUser();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally { setLoading(false); }
  };

  if (!open) return null;

  const focus = (e) => { e.target.style.borderBottomColor = '#000'; };
  const blur = (e) => { e.target.style.borderBottomColor = '#e4e4e7'; };

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />

        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{ position: 'relative', width: '100%', maxWidth: '420px', backgroundColor: '#fff', padding: '48px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', zIndex: 101 }}>

          <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#000', padding: '4px' }}>
            <X size={18} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: '26px', fontWeight: 500, margin: '0 0 8px 0', color: '#000' }}>
              Complete Your Profile
            </h2>
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '13px', color: '#71717a', margin: 0 }}>
              Add a few more details to get the most out of NOIR.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input type="text" value={phone} onChange={(e) => { setPhone(e.target.value); setError(''); }}
                style={inputStyle} onFocus={focus} onBlur={blur} placeholder="+91 9876543210" />
            </div>
            <div>
              <label style={labelStyle}>Date of Birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            {error && <p style={errorStyle}>{error}</p>}

            <button onClick={handleSave} disabled={loading}
              style={{ width: '100%', height: '48px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {loading ? 'Saving...' : 'Save'}
            </button>

            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: '#71717a', textAlign: 'center' }}>
              Skip for now
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CompleteProfileModal;
