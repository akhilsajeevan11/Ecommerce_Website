import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from './context/AppContext';
import { Toaster } from 'sonner';
import Navigation from './components/Navigation';
import './App.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const AdminLayout = lazy(() => import('./pages/AdminPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/AdminProductsPage'));
const AdminAddProductPage = lazy(() => import('./pages/AdminAddProductPage'));
const AdminProductStockPage = lazy(() => import('./pages/AdminProductStockPage'));
const AdminDeadStockPage = lazy(() => import('./pages/AdminDeadStockPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SocialAuthCallback = lazy(() => import('./pages/SocialAuthCallback'));

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="text-center">
      <h1 className="heading-font text-6xl font-bold tracking-tight mb-4">NOIR</h1>
      <div className="w-16 h-0.5 bg-black mx-auto animate-pulse"></div>
    </div>
  </div>
);

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <div className="App">
          <div className="noise-overlay"></div>
          <Navigation />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ProductListPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/social-auth-callback" element={<SocialAuthCallback />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="products/add" element={<AdminAddProductPage />} />
                <Route path="stock" element={<AdminProductStockPage />} />
                <Route path="dead-stock" element={<AdminDeadStockPage />} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
