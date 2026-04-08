import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Package, Plus, ClipboardList, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AppContext';
import { USE_MOCK } from '../data/adminMockData';
import { toast } from 'sonner';

const NAV_LINKS = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: BarChart3 },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Product Stock', path: '/admin/stock', icon: ClipboardList },
  { label: 'Dead Stock', path: '/admin/dead-stock', icon: AlertTriangle },
  { label: 'Add Product', path: '/admin/products/add', icon: Plus },
];

const AdminLayout = () => {
  const location = useLocation();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!USE_MOCK && (!token || !user?.is_admin)) {
      toast.error('Admin access required');
      navigate('/');
    }
  }, [token, user, navigate]);

  if (!USE_MOCK && (!token || !user?.is_admin)) {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: 240,
        minWidth: 240,
        backgroundColor: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 0',
      }}>
        <div className="heading-font" style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          padding: '0 1.5rem',
          marginBottom: '2rem',
        }}>
          NOIR ADMIN
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {NAV_LINKS.map(({ label, path, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 1.5rem',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  backgroundColor: isActive ? '#fff' : 'transparent',
                  color: isActive ? '#000' : '#a1a1aa',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#fff' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
