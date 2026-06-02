import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AppContext';
import { noirToast as toast } from '../lib/noir-toast';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrdersPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    if (!token) {
      toast.error('Please login to view orders');
      navigate('/');
      return;
    }
    loadOrders();
  }, [token, navigate]);

  const loadOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
      const allProductIds = new Set();
      response.data.forEach(order => {
        order.items?.forEach(item => allProductIds.add(item.product_id));
      });
      if (allProductIds.size > 0) {
        const promises = [...allProductIds].map(id => 
          axios.get(`${API}/products/${id}`).catch(() => null)
        );
        const responses = await Promise.all(promises);
        const productsMap = {};
        responses.forEach(res => {
          if (res?.data) productsMap[res.data.id] = res.data;
        });
        setProducts(productsMap);
      }
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="page-transition min-h-screen flex items-center justify-center">
        <p className="mono-font text-zinc-500">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="page-transition min-h-screen px-6 md:px-12 lg:px-24 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="heading-font text-4xl md:text-6xl font-bold tracking-tight mb-12">My Orders</h1>
          <div className="text-center py-24 border border-zinc-200">
            <Package className="w-16 h-16 mx-auto mb-6 text-zinc-300" />
            <h2 className="heading-font text-2xl font-bold mb-2">No orders yet</h2>
            <p className="mono-font text-sm text-zinc-500 mb-8">Start shopping!</p>
            <Link to="/shop">
              <Button className="rounded-none bg-black text-white hover:bg-zinc-800 btn-noir">
                <ShoppingBag className="w-4 h-4 mr-2" />Start Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition min-h-screen px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="heading-font text-4xl md:text-6xl font-bold tracking-tight mb-12">My Orders</h1>
        <div className="space-y-4">
          {orders.map((order, idx) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }} className="border border-zinc-200">
              <div className="p-6 cursor-pointer hover:bg-zinc-50" onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <span className={`mono-font text-xs px-3 py-1 ${getStatusColor(order.status)}`}>{order.status?.toUpperCase()}</span>
                      <span className="mono-font text-xs text-zinc-500">{formatDate(order.created_at)}</span>
                    </div>
                    <p className="mono-font text-sm text-zinc-600">Order #{order.id?.slice(0, 8)}</p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="mono-font text-lg font-bold">₹{order.total?.toFixed(2)}</p>
                      <p className="mono-font text-xs text-zinc-500">{order.items?.length} items</p>
                    </div>
                    {expandedOrderId === order.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {expandedOrderId === order.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-zinc-200 p-6">
                      <h3 className="mono-font text-xs uppercase text-zinc-500 mb-4">Items</h3>
                      <div className="space-y-4 mb-6">
                        {order.items?.map((item, i) => {
                          const product = products[item.product_id];
                          return (
                            <div key={i} className="flex gap-4">
                              <img src={product?.images?.[0] || 'https://via.placeholder.com/80'} alt="" className="w-16 h-20 object-cover grayscale" />
                              <div className="flex-1">
                                <h4 className="body-font text-sm font-medium">{product?.name || 'Product'}</h4>
                                <p className="mono-font text-xs text-zinc-500">{item.size} / {item.color} × {item.quantity}</p>
                              </div>
                              <p className="mono-font text-sm">₹{((product?.price || 0) * item.quantity).toFixed(2)}</p>
                            </div>
                          );
                        })}
                      </div>
                      {order.shipping_address && (
                        <div>
                          <h3 className="mono-font text-xs uppercase text-zinc-500 mb-2">Shipping Address</h3>
                          <div className="body-font text-sm text-zinc-600">
                            <p>{order.shipping_address.name}</p>
                            <p>{order.shipping_address.address}</p>
                            <p>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.postalCode}</p>
                            <p>Phone: {order.shipping_address.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
