import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useCart, useAuth } from '../context/AppContext';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CheckoutPage = () => {
  const { cart, clearCart } = useCart();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    phone: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!token) {
      toast.error('Please login to checkout');
      navigate('/cart');
      return;
    }
    if (!cart.items || cart.items.length === 0) {
      navigate('/cart');
      return;
    }
    loadProducts();
  }, [token, cart.items, navigate]);

  const loadProducts = async () => {
    try {
      const productIds = [...new Set(cart.items.map(item => item.product_id))];
      const promises = productIds.map(id => axios.get(`${API}/products/${id}`));
      const responses = await Promise.all(promises);
      const productsMap = {};
      responses.forEach(res => {
        productsMap[res.data.id] = res.data;
      });
      setProducts(productsMap);
    } catch (error) {
      console.error('Load products error:', error);
      toast.error('Failed to load checkout');
    } finally {
      setLoading(false);
    }
  };

  const getSubtotal = () => {
    return cart.items.reduce((sum, item) => {
      const product = products[item.product_id];
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const getShipping = () => {
    const subtotal = getSubtotal();
    return subtotal > 5000 ? 0 : 199;
  };

  const getTotal = () => {
    return getSubtotal() + getShipping();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    } else if (!/^\d{6}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'Invalid postal code (6 digits required)';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number (10 digits required)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayment = async () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    setProcessing(true);

    try {
      // Create Razorpay order
      const total = Math.round(getTotal());
      const orderResponse = await axios.post(
        `${API}/payment/create-order?amount=${total}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { order_id, key_id } = orderResponse.data;

      // Check if Razorpay is available (test mode fallback)
      if (!window.Razorpay || key_id === 'test_key') {
        // Test mode - simulate successful payment
        await createOrder(order_id, 'test_payment_id', 'test_signature');
        return;
      }

      // Initialize Razorpay
      const options = {
        key: key_id,
        amount: total * 100,
        currency: 'INR',
        name: 'NOIR',
        description: 'Order Payment',
        order_id: order_id,
        handler: async function (response) {
          await createOrder(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
        },
        prefill: {
          name: formData.name,
          email: user?.email || '',
          contact: formData.phone
        },
        theme: {
          color: '#000000'
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            toast.error('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  const createOrder = async (razorpayOrderId, paymentId, signature) => {
    try {
      const orderData = {
        items: cart.items,
        total: getTotal(),
        shipping_address: formData,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      };

      const response = await axios.post(`${API}/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOrderId(response.data.id);
      setOrderComplete(true);
      clearCart();
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error('Create order error:', error);
      toast.error('Failed to create order. Please contact support.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="page-transition min-h-screen flex items-center justify-center">
        <p className="mono-font text-zinc-500">Loading checkout...</p>
      </div>
    );
  }

  // Order complete state
  if (orderComplete) {
    return (
      <div className="page-transition min-h-screen px-6 md:px-12 lg:px-24 py-12">
        <div className="max-w-2xl mx-auto text-center py-24">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <CheckCircle className="w-24 h-24 mx-auto mb-8 text-green-600" />
          </motion.div>
          <h1 className="heading-font text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Order Confirmed!
          </h1>
          <p className="mono-font text-zinc-500 mb-2">
            Thank you for your purchase.
          </p>
          <p className="mono-font text-sm text-zinc-400 mb-8">
            Order ID: {orderId}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              className="rounded-none bg-black text-white hover:bg-zinc-800 btn-noir"
              onClick={() => navigate('/orders')}
            >
              View Orders
            </Button>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => navigate('/shop')}
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition min-h-screen px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="heading-font text-4xl md:text-6xl font-bold tracking-tight mb-12">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Shipping Form */}
          <div>
            <h2 className="heading-font text-2xl font-bold mb-6">Shipping Address</h2>
            <div className="space-y-4">
              <div>
                <Label className="mono-font text-xs tracking-wider uppercase mb-2 block">
                  Full Name *
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`rounded-none ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="John Doe"
                  data-testid="checkout-name"
                />
                {errors.name && (
                  <p className="mono-font text-xs text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label className="mono-font text-xs tracking-wider uppercase mb-2 block">
                  Address *
                </Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={`rounded-none ${errors.address ? 'border-red-500' : ''}`}
                  placeholder="123 Main Street, Apt 4B"
                  data-testid="checkout-address"
                />
                {errors.address && (
                  <p className="mono-font text-xs text-red-500 mt-1">{errors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mono-font text-xs tracking-wider uppercase mb-2 block">
                    City *
                  </Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={`rounded-none ${errors.city ? 'border-red-500' : ''}`}
                    placeholder="Mumbai"
                    data-testid="checkout-city"
                  />
                  {errors.city && (
                    <p className="mono-font text-xs text-red-500 mt-1">{errors.city}</p>
                  )}
                </div>
                <div>
                  <Label className="mono-font text-xs tracking-wider uppercase mb-2 block">
                    State *
                  </Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className={`rounded-none ${errors.state ? 'border-red-500' : ''}`}
                    placeholder="Maharashtra"
                    data-testid="checkout-state"
                  />
                  {errors.state && (
                    <p className="mono-font text-xs text-red-500 mt-1">{errors.state}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mono-font text-xs tracking-wider uppercase mb-2 block">
                    Postal Code *
                  </Label>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    className={`rounded-none ${errors.postalCode ? 'border-red-500' : ''}`}
                    placeholder="400001"
                    maxLength={6}
                    data-testid="checkout-postal"
                  />
                  {errors.postalCode && (
                    <p className="mono-font text-xs text-red-500 mt-1">{errors.postalCode}</p>
                  )}
                </div>
                <div>
                  <Label className="mono-font text-xs tracking-wider uppercase mb-2 block">
                    Phone *
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`rounded-none ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="9876543210"
                    maxLength={10}
                    data-testid="checkout-phone"
                  />
                  {errors.phone && (
                    <p className="mono-font text-xs text-red-500 mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <h2 className="heading-font text-2xl font-bold mb-6">Order Summary</h2>
            <div className="border border-zinc-200 p-6">
              {/* Items */}
              <div className="space-y-4 mb-6">
                {cart.items.map((item, idx) => {
                  const product = products[item.product_id];
                  if (!product) return null;

                  return (
                    <div key={idx} className="flex gap-4">
                      <img
                        src={product.images?.[0] || 'https://via.placeholder.com/80'}
                        alt={product.name}
                        className="w-16 h-20 object-cover grayscale"
                      />
                      <div className="flex-1">
                        <h4 className="body-font text-sm font-medium">{product.name}</h4>
                        <p className="mono-font text-xs text-zinc-500">
                          {item.size} / {item.color} × {item.quantity}
                        </p>
                      </div>
                      <p className="mono-font text-sm font-medium">
                        ₹{(product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="border-t border-zinc-200 pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="body-font text-zinc-600">Subtotal</span>
                  <span className="mono-font">₹{getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="body-font text-zinc-600">Shipping</span>
                  <span className="mono-font">
                    {getShipping() === 0 ? 'FREE' : `₹${getShipping().toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-3">
                  <span className="heading-font text-lg font-bold">Total</span>
                  <span className="mono-font text-xl font-bold">₹{getTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Pay Button */}
              <Button
                className="w-full mt-6 rounded-none bg-black text-white hover:bg-zinc-800 btn-noir"
                onClick={handlePayment}
                disabled={processing}
                data-testid="pay-btn"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ₹${getTotal().toFixed(2)}`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
