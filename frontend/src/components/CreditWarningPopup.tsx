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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg w-full max-w-sm sm:max-w-md">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Not Enough Credits</h2>
        <p className="mb-2 text-sm sm:text-base">Available Credits: {availableCredits}</p>
        <p className="mb-2 text-sm sm:text-base">Required Credits: {requiredCredits}</p>
        <p className="mb-4 sm:mb-6 text-sm sm:text-base">You don't have enough credits to create this project. Don't worry, you can buy more credits!</p>
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
          <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={handleBuyCredits} className="bg-blue-500 w-full sm:w-auto">Buy Credits</Button>
        </div>
      </div>
    </div>
  );
};

export default CreditWarningPopup;
