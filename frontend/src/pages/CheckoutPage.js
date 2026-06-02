import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, useAuth } from '../context/AppContext';
import { noirToast } from '../lib/noir-toast';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import CheckoutWizard from '../components/checkout/CheckoutWizard';

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
    return subtotal >= 2999 ? 0 : 199; // Updated threshold to match spec (2999)
  };

  const handlePlaceOrder = async (orderData) => {
    setProcessing(true);

    try {
      // Create Razorpay order
      const total = Math.round(orderData.total);
      const orderResponse = await axios.post(
        `${API}/payment/create-order?amount=${total}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { order_id, key_id } = orderResponse.data;

      // Check if Razorpay is available (test mode fallback)
      if (!window.Razorpay || key_id === 'test_key') {
        // Test mode - simulate successful payment
        await createOrder(order_id, 'test_payment_id', 'test_signature', orderData);
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
            response.razorpay_signature,
            orderData
          );
        },
        prefill: {
          name: orderData.shipping_address.name,
          email: user?.email || '',
          contact: orderData.shipping_address.phone
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

  const createOrder = async (razorpayOrderId, paymentId, signature, orderData) => {
    try {
      const backendOrderData = {
        items: cart.items,
        total: orderData.total,
        shipping_address: orderData.shipping_address,
        order_notes: orderData.order_notes,
        gift_wrap: orderData.gift_wrap,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      };

      const response = await axios.post(`${API}/orders`, backendOrderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOrderId(response.data.id);
      setOrderComplete(true);
      clearCart();
      toast.order('Order confirmed', 'Your payment was successful');
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
        <p className="font-mono text-muted-foreground uppercase tracking-widest text-xs">Loading checkout...</p>
      </div>
    );
  }

  // Order complete state
  if (orderComplete) {
    return (
      <div className="page-transition min-h-screen px-4 sm:px-6 lg:px-12 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <CheckCircle className="w-20 h-20 mx-auto mb-8 text-success" />
          </motion.div>
          <h1 className="font-heading text-4xl md:text-5xl tracking-tight mb-4">
            Order Confirmed
          </h1>
          <p className="font-body text-muted-foreground mb-2">
            Thank you for your purchase. A confirmation email has been sent to {user?.email}.
          </p>
          <p className="font-mono text-xs text-muted-foreground mb-12 uppercase tracking-wider">
            Order ID: {orderId}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              className="rounded-none font-mono text-xs tracking-widest uppercase h-12 px-8"
              onClick={() => navigate('/orders')}
            >
              View Orders
            </Button>
            <Button
              variant="outline"
              className="rounded-none font-mono text-xs tracking-widest uppercase h-12 px-8"
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
    <div className="page-transition min-h-screen bg-background">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 py-12 lg:py-24">
        <h1 className="font-heading text-4xl md:text-5xl tracking-tight mb-12">
          Checkout
        </h1>

        <CheckoutWizard
          cartItems={cart.items}
          products={products}
          subtotal={getSubtotal()}
          shipping={getShipping()}
          couponDiscount={0} // Stubs for future coupon integration
          processing={processing}
          onPlaceOrder={handlePlaceOrder}
        />
      </div>
    </div>
  );
};

export default CheckoutPage;
