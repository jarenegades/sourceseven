import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe } from '@stripe/stripe-js';
import { CreditCard, Lock, MapPin, Package, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { CartItem } from '../utils/cartService';
import { Currency, convertCurrency, formatCurrency } from '../utils/currencyService';
import { toast } from 'sonner';
import { StripePaymentForm } from './StripePaymentForm';
import { createPaymentIntent, getStripe, isStripeConfigured, toCents } from '../utils/paymentService';
import { authService } from '../utils/authService';
import { cartService } from '../utils/cartService';
import { ordersService } from '../utils/ordersService';
import { orderNotificationService } from '../utils/orderNotificationService';
import { ShippingMethod, shippingMethodsService } from '../utils/shippingMethodsService';
import { PaymentMethodCode, PaymentMethodSetting, commerceSettingsService } from '../utils/commerceSettingsService';
import { authenticatedApi } from '../utils/accountApi';

interface CheckoutPageProps {
  cartItems: CartItem[];
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onOrderComplete: () => void | Promise<void>;
  selectedCurrency?: Currency;
}

function createCheckoutAttemptId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function CheckoutPage({ cartItems, onUpdateQuantity, onRemoveItem, onOrderComplete, selectedCurrency = 'USD' }: CheckoutPageProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'overnight'>('standard');
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('card');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([]);
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | undefined>(undefined);
  const [checkoutAttemptId, setCheckoutAttemptId] = useState(createCheckoutAttemptId);
  const [serverQuote, setServerQuote] = useState<{ currency: string; shippingMethod: string; subtotal: number; tax: number; shippingCost: number; total: number; cartKey: string } | null>(null);
  
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  // Removed paymentInfo state as Stripe handles this

  // Calculate totals in selected currency
  const cartKey = JSON.stringify(cartItems.map((item) => [item.product_id, item.quantity, item.product?.price]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  const localSubtotal = cartItems.reduce((sum, item) => {
    if (!item.product) return sum;
    const itemCurrency = 'USD'; // Assuming products are stored in USD
    const convertedPrice = convertCurrency(item.product.price, itemCurrency, selectedCurrency);
    return sum + convertedPrice * item.quantity;
  }, 0);
  const localTax = localSubtotal * 0.08;
  const selectedShippingMethod = shippingMethods.find((method) => method.code === shippingMethod) || shippingMethods[0];
  const shippingThreshold = selectedShippingMethod?.free_shipping_threshold == null
    ? null
    : convertCurrency(selectedShippingMethod.free_shipping_threshold, 'USD', selectedCurrency);
  const shippingBase = convertCurrency(selectedShippingMethod?.price || 0, 'USD', selectedCurrency);
  const localShippingCost = shippingThreshold !== null && localSubtotal >= shippingThreshold ? 0 : shippingBase;
  const hasCurrentQuote = serverQuote?.currency === selectedCurrency && serverQuote.shippingMethod === shippingMethod && serverQuote.cartKey === cartKey;
  const subtotal = hasCurrentQuote ? serverQuote.subtotal : localSubtotal;
  const tax = hasCurrentQuote ? serverQuote.tax : localTax;
  const shippingCost = hasCurrentQuote ? serverQuote.shippingCost : localShippingCost;
  const total = hasCurrentQuote ? serverQuote.total : subtotal + tax + shippingCost;

  useEffect(() => {
    shippingMethodsService.getActive()
      .then((methods) => {
        setShippingMethods(methods);
        if (methods.length > 0 && !methods.some((method) => method.code === shippingMethod)) {
          setShippingMethod(methods[0].code);
        }
      })
      .catch((error) => console.error('Could not load shipping methods:', error));
  }, []);

  useEffect(() => {
    commerceSettingsService.getActivePaymentMethods()
      .then((methods) => {
        setPaymentMethods(methods);
        if (methods.length > 0 && !methods.some((method) => method.code === paymentMethod)) setPaymentMethod(methods[0].code);
      })
      .catch((error) => console.error('Could not load payment methods:', error));
  }, []);

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Object.values(shippingInfo).every(val => val.trim())) {
      toast.error('Please fill in all shipping fields');
      return;
    }

    if (paymentMethod !== 'card') {
      if (import.meta.env.VITE_NEON_AUTH_URL) {
        setIsPreparingPayment(true);
        try {
          const { quote } = await authenticatedApi<{ quote: { currency: string; shippingMethod: string; subtotal: number; tax: number; shippingCost: number; total: number } }>(
            '/api/checkout/quote',
            { method: 'POST', body: { currency: selectedCurrency, shippingMethod } },
          );
          setServerQuote({ ...quote, cartKey });
        } catch (error: any) {
          toast.error(error.message || 'Unable to calculate the checkout total');
          return;
        } finally {
          setIsPreparingPayment(false);
        }
      }
      setCurrentStep(3);
      toast.success('Payment method saved');
      return;
    }

    if (!isStripeConfigured()) {
      toast.error('Stripe is not configured. Check the publishable key and the server-side STRIPE_SECRET_KEY in Vercel.');
      return;
    }

    setIsPreparingPayment(true);
    setClientSecret('');

    try {
      const stripe = getStripe();
      const paymentIntent = await createPaymentIntent({
        amount: toCents(total),
        currency: selectedCurrency.toLowerCase(),
        customerEmail: shippingInfo.email,
        customerName: shippingInfo.fullName,
        shippingMethod,
        checkoutAttemptId,
      });

      if (!paymentIntent.success || !paymentIntent.clientSecret) {
        throw new Error(paymentIntent.error || 'Failed to prepare Stripe checkout');
      }

      setStripePromise(stripe);
      setClientSecret(paymentIntent.clientSecret);
      if (paymentIntent.quote) setServerQuote({ ...paymentIntent.quote, cartKey });
      setCurrentStep(2);
      toast.success('Shipping information saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to prepare payment');
    } finally {
      setIsPreparingPayment(false);
    }
  };

  const handlePaymentSuccess = (confirmedPaymentIntentId?: string) => {
    setPaymentIntentId(confirmedPaymentIntentId);
    setCurrentStep(3);
    toast.success('Payment confirmed!');
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsPlacingOrder(true);

    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('Please sign in again to complete your order');
      }

      const order = await ordersService.create(
        {
          user_id: user.id,
          status: paymentMethod === 'card' ? 'confirmed' : 'processing',
          subtotal,
          tax,
          shipping_cost: shippingCost,
          total,
          shipping_method: shippingMethod,
          shipping_full_name: shippingInfo.fullName,
          shipping_email: shippingInfo.email,
          shipping_phone: shippingInfo.phone,
          shipping_address: shippingInfo.address,
          shipping_city: shippingInfo.city,
          shipping_state: shippingInfo.state,
          shipping_zip_code: shippingInfo.zipCode,
          shipping_country: 'United States',
          payment_method: paymentMethod === 'cash-on-delivery' ? 'cash-on-delivery' : paymentMethod === 'bank-transfer' ? 'bank-transfer' : 'credit-card',
          payment_status: paymentMethod === 'card' ? 'completed' : 'pending',
          payment_transaction_id: paymentIntentId || null,
          currency: selectedCurrency,
        },
        cartItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product?.name || 'Product',
          product_image_url: item.product?.image_url,
          quantity: item.quantity,
          unit_price: item.product ? convertCurrency(item.product.price, 'USD', selectedCurrency) : 0,
          total_price: item.product
            ? convertCurrency(item.product.price, 'USD', selectedCurrency) * item.quantity
            : 0,
        })),
        checkoutAttemptId,
      );

      // Neon order placement clears the cart within the same transaction as
      // order creation. Avoid a second request that could turn a saved order
      // into a misleading checkout failure if cart cleanup is retried.
      if (!import.meta.env.VITE_NEON_AUTH_URL) {
        await cartService.clearCart(user.id);
      }

      try {
        await orderNotificationService.sendOrderCompleteNotifications({
          userId: user.id,
          orderNumber: order.order_number,
          subtotal: order.subtotal,
          tax: order.tax,
          shippingCost: order.shipping_cost,
          total: order.total,
          currency: selectedCurrency,
          customer: {
            fullName: shippingInfo.fullName,
            email: shippingInfo.email,
            phone: shippingInfo.phone,
          },
          shipping: {
            address: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zipCode: shippingInfo.zipCode,
            country: 'United States',
            method: shippingMethod,
          },
          items: cartItems.map((item) => ({
            productId: item.product_id,
            productName: item.product?.name || 'Product',
            productImageUrl: item.product?.image_url,
            quantity: item.quantity,
            unitPrice: item.product ? convertCurrency(item.product.price, 'USD', selectedCurrency) : 0,
            totalPrice: item.product
              ? convertCurrency(item.product.price, 'USD', selectedCurrency) * item.quantity
              : 0,
            category: item.product?.category || '',
            categoryId: item.product?.category_id,
            subcategoryId: item.product?.subcategory_id,
          })),
        });
      } catch (notificationError) {
        console.error('Order notifications failed:', notificationError);
      }

      await onOrderComplete();
      toast.success(`Order ${order.order_number} placed successfully!`);
      navigate('/orders');
    } catch (error: any) {
      console.error('Order placement failed:', error);
      toast.error(error.message || 'Failed to place order');
      if (/(requested a refund|automatically refunded|already refunded)/i.test(error?.message || '')) {
        setCheckoutAttemptId(createCheckoutAttemptId());
        setPaymentIntentId(undefined);
        setClientSecret('');
        setCurrentStep(1);
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center gap-2 text-[#003366] hover:text-[#0055AA] mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Cart</span>
        </button>
        <h1 className="text-[#003366]">Checkout</h1>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex flex-col items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              currentStep >= 1 ? 'bg-[#003366] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              <MapPin className="h-5 w-5" />
            </div>
            <span className="text-xs md:text-sm text-center">Shipping</span>
          </div>
          <div className={`flex-1 h-1 ${currentStep >= 2 ? 'bg-[#003366]' : 'bg-gray-200'}`} />
          <div className="flex flex-col items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              currentStep >= 2 ? 'bg-[#003366] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-xs md:text-sm text-center">Payment</span>
          </div>
          <div className={`flex-1 h-1 ${currentStep >= 3 ? 'bg-[#003366]' : 'bg-gray-200'}`} />
          <div className="flex flex-col items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              currentStep >= 3 ? 'bg-[#003366] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              <Package className="h-5 w-5" />
            </div>
            <span className="text-xs md:text-sm text-center">Review</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Step 1: Shipping Information */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-[#003366] mb-6">Shipping Information</h2>
              <form onSubmit={handleShippingSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={shippingInfo.fullName}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={shippingInfo.email}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                    placeholder="123 Main St, Apt 4B"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={shippingInfo.city}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                      placeholder="New York"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={shippingInfo.state}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                      placeholder="NY"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      value={shippingInfo.zipCode}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                      placeholder="10001"
                      required
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-[#003366] mb-4">Shipping Method</h3>
                  <RadioGroup value={shippingMethod} onValueChange={setShippingMethod}>
                    {shippingMethods.map((method) => {
                      const methodThreshold = method.free_shipping_threshold == null ? null : convertCurrency(method.free_shipping_threshold, 'USD', selectedCurrency);
                      const methodPrice = convertCurrency(method.price, 'USD', selectedCurrency);
                      const isFree = methodThreshold !== null && subtotal >= methodThreshold;
                      return <div key={method.code} className="flex items-center justify-between p-4 border rounded-lg mb-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value={method.code} id={method.code} /><Label htmlFor={method.code} className="cursor-pointer"><div><p className="font-semibold">{method.name}</p><p className="text-sm text-gray-500">{method.estimated_delivery}</p></div></Label></div>
                        <span className="font-semibold">{isFree ? 'FREE' : formatCurrency(methodPrice, selectedCurrency)}</span>
                      </div>;
                    })}
                  </RadioGroup>
                </div>

                <Separator className="my-6" />
                <div>
                  <h3 className="text-[#003366] mb-4">Payment Method</h3>
                  <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethodCode)}>
                    {paymentMethods.map((method) => <div key={method.code} className="flex items-center justify-between p-4 border rounded-lg mb-2"><div className="flex items-center space-x-2"><RadioGroupItem value={method.code} id={`payment-${method.code}`} /><Label htmlFor={`payment-${method.code}`} className="cursor-pointer"><div><p className="font-semibold">{method.name}</p><p className="text-sm text-gray-500">{method.description}</p></div></Label></div></div>)}
                  </RadioGroup>
                </div>

                <Button type="submit" className="w-full bg-[#003366] hover:bg-[#0055AA] text-white">
                  Continue to Payment
                </Button>
              </form>
            </div>
          )}

          {/* Step 2: Payment Information */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              {isPreparingPayment ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Preparing secure payment</p>
                      <p>Creating your Stripe payment session.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Shipping
                  </Button>
                </div>
              ) : !clientSecret || !stripePromise ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    Unable to initialize Stripe payment. Go back and try again after configuring the Neon checkout environment.
                  </div>
                  <Button
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Shipping
                  </Button>
                </div>
              ) : (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                    },
                  }}
                >
                  <StripePaymentForm
                    amount={total}
                    customerEmail={shippingInfo.email}
                    customerName={shippingInfo.fullName}
                    onSuccess={handlePaymentSuccess}
                    onBack={() => setCurrentStep(1)}
                  />
                </Elements>
              )}
            </div>
          )}

          {/* Step 3: Review Order */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Shipping Details */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[#003366]">Shipping Details</h2>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-sm text-[#0055AA] hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">{shippingInfo.fullName}</p>
                  <p>{shippingInfo.email}</p>
                  <p>{shippingInfo.phone}</p>
                  <p>{shippingInfo.address}</p>
                  <p>{shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}</p>
                  <p className="text-gray-600 pt-2">
                    Shipping: {selectedShippingMethod?.name || shippingMethod}
                  </p>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[#003366]">Payment Method</h2>
                  <button
                    onClick={() => setCurrentStep(paymentMethod === 'card' ? 2 : 1)}
                    className="text-sm text-[#0055AA] hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Lock className="h-8 w-8 text-green-600" />
                  <div className="text-sm">
                    <p className="font-semibold">{paymentMethods.find((method) => method.code === paymentMethod)?.name || 'Payment'}</p>
                    <p className="text-gray-600">{paymentMethod === 'card' ? 'Payment confirmed and secured by Stripe' : paymentMethod === 'cash-on-delivery' ? 'Payment will be collected at delivery.' : 'Bank transfer instructions will be provided after the order is placed.'}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-[#003366] mb-4">Order Items</h2>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <ImageWithFallback
                        src={item.product?.image_url || ''}
                        alt={item.product?.name || ''}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm line-clamp-2">{item.product?.name || ''}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {item.product ? formatCurrency(
                            convertCurrency(item.product.price, 'USD', selectedCurrency) * item.quantity,
                            selectedCurrency
                          ) : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(paymentMethod === 'card' ? 2 : 1)}
                  className="flex-1"
                  disabled={isPlacingOrder}
                >
                  Back
                </Button>
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder}
                  className="flex-1 bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 font-semibold"
                >
                  {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
            <h2 className="text-[#003366] mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span>Items ({cartItems.length}):</span>
                <span>{formatCurrency(subtotal, selectedCurrency)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Shipping:</span>
                <span>
                  {shippingCost === 0 ? (
                    <span className="text-green-600 font-semibold">FREE</span>
                  ) : (
                    formatCurrency(shippingCost, selectedCurrency)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>{formatCurrency(tax, selectedCurrency)}</span>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-semibold">Order Total:</span>
                <span className="text-xl font-bold text-[#DC143C]">
                  {formatCurrency(total, selectedCurrency)}
                </span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <div className="flex items-start gap-2">
                <div className="text-green-600 mt-0.5">✓</div>
                <p>Your order qualifies for secure checkout and buyer protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
