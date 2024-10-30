'use client'
import React from 'react';
import { Button } from "@/components/ui/button";

interface ComingSoonPopupProps {
  onClose: () => void;
  feature: string;
}

const SchedulePosts: React.FC<ComingSoonPopupProps> = ({ onClose, feature }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
      <div className="bg-n-7 p-6 rounded-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-n-1">Coming Soon</h2>
        <p className="text-n-3 mb-6">
          {feature} is coming soon! We're working hard to bring you this exciting new feature.
        </p>
        <div className="flex justify-center">
          <Button 
            onClick={onClose} 
            className="bg-color-1 text-n-1 hover:bg-color-1/80 px-6 py-2 rounded-full transition-colors duration-200"
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SchedulePosts;
