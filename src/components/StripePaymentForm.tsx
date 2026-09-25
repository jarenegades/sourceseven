import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

interface StripePaymentFormProps {
  amount: number;
  onSuccess: (paymentIntentId?: string) => void;
  onBack: () => void;
  customerEmail: string;
  customerName: string;
}

/**
 * Stripe Payment Form Component
 * This component handles the actual payment processing using Stripe Elements
 */
export function StripePaymentForm({ 
  amount, 
  onSuccess, 
  onBack,
  customerEmail,
  customerName 
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/order-confirmation',
          payment_method_data: {
            billing_details: {
              name: customerName,
              email: customerEmail,
            },
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment error:', error);
        toast.error(error.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast.success('Payment successful!');
        onSuccess(paymentIntent.id);
      } else {
        toast.error('Payment was not completed');
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast.error('An error occurred while processing payment');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-[#003366]">Secure Payment</h3>
        </div>

        <PaymentElement 
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card'],
          }}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <p>Your payment is processed securely by Stripe. We never see or store your card details.</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-700">Total Amount:</span>
          <span className="text-2xl font-bold text-[#DC143C]">${amount.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-[#003366] hover:bg-[#0055AA] text-white"
        >
          {isProcessing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
        </Button>
      </div>

      <div className="text-center text-xs text-gray-500">
        <p>Test Card: 4242 4242 4242 4242 | Any future date | Any 3 digits</p>
      </div>
    </form>
  );
}
