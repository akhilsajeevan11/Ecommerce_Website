import React, { useState, useEffect } from 'react';
import StepIndicator from './StepIndicator';
import AddressBookSelector from './AddressBookSelector';
import OrderSummary from './OrderSummary';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { track } from '../../lib/analytics';
import { Loader2 } from 'lucide-react';

/**
 * CheckoutWizard — Orchestrates the multi-step checkout flow.
 * 
 * @param {object} props
 * @param {Array} props.cartItems
 * @param {Record<string, object>} props.products
 * @param {number} props.subtotal
 * @param {number} props.shipping
 * @param {number} props.couponDiscount
 * @param {boolean} props.processing - if the parent is processing the order
 * @param {(orderData: object) => void} props.onPlaceOrder - called on final step
 * @returns {JSX.Element}
 */
const CheckoutWizard = ({
  cartItems = [],
  products = {},
  subtotal = 0,
  shipping = 0,
  couponDiscount = 0,
  processing = false,
  onPlaceOrder,
}) => {
  const [currentStep, setCurrentStep] = useState(0); // 0: Shipping, 1: Payment, 2: Review

  // --- Shipping State ---
  // Mock saved addresses since backend is not connected for this in current spec
  const [savedAddresses] = useState([
    {
      id: 'addr_1',
      name: 'John Doe',
      address: '456 Palm Grove Road, Apt 3',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      phone: '9876543210'
    }
  ]);
  const [selectedAddress, setSelectedAddress] = useState(savedAddresses[0] || null);
  const [newAddressForm, setNewAddressForm] = useState({
    name: '', address: '', city: '', state: '', postalCode: '', phone: ''
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [orderNotes, setOrderNotes] = useState('');
  const [giftWrap, setGiftWrap] = useState(false);

  // --- Payment State ---
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  // Derived totals
  const total = subtotal - couponDiscount + shipping + (giftWrap ? 49 : 0);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // --- Validation ---
  const validateShipping = () => {
    // If an existing address is selected, it's valid
    if (selectedAddress) return true;

    // Validate new address form
    const errors = {};
    if (!newAddressForm.name.trim()) errors.name = 'Name is required';
    if (!newAddressForm.address.trim()) errors.address = 'Address is required';
    if (!newAddressForm.city.trim()) errors.city = 'City is required';
    if (!newAddressForm.state.trim()) errors.state = 'State is required';
    if (!newAddressForm.postalCode.trim()) {
      errors.postalCode = 'Postal code is required';
    } else if (!/^\d{6}$/.test(newAddressForm.postalCode)) {
      errors.postalCode = 'Invalid postal code (6 digits)';
    }
    if (!newAddressForm.phone.trim()) {
      errors.phone = 'Phone is required';
    } else if (!/^\d{10}$/.test(newAddressForm.phone)) {
      errors.phone = 'Invalid phone (10 digits)';
    }

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Handlers ---
  const handleShippingSubmit = (e) => {
    e.preventDefault();
    if (validateShipping()) {
      // Create active address snapshot
      const activeAddress = selectedAddress || newAddressForm;
      
      track('add_shipping_info', {
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: products[item.product_id]?.price
        })),
        value: total,
        shipping_tier: shipping === 0 ? 'free' : 'standard',
        gift_wrap: giftWrap
      });
      setCurrentStep(1);
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    track('add_payment_info', {
      payment_type: paymentMethod,
      value: total
    });
    setCurrentStep(2);
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    const activeAddress = selectedAddress || newAddressForm;
    onPlaceOrder({
      shipping_address: activeAddress,
      order_notes: orderNotes,
      gift_wrap: giftWrap,
      total: total
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto relative">
      {/* Left Column: Wizard Steps */}
      <div className="flex-1 min-w-0">
        <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

        <div className="mt-8">
          {/* STEP 0: SHIPPING */}
          {currentStep === 0 && (
            <form onSubmit={handleShippingSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <section>
                <h2 className="font-heading text-2xl mb-6">Shipping Address</h2>
                <AddressBookSelector
                  addresses={savedAddresses}
                  selectedAddress={selectedAddress}
                  onSelect={setSelectedAddress}
                  newAddressForm={newAddressForm}
                  onNewAddressChange={(field, val) => {
                    setNewAddressForm(prev => ({ ...prev, [field]: val }));
                    if (addressErrors[field]) {
                      setAddressErrors(prev => ({ ...prev, [field]: undefined }));
                    }
                  }}
                  formErrors={addressErrors}
                />
              </section>

              <section className="space-y-6 pt-6 border-t border-border">
                <h3 className="font-heading text-xl">Options</h3>
                
                <div className="flex items-start space-x-3 bg-muted/30 p-4 border border-border">
                  <Checkbox 
                    id="gift-wrap" 
                    checked={giftWrap}
                    onCheckedChange={setGiftWrap}
                    className="mt-1"
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="gift-wrap" className="font-body text-base cursor-pointer">
                      Gift wrap (+ ₹49)
                    </Label>
                    <p className="font-mono text-xs text-muted-foreground">
                      Your order will be packaged in our signature NOIR monochrome gift box.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order-notes" className="font-mono text-xs tracking-wider uppercase">
                    Order notes (optional)
                  </Label>
                  <Textarea
                    id="order-notes"
                    placeholder="Delivery instructions or special requests..."
                    className="rounded-none resize-none min-h-[100px]"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                  />
                </div>
              </section>

              <div className="pt-4">
                <Button type="submit" className="w-full sm:w-auto min-w-[200px] rounded-none uppercase tracking-widest font-mono text-xs h-12">
                  Continue to Payment
                </Button>
              </div>
            </form>
          )}

          {/* STEP 1: PAYMENT */}
          {currentStep === 1 && (
            <form onSubmit={handlePaymentSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <section>
                <h2 className="font-heading text-2xl mb-6">Payment Method</h2>
                <div className="space-y-4">
                  <label className="flex items-center space-x-3 p-4 border border-primary bg-primary/5 cursor-pointer">
                    <input type="radio" checked readOnly className="h-4 w-4 text-primary focus:ring-primary" />
                    <span className="font-body font-medium">Razorpay (Cards, UPI, NetBanking)</span>
                  </label>
                  <p className="font-mono text-xs text-muted-foreground">
                    You will be securely redirected to Razorpay to complete your payment upon placing the order.
                  </p>
                </div>
              </section>

              <div className="pt-4 flex gap-4">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(0)} className="rounded-none uppercase tracking-widest font-mono text-xs h-12">
                  Back
                </Button>
                <Button type="submit" className="flex-1 sm:flex-none sm:w-auto min-w-[200px] rounded-none uppercase tracking-widest font-mono text-xs h-12">
                  Continue to Review
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: REVIEW */}
          {currentStep === 2 && (
            <form onSubmit={handleReviewSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <section>
                <h2 className="font-heading text-2xl mb-6">Review Your Order</h2>
                
                <div className="bg-muted/30 p-6 border border-border space-y-6">
                  <div>
                    <h3 className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Shipping To</h3>
                    <div className="font-body text-sm">
                      <p className="font-medium">{selectedAddress ? selectedAddress.name : newAddressForm.name}</p>
                      <p className="text-muted-foreground mt-1">
                        {selectedAddress ? selectedAddress.address : newAddressForm.address}<br/>
                        {selectedAddress ? selectedAddress.city : newAddressForm.city}, {selectedAddress ? selectedAddress.state : newAddressForm.state} {selectedAddress ? selectedAddress.postalCode : newAddressForm.postalCode}<br/>
                        Phone: {selectedAddress ? selectedAddress.phone : newAddressForm.phone}
                      </p>
                    </div>
                  </div>

                  {orderNotes && (
                    <div className="pt-4 border-t border-border">
                      <h3 className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Order Notes</h3>
                      <p className="font-body text-sm text-muted-foreground">{orderNotes}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <h3 className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Payment Method</h3>
                    <p className="font-body text-sm">Razorpay</p>
                  </div>
                </div>
              </section>

              <div className="pt-4 flex gap-4">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} disabled={processing} className="rounded-none uppercase tracking-widest font-mono text-xs h-12">
                  Back
                </Button>
                <Button type="submit" disabled={processing} className="flex-1 sm:flex-none sm:w-auto min-w-[250px] rounded-none uppercase tracking-widest font-mono text-xs h-12">
                  {processing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    'Place Order'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right Column: Order Summary (Sticky at lg+) */}
      <div className="w-full lg:w-[400px] shrink-0">
        <div className="sticky top-24">
          <OrderSummary
            cartItems={cartItems}
            products={products}
            subtotal={subtotal}
            shipping={shipping}
            hasGiftWrap={giftWrap}
            couponDiscount={couponDiscount}
            total={total}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutWizard;
