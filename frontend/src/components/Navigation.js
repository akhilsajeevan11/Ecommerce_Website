import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, User, Menu, X, LogOut, Package } from 'lucide-react';
import { useAuth, useCart } from '../context/AppContext';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import AuthModal from './AuthModal';
import CartDrawer from './CartDrawer';

const Navigation = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/shop', label: 'Shop' },
  ];

  const handleAuth = (mode) => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px'
          }}>
            {/* Logo - Left */}
            <div style={{ flex: '1 1 0%' }}>
              <Link 
                to="/" 
                data-testid="logo-link" 
                className="heading-font"
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  letterSpacing: '-0.5px',
                  textDecoration: 'none',
                  color: '#000000'
                }}
              >
                NOIR
              </Link>
            </div>

            {/* Center Menu - Desktop */}
            <div className="desktop-only-flex" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px'
            }}>
              {navLinks.map(link => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    data-testid={`nav-${link.label.toLowerCase()}`}
                    className="body-font"
                    style={{
                      fontSize: '14px',
                      textDecoration: 'none',
                      color: '#000000',
                      borderBottom: isActive ? '1px solid #000000' : 'none',
                      paddingBottom: '2px'
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Right Actions - Desktop */}
            <div className="desktop-only-flex" style={{
              flex: '1 1 0%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '16px'
            }}>
              <CartDrawer>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '8px'
                  }}
                  data-testid="cart-btn"
                >
                  <ShoppingCart style={{ width: '20px', height: '20px' }} />
                  {cartItemCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '0',
                      right: '0',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      fontSize: '10px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}>
                      {cartItemCount}
                    </span>
                  )}
                </button>
              </CartDrawer>

              {user ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px'
                      }}
                      data-testid="user-menu-btn"
                    >
                      <User style={{ width: '20px', height: '20px' }} />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <div className="mt-8 space-y-4">
                      <div className="border-b border-gray-200 pb-4">
                        <p className="body-font text-sm text-gray-500">Signed in as</p>
                        <p className="font-medium truncate">{user.email}</p>
                      </div>
                      <div className="space-y-2">
                        <Button variant="ghost" className="w-full justify-start rounded-none" onClick={() => navigate('/wishlist')}>
                          <Heart className="w-4 h-4 mr-2" /> Wishlist
                        </Button>
                        <Button variant="ghost" className="w-full justify-start rounded-none" onClick={() => navigate('/orders')}>
                          <Package className="w-4 h-4 mr-2" /> Orders
                        </Button>
                        {user.is_admin && (
                          <Button variant="ghost" className="w-full justify-start rounded-none" onClick={() => navigate('/admin')} data-testid="admin-panel-btn">
                            Admin Panel
                          </Button>
                        )}
                        <Button variant="ghost" className="w-full justify-start rounded-none text-red-600" onClick={handleLogout} data-testid="logout-btn">
                          <LogOut className="w-4 h-4 mr-2" /> Logout
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : (
                <button 
                  style={{
                    background: '#000000',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 20px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                  onClick={() => handleAuth('login')} 
                  data-testid="login-btn"
                >
                  Login
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button 
              className="mobile-only"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              data-testid="mobile-menu-btn"
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '8px' 
              }}
            >
              {mobileMenuOpen ? (
                <X style={{ width: '24px', height: '24px' }} />
              ) : (
                <Menu style={{ width: '24px', height: '24px' }} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-only" style={{ 
            borderTop: '1px solid #e4e4e7', 
            backgroundColor: '#ffffff', 
            padding: '16px 24px' 
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {navLinks.map(link => (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  className="body-font" 
                  style={{ 
                    fontSize: '14px', 
                    textDecoration: 'none', 
                    color: '#000000' 
                  }} 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link to="/wishlist" className="body-font" style={{ fontSize: '14px', textDecoration: 'none', color: '#000000' }} onClick={() => setMobileMenuOpen(false)}>Wishlist</Link>
                  <Link to="/orders" className="body-font" style={{ fontSize: '14px', textDecoration: 'none', color: '#000000' }} onClick={() => setMobileMenuOpen(false)}>Orders</Link>
                  {user.is_admin && (
                    <Link to="/admin" className="body-font" style={{ fontSize: '14px', textDecoration: 'none', color: '#000000' }} onClick={() => setMobileMenuOpen(false)}>Admin</Link>
                  )}
                  <button className="body-font" style={{ fontSize: '14px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>Logout</button>
                </>
              ) : (
                <button className="body-font" style={{ fontSize: '14px', background: 'none', border: 'none', color: '#000000', cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => { handleAuth('login'); setMobileMenuOpen(false); }}>Login</button>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} mode={authMode} onModeChange={setAuthMode} />
    </>
  );
};

export default Navigation;
