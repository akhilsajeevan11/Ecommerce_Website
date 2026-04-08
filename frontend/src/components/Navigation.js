import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, User, Menu, X, LogOut, UserCircle } from 'lucide-react';
import { useAuth, useCart, useAuthModal } from '../context/AppContext';
import AuthModal from './AuthModal';
import CompleteProfileModal from './CompleteProfileModal';
import CartDrawer from './CartDrawer';

const Navigation = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { showAuthModal, authModalMode, openAuthModal, closeAuthModal, setAuthModalMode } = useAuthModal();
  const { showCompleteProfile, setShowCompleteProfile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const navLinks = [{ path: '/', label: 'Home' }, { path: '/shop', label: 'Shop' }];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); setUserMenuOpen(false); navigate('/'); };

  const menuItemStyle = {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
    padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Manrope', sans-serif", fontSize: '13px', color: '#000', textAlign: 'left',
  };

  return (
    <>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#fff', borderBottom: '1px solid #f4f4f5' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px', position: 'relative' }}>

            {/* Logo */}
            <div style={{ flex: '0 0 200px' }}>
              <Link to="/" style={{ fontFamily: "'Bodoni Moda', serif", fontSize: '26px', fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', color: '#000', textTransform: 'uppercase' }}>
                NOIR
              </Link>
            </div>

            {/* Center nav links */}
            <div className="desktop-only-flex" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: '40px' }}>
              {navLinks.map(link => {
                const isActive = location.pathname === link.path;
                return (
                  <Link key={link.path} to={link.path} style={{ fontFamily: "'Manrope', sans-serif", fontSize: '16px', textDecoration: 'none', color: '#000', borderBottom: isActive ? '1px solid #000' : 'none', paddingBottom: '2px', letterSpacing: '0.05em', fontWeight: isActive ? 600 : 400 }}>
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Right actions */}
            <div className="desktop-only-flex" style={{ flex: '0 0 200px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>

              {/* Wishlist — always visible */}
              <button onClick={() => { if (user) { navigate('/wishlist'); } else { openAuthModal('login'); } }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                <Heart style={{ width: '20px', height: '20px', strokeWidth: 1.5 }} />
              </button>

              {/* Cart — only when logged in */}
              {user && (
                <CartDrawer>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '8px' }}>
                    <ShoppingCart style={{ width: '20px', height: '20px', strokeWidth: 1.5 }} />
                    {cartItemCount > 0 && (
                      <span style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#000', color: '#fff', fontSize: '9px', width: '15px', height: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {cartItemCount}
                      </span>
                    )}
                  </button>
                </CartDrawer>
              )}

              {user ? (
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}>
                    <User style={{ width: '20px', height: '20px', strokeWidth: 1.5 }} />
                  </button>

                  {/* Dropdown menu */}
                  {userMenuOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                      width: '220px', backgroundColor: '#fff', border: '1px solid #e4e4e7',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 999,
                    }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f4f4f5' }}>
                        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '13px', fontWeight: 600, margin: 0, color: '#000' }}>
                          {user.name || 'User'}
                        </p>
                        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: '#71717a', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.email}
                        </p>
                      </div>
                      <div style={{ padding: '4px 0' }}>
                        <button style={menuItemStyle} onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f4f4f5'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                          <UserCircle size={16} /> Profile
                        </button>
                        <button style={{ ...menuItemStyle, color: '#dc2626' }} onClick={handleLogout}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                          <LogOut size={16} /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => openAuthModal('login')}
                  style={{ background: '#000', color: '#fff', border: 'none', padding: '10px 24px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Login
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button className="mobile-only" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-only" style={{ borderTop: '1px solid #e4e4e7', backgroundColor: '#fff', padding: '16px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {navLinks.map(link => (
                <Link key={link.path} to={link.path} style={{ fontSize: '14px', textDecoration: 'none', color: '#000', fontFamily: "'Manrope', sans-serif" }} onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link to="/profile" style={{ fontSize: '14px', textDecoration: 'none', color: '#000', fontFamily: "'Manrope', sans-serif" }} onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                  <button style={{ fontSize: '14px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: "'Manrope', sans-serif" }} onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>Logout</button>
                </>
              ) : (
                <button style={{ fontSize: '14px', background: 'none', border: 'none', color: '#000', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: "'Manrope', sans-serif" }} onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }}>Login</button>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal open={showAuthModal} onClose={closeAuthModal} mode={authModalMode} onModeChange={setAuthModalMode} />
      <CompleteProfileModal open={showCompleteProfile} onClose={() => setShowCompleteProfile(false)} />
    </>
  );
};

export default Navigation;
