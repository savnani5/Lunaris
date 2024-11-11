import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from '@mui/material';
import { getUserById } from '@/lib/actions/user.actions';
import { loadStripe } from '@stripe/stripe-js';

interface CreditPurchasePopupProps {
  onClose: () => void;
  userId: string;
  planType: string;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CreditPurchasePopup: React.FC<CreditPurchasePopupProps> = ({ onClose, userId, planType }) => {
  const [credits, setCredits] = useState(100);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const userData = await getUserById(userId);
      setIsSubscribed(userData?.isSubscribed || false);
    };
    fetchUserData();
  }, [userId]);

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setCredits(newValue as number);
  };

  const handleCheckout = async () => {
    if (!isSubscribed) {
      onClose();
      return;
    }

    try {
      const response = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          credits: credits,
          amount: credits * 0.1, // Assuming $0.10 per credit
          subscription: false,
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          console.error('Stripe redirect error:', error);
        }
      }
    } catch (error) {
      console.error('Error initiating credit purchase:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-97 flex items-center justify-center z-50">
      <div className="bg-n-7 p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-n-1">Purchase Credits</h2>
        <p className="text-n-3 mb-4">1 credit = 1 minute of processing</p>
        <Slider
          value={credits}
          onChange={handleSliderChange}
          min={100}
          max={3000}
          step={100}
          valueLabelDisplay="auto"
          sx={{
            color: '#8B5CF6',
            '& .MuiSlider-thumb': {
              backgroundColor: '#8B5CF6',
            },
            '& .MuiSlider-rail': {
              backgroundColor: '#4B5563',
            },
            '& .MuiSlider-track': {
              backgroundColor: '#8B5CF6',
            },
            '& .MuiSlider-valueLabel': {
              backgroundColor: '#8B5CF6',
            },
          }}
        />
        <p className="text-n-3 mt-4">Selected Credits: {credits}</p>
        <p className="text-n-3 mt-2">Total: ${(credits * 0.1).toFixed(2)}</p>
        <div className="flex justify-between mt-6">
          <Button onClick={onClose} variant="outline" className="bg-n-6 text-n-1 hover:bg-n-5">
            Cancel
          </Button>
          <Button onClick={handleCheckout} className="bg-color-1 text-n-1 hover:bg-color-1/80">
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreditPurchasePopup;
