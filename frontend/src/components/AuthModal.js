import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AppContext';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const labelStyle = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: '#000000',
};

const baseInputStyle = {
  width: '100%',
  padding: '8px 0',
  border: 'none',
  borderBottom: '1px solid #e4e4e7',
  fontFamily: "'Manrope', sans-serif",
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
  backgroundColor: 'transparent',
};

const errorTextStyle = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '11px',
  color: '#dc2626',
  marginTop: '4px',
};

const Field = ({ label, children, error }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <label style={labelStyle}>{label}</label>
    {children}
    {error && <span style={errorTextStyle}>{error}</span>}
  </div>
);

const focusHandler = (e) => { e.target.style.borderBottomColor = '#000000'; };
const blurHandler = (e) => { e.target.style.borderBottomColor = '#e4e4e7'; };

/* ── OTP Input (6 boxes) ──────────────────────────────── */
const OtpInput = ({ value, onChange }) => {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (idx, val) => {
    if (val && !/^\d$/.test(val)) return;
    const arr = [...digits];
    arr[idx] = val;
    onChange(arr.join(''));
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '24px 0' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          autoComplete="off"
          style={{
            width: '48px',
            height: '56px',
            textAlign: 'center',
            fontSize: '22px',
            fontWeight: 700,
            fontFamily: "'Manrope', sans-serif",
            border: '2px solid #d4d4d8',
            borderRadius: '0px',
            outline: 'none',
            backgroundColor: '#ffffff',
            color: '#000000',
            caretColor: '#000000',
            boxSizing: 'border-box',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#000000'; }}
          onBlur={(e) => { e.target.style.borderColor = '#d4d4d8'; }}
        />
      ))}
    </div>
  );
};

