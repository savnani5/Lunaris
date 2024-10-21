import React from 'react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface CreditWarningPopupProps {
  onClose: () => void;
  availableCredits: number;
  requiredCredits: number;
}

const CreditWarningPopup: React.FC<CreditWarningPopupProps> = ({ onClose, availableCredits, requiredCredits }) => {
  const router = useRouter();

  const handleBuyCredits = () => {
    router.push('/home');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-n-8 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-n-7 p-4 sm:p-6 rounded-lg w-full max-w-sm sm:max-w-md shadow-lg">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-n-1">Not Enough ⌛ Credits</h2>
        <p className="mb-2 text-sm sm:text-base text-n-2">Available ⌛: {availableCredits}</p>
        <p className="mb-2 text-sm sm:text-base text-n-2">Required ⌛: {requiredCredits}</p>
        <p className="mb-4 sm:mb-6 text-sm sm:text-base text-n-2">You don't have enough credits to create this project. Don't worry, you can buy more credits!</p>
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
          <Button onClick={onClose} variant="outline" className="w-full sm:w-auto bg-n-6 text-n-1 hover:bg-n-5">Cancel</Button>
          <Button onClick={handleBuyCredits} className="w-full sm:w-auto bg-color-1 text-n-1 hover:bg-color-1/80">Buy ⌛ Credits</Button>
        </div>
      </div>
    </div>
  );
};

export default CreditWarningPopup;
