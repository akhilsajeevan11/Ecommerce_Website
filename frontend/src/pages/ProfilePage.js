import React, { useState, useEffect, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useAuth, useWishlist } from '../context/AppContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { noirToast as toast } from '../lib/noir-toast';
import axios from 'axios';
import {
  User, Mail, Phone, Calendar, Lock, Pencil, Check, X,
  MapPin, Plus, Trash2, Edit2, Package, Heart, ShoppingBag, Star as StarDefault,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import ProductCard from '../components/ProductCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/* ─── Tab IDs ─────────────────────────────────────────────── */
const TABS = ['profile', 'orders', 'addresses', 'wishlist'];

/* ─── ProfileTab ─────────────────────────────────────────── */
const ProfileTab = ({ user }) => {
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (field, currentValue) => {
    setEditing(field);
    setEditValue(currentValue || '');
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const saveEdit = () => {
    // UI only — no backend update in this spec
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
    <div className="max-w-lg">
      <div className="flex flex-col divide-y divide-zinc-100">
        {fields.map(({ key, label, icon: Icon, value, editable }) => (
          <div key={key} className="flex items-start gap-3 py-5">
            <div className="pt-0.5">
              <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {label}
              </p>
              {editing === key ? (
                <div className="flex items-center gap-2">
                  <input
                    type={key === 'dob' ? 'date' : 'text'}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 py-2 border-b-2 border-foreground bg-transparent font-body text-sm text-foreground outline-none"
                    autoFocus
                    aria-label={`Edit ${label}`}
                  />
                  <button
                    onClick={saveEdit}
                    className="p-1 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Save"
                  >
                    <Check className="w-4 h-4 text-foreground" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Cancel"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="font-body text-sm text-foreground py-2">{value}</p>
                  {editable && (
                    <button
                      onClick={() => startEdit(key, value === 'Not provided' ? '' : value)}
                      className="p-1 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Edit ${label}`}
                    >
                      <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                  )}
                </div>
              )}
              {key === 'email' && (
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  Email cannot be changed
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reset Password */}
      <div className="mt-10 pt-6 border-t border-border">
        <button
          onClick={() => toast.info('Password reset coming soon')}
          className="flex items-center gap-2 w-full py-3.5 font-body text-sm font-medium text-foreground hover:text-zinc-600 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Lock className="w-4 h-4 text-zinc-400" />
          Reset Password
        </button>
      </div>
    </div>
  );
};

/* ─── OrdersTab ──────────────────────────────────────────── */
const OrdersTab = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await axios.get(`${API}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data);
        const ids = new Set();
        res.data.forEach((o) => o.items?.forEach((i) => ids.add(i.product_id)));
        if (ids.size > 0) {
          const responses = await Promise.all(
            [...ids].map((id) => axios.get(`${API}/products/${id}`).catch(() => null))
          );
          const map = {};
          responses.forEach((r) => { if (r?.data) map[r.data.id] = r.data; });
          setProducts(map);
        }
      } catch {
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const statusClass = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-zinc-100 text-zinc-800';
    }
  };

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="font-mono text-sm text-muted-foreground">Loading orders…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center border border-border">
        <Package className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
        <h3 className="font-heading text-xl font-bold mb-1">No orders yet</h3>
        <p className="font-mono text-sm text-muted-foreground mb-6">Start shopping to see your orders here.</p>
        <Link to="/shop">
          <Button className="rounded-none bg-black text-white hover:bg-zinc-800">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="border border-border">
          <button
            className="w-full flex items-center justify-between p-5 hover:bg-zinc-50 transition-colors text-left focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
            aria-expanded={expandedId === order.id}
          >
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`font-mono text-[10px] px-2.5 py-0.5 ${statusClass(order.status)}`}>
                  {order.status?.toUpperCase()}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{fmtDate(order.created_at)}</span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">Order #{order.id?.slice(0, 8)}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-base font-bold">₹{order.total?.toFixed(2)}</p>
              <p className="font-mono text-xs text-muted-foreground">{order.items?.length} items</p>
            </div>
          </button>

          {expandedId === order.id && (
            <div className="border-t border-border p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Items</p>
              <div className="space-y-3 mb-5">
                {order.items?.map((item, i) => {
                  const product = products[item.product_id];
                  return (
                    <div key={i} className="flex gap-3">
                      <img
                        src={product?.images?.[0] || 'https://via.placeholder.com/64'}
                        alt={product?.name || 'Product'}
                        className="w-14 h-18 object-cover grayscale shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium truncate">{product?.name || 'Product'}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {item.size} / {item.color} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-mono text-sm shrink-0">
                        ₹{((product?.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
              {order.shipping_address && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Shipping Address
                  </p>
                  <div className="font-body text-sm text-zinc-600 space-y-0.5">
                    <p>{order.shipping_address.name}</p>
                    <p>{order.shipping_address.address}</p>
                    <p>
                      {order.shipping_address.city}, {order.shipping_address.state} –{' '}
                      {order.shipping_address.postalCode}
                    </p>
                    <p>Phone: {order.shipping_address.phone}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ─── AddressesTab — real backend ────────────────────────── */
const EMPTY_FORM = { name: '', phone: '', address: '', city: '', state: '', postalCode: '' };

const AddressesTab = ({ token }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  const fetchAddresses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAddresses(res.data || []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (addr) => {
    setEditingId(addr.id);
    setForm({
      name: addr.name || '',
      phone: addr.phone || '',
      address: addr.address || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.phone.trim()) errors.phone = 'Phone is required';
    if (!form.address.trim()) errors.address = 'Address is required';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.state.trim()) errors.state = 'State is required';
    if (!form.postalCode.trim()) errors.postalCode = 'Postal code is required';
    return errors;
  };

  const handleSave = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${API}/addresses/${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Address updated');
      } else {
        await axios.post(`${API}/addresses`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Address saved');
      }
      closeForm();
      await fetchAddresses();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to save address';
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/addresses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.cartRemove('Address removed');
      setConfirmDeleteId(null);
      await fetchAddresses();
    } catch {
      toast.error('Failed to remove address');
      setConfirmDeleteId(null);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await axios.put(`${API}/addresses/${id}/default`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchAddresses();
    } catch {
      toast.error('Failed to set default address');
    }
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="font-mono text-sm text-muted-foreground">Loading addresses…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {addresses.length === 0 && !showForm && (
        <div className="py-16 text-center border border-border">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
          <h3 className="font-heading text-xl font-bold mb-1">No saved addresses</h3>
          <p className="font-mono text-sm text-muted-foreground mb-6">
            Add an address to speed up checkout.
          </p>
        </div>
      )}

      {addresses.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`border p-4 flex flex-col gap-2 ${
                addr.is_default ? 'border-foreground' : 'border-border'
              }`}
            >
              {/* ── Inline delete confirmation ── */}
              {confirmDeleteId === addr.id ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <Trash2 className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
                        Remove address?
                      </p>
                      <p className="font-body text-sm text-muted-foreground mt-0.5">
                        {addr.address}, {addr.city}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="px-3 py-1.5 bg-destructive text-white font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Yes, remove
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 border border-border font-mono text-[10px] uppercase tracking-widest hover:border-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="font-body text-sm font-medium">{addr.name}</span>
                      {addr.is_default && (
                        <span className="font-mono text-[9px] uppercase tracking-widest bg-foreground text-background px-1.5 py-0.5">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!addr.is_default && (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="p-1.5 hover:bg-zinc-100 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Set ${addr.name}'s address as default`}
                          title="Set as default"
                        >
                          <StarDefault className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(addr)}
                        className="p-1.5 hover:bg-zinc-100 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Edit address for ${addr.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(addr.id)}
                        className="p-1.5 hover:bg-zinc-100 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Delete address for ${addr.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground space-y-0.5 pl-6">
                    <p>{addr.address}</p>
                    <p>{addr.city}, {addr.state} – {addr.postalCode}</p>
                    {addr.phone && <p>Phone: {addr.phone}</p>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="border border-border p-5 space-y-4">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {editingId ? 'Edit Address' : 'New Address'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="addr-name" className="font-mono text-[10px] uppercase tracking-widest mb-1.5 block">Full Name *</Label>
              <Input id="addr-name" value={form.name} onChange={(e) => setField('name', e.target.value)} className={`rounded-none ${formErrors.name ? 'border-destructive' : ''}`} placeholder="Jane Doe" />
              {formErrors.name && <p className="font-mono text-[10px] text-destructive mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <Label htmlFor="addr-phone" className="font-mono text-[10px] uppercase tracking-widest mb-1.5 block">Phone *</Label>
              <Input id="addr-phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={`rounded-none ${formErrors.phone ? 'border-destructive' : ''}`} placeholder="9876543210" maxLength={10} />
              {formErrors.phone && <p className="font-mono text-[10px] text-destructive mt-1">{formErrors.phone}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="addr-street" className="font-mono text-[10px] uppercase tracking-widest mb-1.5 block">Address *</Label>
            <Input id="addr-street" value={form.address} onChange={(e) => setField('address', e.target.value)} className={`rounded-none ${formErrors.address ? 'border-destructive' : ''}`} placeholder="123 Main Street, Apt 4B" />
            {formErrors.address && <p className="font-mono text-[10px] text-destructive mt-1">{formErrors.address}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="addr-city" className="font-mono text-[10px] uppercase tracking-widest mb-1.5 block">City *</Label>
              <Input id="addr-city" value={form.city} onChange={(e) => setField('city', e.target.value)} className={`rounded-none ${formErrors.city ? 'border-destructive' : ''}`} placeholder="Mumbai" />
              {formErrors.city && <p className="font-mono text-[10px] text-destructive mt-1">{formErrors.city}</p>}
            </div>
            <div>
              <Label htmlFor="addr-state" className="font-mono text-[10px] uppercase tracking-widest mb-1.5 block">State *</Label>
              <Input id="addr-state" value={form.state} onChange={(e) => setField('state', e.target.value)} className={`rounded-none ${formErrors.state ? 'border-destructive' : ''}`} placeholder="Maharashtra" />
              {formErrors.state && <p className="font-mono text-[10px] text-destructive mt-1">{formErrors.state}</p>}
            </div>
            <div>
              <Label htmlFor="addr-postal" className="font-mono text-[10px] uppercase tracking-widest mb-1.5 block">Postal Code *</Label>
              <Input id="addr-postal" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} className={`rounded-none ${formErrors.postalCode ? 'border-destructive' : ''}`} placeholder="400001" maxLength={6} />
              {formErrors.postalCode && <p className="font-mono text-[10px] text-destructive mt-1">{formErrors.postalCode}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="rounded-none bg-black text-white hover:bg-zinc-800 font-mono text-xs uppercase tracking-widest disabled:opacity-60">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Address'}
            </Button>
            <Button variant="outline" onClick={closeForm} disabled={saving} className="rounded-none font-mono text-xs uppercase tracking-widest">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button variant="outline" onClick={openAdd} className="rounded-none font-mono text-xs uppercase tracking-widest">
          <Plus className="w-4 h-4 mr-2" />
          Add Address
        </Button>
      )}
    </div>
  );
};

/* ─── WishlistTab — inline wishlist items ────────────────── */
const WishlistTab = ({ token }) => {
  const { wishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ids = wishlist?.items || [];
      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      try {
        const responses = await Promise.all(
          ids.map((id) => axios.get(`${API}/products/${id}`).catch(() => null))
        );
        if (!cancelled) {
          setProducts(responses.filter((r) => r?.data).map((r) => r.data));
        }
      } catch {
        // silent — just show empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [wishlist.items]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="font-mono text-sm text-muted-foreground">Loading wishlist…</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-16 text-center border border-border">
        <Heart className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
        <h3 className="font-heading text-xl font-bold mb-1">No saved items</h3>
        <p className="font-mono text-sm text-muted-foreground mb-6">
          Heart a product to save it here.
        </p>
        <Link to="/shop">
          <Button className="rounded-none bg-black text-white hover:bg-zinc-800 font-mono text-xs uppercase tracking-widest">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Browse Products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          {products.length} saved {products.length === 1 ? 'item' : 'items'}
        </p>
        <Link
          to="/wishlist"
          className="font-mono text-xs uppercase tracking-widest text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity"
        >
          View full wishlist →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

/* ─── ProfilePage ────────────────────────────────────────── */
const ProfilePage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive active tab from URL; default to 'profile'
  const rawTab = searchParams.get('tab');
  const activeTab = TABS.includes(rawTab) ? rawTab : 'profile';

  const handleTabChange = (value) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-muted-foreground">Please login to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-12">
      <div className="max-w-screen-lg mx-auto">

        {/* Page header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-foreground text-background flex items-center justify-center mb-4 font-heading text-3xl font-bold select-none">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {user.name || 'User'}
          </h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">{user.email}</p>
        </div>

        {/* Radix Tabs */}
        <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
          {/* Tab list */}
          <Tabs.List
            className="flex border-b border-border mb-8 overflow-x-auto"
            aria-label="Profile sections"
          >
            {[
              { value: 'profile', label: 'Profile' },
              { value: 'orders', label: 'Orders' },
              { value: 'addresses', label: 'Addresses' },
              { value: 'wishlist', label: 'Wishlist' },
            ].map(({ value, label }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="
                  shrink-0 px-5 py-3 font-mono text-xs uppercase tracking-widest
                  text-muted-foreground border-b-2 border-transparent -mb-px
                  transition-colors duration-150
                  hover:text-foreground
                  data-[state=active]:border-foreground data-[state=active]:text-foreground
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                "
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* Tab panels */}
          <Tabs.Content value="profile" className="outline-none">
            <ProfileTab user={user} />
          </Tabs.Content>

          <Tabs.Content value="orders" className="outline-none">
            <OrdersTab token={token} />
          </Tabs.Content>

          <Tabs.Content value="addresses" className="outline-none">
            <AddressesTab token={token} />
          </Tabs.Content>

          <Tabs.Content value="wishlist" className="outline-none">
            <WishlistTab token={token} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
};

export default ProfilePage;