/* ── Main AuthModal ───────────────────────────────────── */
const AuthModal = ({ open, onClose, mode, onModeChange }) => {
  const { login, sendOtp, verifyOtpAndRegister } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // OTP state
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  const clearForm = () => {
    setIdentifier(''); setEmail(''); setPassword(''); setConfirmPassword('');
    setName(''); setPhone(''); setDob(''); setErrors({});
    setOtpStep(false); setOtp(''); setOtpError(''); setOtpEmail('');
  };

  const validateRegister = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Please enter your name';
    if (!email.trim()) errs.email = 'Please enter your email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Please enter a valid email';
    if (!phone.trim()) errs.phone = 'Please enter your phone number';
    else if (!/^\+?[\d\s-]{7,15}$/.test(phone.trim())) errs.phone = 'Please enter a valid phone number';
    if (!password) errs.password = 'Please enter a password';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const validateLogin = () => {
    const errs = {};
    if (!identifier.trim()) errs.identifier = 'Please enter your email or phone number';
    if (!password) errs.password = 'Please enter your password';
    return errs;
  };

  const clearError = (field) => { if (errors[field]) setErrors((p) => { const n = { ...p }; delete n[field]; return n; }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'login') {
      const errs = validateLogin();
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setLoading(true);
      try {
        console.log('[Auth] Login attempt:', identifier);
        await login(identifier, password);
        toast.success('Welcome back!');
        onClose(); clearForm();
      } catch (error) {
        console.error('[Auth] Login error:', error.response?.data?.detail || error.message);
        toast.error(error.response?.data?.detail || 'Login failed');
      } finally { setLoading(false); }
    } else {
      // Registration — Step 1: validate + send OTP
      const errs = validateRegister();
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setLoading(true);
      try {
        console.log('[Auth] Sending OTP to:', email);
        await sendOtp(email, password, name, phone, dob);
        setOtpEmail(email);
        setOtpStep(true);
        toast.success('Verification code sent to your email');
      } catch (error) {
        console.error('[Auth] Send OTP error:', error.response?.data?.detail || error.message);
        toast.error(error.response?.data?.detail || 'Failed to send verification code');
      } finally { setLoading(false); }
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setOtpError('Please enter the 6-digit code'); return; }
    setOtpError('');
    setLoading(true);
    try {
      console.log('[Auth] Verifying OTP for:', otpEmail);
      await verifyOtpAndRegister(otpEmail, otp);
      toast.success('Account created! Please login to continue.');
      clearForm();
      onModeChange('login');
    } catch (error) {
      console.error('[Auth] OTP verify error:', error.response?.data?.detail || error.message);
      setOtpError(error.response?.data?.detail || 'Verification failed');
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setOtpError('');
    try {
      await sendOtp(email, password, name, phone, dob);
      setOtp('');
      toast.success('New verification code sent');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend code');
    } finally { setLoading(false); }
  };

  const handleModeSwitch = () => { clearForm(); onModeChange(mode === 'login' ? 'register' : 'login'); };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!loading) { onClose(); clearForm(); } }}
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }} />

        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{ position: 'relative', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff', padding: '48px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', zIndex: 101 }}>

          <button onClick={() => { if (!loading) { onClose(); clearForm(); } }} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#000000', padding: '4px' }}>
            <X size={20} />
          </button>

          {/* ── OTP Verification Step ── */}
          {otpStep ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: '28px', fontWeight: 500, margin: '0 0 8px 0', color: '#000' }}>
                Verify Email
              </h2>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '13px', color: '#71717a', margin: '0 0 32px 0' }}>
                Enter the 6-digit code sent to {otpEmail}
              </p>

              <OtpInput value={otp} onChange={setOtp} />

              {otpError && <p style={{ ...errorTextStyle, textAlign: 'center', marginTop: '12px' }}>{otpError}</p>}

              <button onClick={handleVerifyOtp} disabled={loading}
                style={{ width: '100%', height: '52px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '24px' }}>
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                <button type="button" onClick={handleResendOtp} disabled={loading}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: '#000', textDecoration: 'underline' }}>
                  Resend Code
                </button>
                <button type="button" onClick={() => { setOtpStep(false); setOtp(''); setOtpError(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: '#71717a' }}>
                  Go Back
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Form Header ── */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: '36px', fontWeight: 500, margin: 0, color: '#000' }}>
                  {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
              </div>

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {mode === 'register' ? (
                  <>
                    <Field label="Name" error={errors.name}>
                      <input type="text" value={name} onChange={(e) => { setName(e.target.value); clearError('name'); }}
                        style={baseInputStyle} onFocus={focusHandler} onBlur={blurHandler} placeholder="Full name" />
                    </Field>
                    <Field label="Phone Number" error={errors.phone}>
                      <input type="text" value={phone} onChange={(e) => { setPhone(e.target.value); clearError('phone'); }}
                        style={baseInputStyle} onFocus={focusHandler} onBlur={blurHandler} placeholder="+91 9876543210" />
                    </Field>
                    <Field label="Email" error={errors.email}>
                      <input type="text" value={email} onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                        style={baseInputStyle} onFocus={focusHandler} onBlur={blurHandler} placeholder="you@example.com" />
                    </Field>
                    <Field label="Date of Birth">
                      <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                        style={baseInputStyle} onFocus={focusHandler} onBlur={blurHandler} />
                    </Field>
                    <Field label="Password" error={errors.password}>
                      <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                        style={baseInputStyle} onFocus={focusHandler} onBlur={blurHandler} placeholder="Min 6 characters" />
                    </Field>
                    <Field label="Confirm Password" error={errors.confirmPassword}>
                      <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                        style={baseInputStyle} onFocus={focusHandler} onBlur={blurHandler} placeholder="Re-enter password" />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Email or Phone Number" error={errors.identifier}>
                      <input type="text" value={identifier} onChange={(e) => { setIdentifier(e.target.value); clearError('identifier'); }}
                        style={baseInputStyle} onFocus={focusHandler} onBlur={blurHandler} placeholder="Email or phone number" />
                    </Field>
                    <Field label="Password" error={errors.password}>
                      <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                        style={baseInputStyle} onFocus={focusHandler} onBlur={blurHandler} />
                    </Field>
                  </>
                )}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', height: '52px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px', transition: 'opacity 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}>
                  {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Create Account'}
                </button>

                {/* Social login divider + buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#e4e4e7' }} />
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>or continue with</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#e4e4e7' }} />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => { window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/auth/google`; }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '44px', backgroundColor: '#fff', border: '1px solid #e4e4e7', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '12px', fontWeight: 500, color: '#000', transition: 'border-color 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e4e4e7'; }}>
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </button>
                  <button type="button" onClick={() => { window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/auth/microsoft`; }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '44px', backgroundColor: '#fff', border: '1px solid #e4e4e7', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '12px', fontWeight: 500, color: '#000', transition: 'border-color 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e4e4e7'; }}>
                    <svg width="16" height="16" viewBox="0 0 23 23"><rect x="1" y="1" width="10" height="10" fill="#f25022"/><rect x="12" y="1" width="10" height="10" fill="#7fba00"/><rect x="1" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/></svg>
                    Microsoft
                  </button>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button type="button" onClick={handleModeSwitch}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: '#71717a' }}>
                    {mode === 'login' ? (
                      <>Don't have an account? <span style={{ color: '#000', textDecoration: 'underline' }}>Register</span></>
                    ) : (
                      <>Already have an account? <span style={{ color: '#000', textDecoration: 'underline' }}>Login</span></>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;
