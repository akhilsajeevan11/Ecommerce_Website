import { useState } from 'react';
import { useAuth } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { User, Mail, Phone, Calendar, Lock, Pencil, Check, X } from 'lucide-react';

const labelStyle = {
  fontFamily: "'Manrope', sans-serif", fontSize: '10px', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.2em', color: '#71717a', marginBottom: '4px',
};

const valueStyle = {
  fontFamily: "'Manrope', sans-serif", fontSize: '15px', color: '#000', padding: '8px 0',
};

const inputStyle = {
  width: '100%', padding: '8px 0', border: 'none', borderBottom: '2px solid #000',
  fontFamily: "'Manrope', sans-serif", fontSize: '15px', outline: 'none', backgroundColor: 'transparent', color: '#000',
};

const iconStyle = { width: '16px', height: '16px', color: '#a1a1aa', flexShrink: 0 };

const ProfilePage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null); // field name being edited
  const [editValue, setEditValue] = useState('');

  if (!user) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Manrope', sans-serif", color: '#71717a' }}>Please login to view your profile.</p>
      </div>
    );
  }

  const startEdit = (field, currentValue) => {
    setEditing(field);
    setEditValue(currentValue || '');
  };

  const cancelEdit = () => { setEditing(null); setEditValue(''); };

  const saveEdit = () => {
    // UI only for now — no backend update yet
    toast.success(`${editing} updated (UI only)`);
    setEditing(null);
    setEditValue('');
  };

  const fields = [
    { key: 'name', label: 'Name', icon: User, value: user.name, editable: true },
    { key: 'email', label: 'Email', icon: Mail, value: user.email, editable: false },
    { key: 'phone', label: 'Phone', icon: Phone, value: user.phone || 'Not provided', editable: true },
    { key: 'dob', label: 'Date of Birth', icon: Calendar, value: user.dob || 'Not provided', editable: true },
  ];

  return (
    <div style={{ minHeight: '80vh', backgroundColor: '#fff', padding: '48px 24px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#000', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            fontFamily: "'Bodoni Moda', serif", fontSize: '32px', fontWeight: 700,
          }}>
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <h1 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: '28px', fontWeight: 500, margin: '0 0 4px 0', color: '#000' }}>
            {user.name || 'User'}
          </h1>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '13px', color: '#71717a', margin: 0 }}>
            {user.email}
          </p>
        </div>

        {/* Profile fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {fields.map(({ key, label, icon: Icon, value, editable }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '20px 0', borderBottom: '1px solid #f4f4f5' }}>
              <div style={{ paddingTop: '2px' }}><Icon style={iconStyle} /></div>
              <div style={{ flex: 1 }}>
                <p style={labelStyle}>{label}</p>
                {editing === key ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type={key === 'dob' ? 'date' : 'text'} value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      style={inputStyle} autoFocus />
                    <button onClick={saveEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                      <Check size={18} color="#000" />
                    </button>
                    <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                      <X size={18} color="#71717a" />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={valueStyle}>{value}</p>
                    {editable && (
                      <button onClick={() => startEdit(key, value === 'Not provided' ? '' : value)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Pencil size={14} color="#a1a1aa" />
                      </button>
                    )}
                  </div>
                )}
                {key === 'email' && (
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px', color: '#a1a1aa', marginTop: '2px' }}>
                    Email cannot be changed
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Reset Password button */}
        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e4e4e7' }}>
          <button
            onClick={() => toast.info('Password reset coming soon')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
              padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif", fontSize: '13px', fontWeight: 500, color: '#000',
            }}
          >
            <Lock size={16} color="#a1a1aa" />
            Reset Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
