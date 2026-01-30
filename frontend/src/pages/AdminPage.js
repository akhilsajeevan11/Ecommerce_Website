import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AppContext';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Package, ShoppingCart, X, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', category: '',
    sizes: 'S,M,L,XL', colors: 'Black,White', images: '', stock: '100'
  });

  useEffect(() => {
    if (!token || !user?.is_admin) {
      toast.error('Admin access required');
      navigate('/');
      return;
    }
    loadData();
  }, [token, user, navigate]);

  const loadData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category: productForm.category,
        sizes: productForm.sizes.split(',').map(s => s.trim()),
        colors: productForm.colors.split(',').map(c => c.trim()),
        images: productForm.images.split(',').map(i => i.trim()).filter(Boolean),
        stock: parseInt(productForm.stock)
      };
      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Product updated');
      } else {
        await axios.post(`${API}/products`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Product created');
      }
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name, description: product.description,
      price: product.price.toString(), category: product.category,
      sizes: product.sizes?.join(',') || '', colors: product.colors?.join(',') || '',
      images: product.images?.join(',') || '', stock: product.stock?.toString() || '100'
    });
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`${API}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Product deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}/status?status=${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Order status updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm({
      name: '', description: '', price: '', category: '',
      sizes: 'S,M,L,XL', colors: 'Black,White', images: '', stock: '100'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-zinc-100 text-zinc-800';
    }
  };

  if (loading) {
    return (
      <div className="page-transition min-h-screen flex items-center justify-center">
        <p className="mono-font text-zinc-500">Loading admin panel...</p>
      </div>
    );
  }

  if (!user?.is_admin) {
    return (
      <div className="page-transition min-h-screen px-6 md:px-12 lg:px-24 py-12">
        <div className="max-w-4xl mx-auto text-center py-24">
          <h1 className="heading-font text-4xl font-bold mb-4">Access Denied</h1>
          <p className="mono-font text-zinc-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition min-h-screen px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="heading-font text-4xl md:text-6xl font-bold tracking-tight mb-12">Admin Panel</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="rounded-none mb-8">
            <TabsTrigger value="products" className="rounded-none">
              <Package className="w-4 h-4 mr-2" />Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-none">
              <ShoppingCart className="w-4 h-4 mr-2" />Orders ({orders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <div className="flex justify-between items-center mb-6">
              <h2 className="heading-font text-2xl font-bold">Products</h2>
              <Button onClick={() => setShowProductForm(true)} className="rounded-none bg-black text-white hover:bg-zinc-800">
                <Plus className="w-4 h-4 mr-2" />Add Product
              </Button>
            </div>

            {showProductForm && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="border border-zinc-200 p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="heading-font text-xl font-bold">
                    {editingProduct ? 'Edit Product' : 'New Product'}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
                </div>
                <form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mono-font text-xs uppercase mb-2 block">Name *</Label>
                    <Input value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                      className="rounded-none" required />
                  </div>
                  <div>
                    <Label className="mono-font text-xs uppercase mb-2 block">Category *</Label>
                    <Input value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                      className="rounded-none" required placeholder="e.g., T-Shirt, Jacket" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mono-font text-xs uppercase mb-2 block">Description *</Label>
                    <textarea value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                      className="w-full min-h-[80px] p-3 border border-zinc-200 rounded-none" required />
                  </div>
                  <div>
                    <Label className="mono-font text-xs uppercase mb-2 block">Price (₹) *</Label>
                    <Input type="number" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                      className="rounded-none" required min="0" step="0.01" />
                  </div>
                  <div>
                    <Label className="mono-font text-xs uppercase mb-2 block">Stock *</Label>
                    <Input type="number" value={productForm.stock} onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                      className="rounded-none" required min="0" />
                  </div>
                  <div>
                    <Label className="mono-font text-xs uppercase mb-2 block">Sizes (comma-separated)</Label>
                    <Input value={productForm.sizes} onChange={(e) => setProductForm({...productForm, sizes: e.target.value})}
                      className="rounded-none" placeholder="S,M,L,XL" />
                  </div>
                  <div>
                    <Label className="mono-font text-xs uppercase mb-2 block">Colors (comma-separated)</Label>
                    <Input value={productForm.colors} onChange={(e) => setProductForm({...productForm, colors: e.target.value})}
                      className="rounded-none" placeholder="Black,White" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mono-font text-xs uppercase mb-2 block">Image URLs (comma-separated)</Label>
                    <Input value={productForm.images} onChange={(e) => setProductForm({...productForm, images: e.target.value})}
                      className="rounded-none" placeholder="https://..." />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" className="rounded-none bg-black text-white hover:bg-zinc-800" disabled={saving}>
                      {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : (editingProduct ? 'Update Product' : 'Create Product')}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="border border-zinc-200">
              <table className="w-full">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="mono-font text-xs uppercase text-left p-4">Product</th>
                    <th className="mono-font text-xs uppercase text-left p-4">Category</th>
                    <th className="mono-font text-xs uppercase text-left p-4">Price</th>
                    <th className="mono-font text-xs uppercase text-left p-4">Stock</th>
                    <th className="mono-font text-xs uppercase text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-t border-zinc-200">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={product.images?.[0] || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 object-cover grayscale" />
                          <span className="body-font text-sm">{product.name}</span>
                        </div>
                      </td>
                      <td className="p-4 mono-font text-sm text-zinc-500">{product.category}</td>
                      <td className="p-4 mono-font text-sm">₹{product.price?.toFixed(2)}</td>
                      <td className="p-4 mono-font text-sm">{product.stock}</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <h2 className="heading-font text-2xl font-bold mb-6">Orders</h2>
            <div className="border border-zinc-200">
              <table className="w-full">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="mono-font text-xs uppercase text-left p-4">Order ID</th>
                    <th className="mono-font text-xs uppercase text-left p-4">Customer</th>
                    <th className="mono-font text-xs uppercase text-left p-4">Total</th>
                    <th className="mono-font text-xs uppercase text-left p-4">Status</th>
                    <th className="mono-font text-xs uppercase text-left p-4">Date</th>
                    <th className="mono-font text-xs uppercase text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-t border-zinc-200">
                      <td className="p-4 mono-font text-sm">#{order.id?.slice(0, 8)}</td>
                      <td className="p-4 body-font text-sm">{order.shipping_address?.name || 'N/A'}</td>
                      <td className="p-4 mono-font text-sm">₹{order.total?.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`mono-font text-xs px-2 py-1 ${getStatusColor(order.status)}`}>
                          {order.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 mono-font text-xs text-zinc-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <Select value={order.status} onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}>
                          <SelectTrigger className="w-32 rounded-none text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;
