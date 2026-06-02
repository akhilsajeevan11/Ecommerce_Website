import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Package, Plus, ClipboardList, AlertTriangle, Settings } from 'lucide-react';
import { useAuth } from '../../context/AppContext';
import { isAdminSubdomain } from '../../utils/subdomain';
import { noirToast as toast } from '../../lib/noir-toast';

// Paths differ based on whether we're on admin subdomain or customer site
const getNavLinks = () => {
  const prefix = isAdminSubdomain() ? '' : '/admin';
  return [
    { label: 'Dashboard', path: `${prefix}/dashboard`, icon: BarChart3 },
    { label: 'Products', path: `${prefix}/products`, icon: Package },
    { label: 'Product Stock', path: `${prefix}/stock`, icon: ClipboardList },
    { label: 'Dead Stock', path: `${prefix}/dead-stock`, icon: AlertTriangle },
    { label: 'Add Product', path: `${prefix}/products/add`, icon: Plus },
    { label: 'Site Settings', path: `${prefix}/site-settings`, icon: Settings },
  ];
};

const AdminLayout = () => {
  const location = useLocation();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !user?.is_admin) {
      toast.error('Admin access required');
      navigate('/');
    }
  }, [token, user, navigate]);

  if (!token || !user?.is_admin) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-14 lg:w-60 min-w-[3.5rem] lg:min-w-[15rem] bg-black text-white flex flex-col shrink-0 transition-all duration-200">
        {/* Brand */}
        <div className="font-heading text-base lg:text-lg font-bold tracking-[0.05em] px-3 lg:px-6 py-6 lg:py-8 border-b border-zinc-800 overflow-hidden">
          <span className="hidden lg:inline">NOIR ADMIN</span>
          <span className="lg:hidden text-sm">NA</span>
        </div>

        <div className="flex flex-col gap-0.5 py-4 flex-1">
          {getNavLinks().map(({ label, path, icon: Icon }) => {
            const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
            return (
              <Link
                key={path}
                to={path}
                title={label}
                className={`flex items-center gap-3 px-3 lg:px-6 py-3 text-sm font-medium transition-colors no-underline ${
                  isActive
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span className="hidden lg:inline truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-white min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
