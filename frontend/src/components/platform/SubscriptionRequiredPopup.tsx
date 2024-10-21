import React from 'react';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';

interface SubscriptionRequiredPopupProps {
  onClose: () => void;
}

const SubscriptionRequiredPopup: React.FC<SubscriptionRequiredPopupProps> = ({ onClose }) => {
  const router = useRouter();

  const handleSubscribe = () => {
    router.push('/manage-subscription');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
      <div className="bg-n-7 p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-n-1">Subscription Required</h2>
        <p className="text-n-3 mb-6">To add more credits, please subscribe to a plan first.</p>
        <div className="flex justify-between">
          <Button onClick={onClose} variant="outline" className="bg-n-6 text-n-1 hover:bg-n-5">
            Cancel
          </Button>
          <Button onClick={handleSubscribe} className="bg-color-1 text-n-1 hover:bg-color-1/80">
            View Plans
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequiredPopup;

