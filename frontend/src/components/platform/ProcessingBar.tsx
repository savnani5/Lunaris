import React from 'react';

interface ProcessingBarProps {
  progress: number;
}

const ProcessingBar: React.FC<ProcessingBarProps> = ({ progress }) => {
  return (
    <div className="w-full max-w-2xl bg-n-7 p-4 rounded-2xl mt-8">
      <h2 className="text-lg font-bold mb-2 text-n-1">Processing:</h2>
      <div className="w-full bg-n-6 rounded-full h-2.5">
        <div
          className="bg-color-1 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-right mt-1 text-sm text-n-3">{progress}%</p>
    </div>
  );
};

export default ProcessingBar;
