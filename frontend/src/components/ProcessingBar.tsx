import React from 'react';

interface ProcessingBarProps {
  progress: number;
}

const ProcessingBar: React.FC<ProcessingBarProps> = ({ progress }) => {
  return (
    <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-lg mt-8">
      <h2 className="text-lg font-bold mb-2">Processing:</h2>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-right mt-1 text-sm">{progress}%</p>
    </div>
  );
};

export default ProcessingBar;
