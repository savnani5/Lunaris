'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Define the props type
interface ProcessedVideoCardProps {
  clip: Clip;
}

interface Clip {
  _id: string;
  project_id: string;
  title: string;
  transcript: string;
  s3_uri: string;
  score: number;
  hook: string;
  flow: string;
  engagement: string;
  trend: string;
  created_at: string;
}

const ProcessedVideoCard: React.FC<ProcessedVideoCardProps> = ({ clip }) => {
  const [aspectRatio, setAspectRatio] = useState(16 / 9); // Default aspect ratio

  useEffect(() => {
    const video = document.createElement('video');
    video.src = clip.s3_uri;

    const updateAspectRatio = () => {
      setAspectRatio(video.videoWidth / video.videoHeight);
    };

    video.addEventListener('loadedmetadata', updateAspectRatio);

    return () => {
      video.removeEventListener('loadedmetadata', updateAspectRatio);
    };
  }, [clip.s3_uri]);

  const isLandscape = aspectRatio >= 1;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = clip.s3_uri;
    link.download = `${clip.title}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-n-7/70 rounded-2xl shadow-lg overflow-hidden"
      style={{ maxWidth: isLandscape ? '100%' : '52rem' }}
    >
      <div 
        className={`mx-auto ${
          isLandscape 
            ? 'p-2 sm:p-4 md:p-6' // Reduced padding for mobile landscape
            : 'p-6 w-8/12 sm:w-7/12 md:w-6/12 lg:w-5/12'
        }`}
      >
        <div 
          className="relative overflow-hidden rounded-lg" 
          style={{ 
            paddingTop: isLandscape 
              ? `${(9 / 16) * 100}%` 
              : `${(16 / 9) * 100}%`
          }}
        >
          <video 
            src={clip.s3_uri} 
            className="absolute top-0 left-0 w-full h-full object-contain bg-black" 
            controls 
            playsInline
          />
        </div>
      </div>
      
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <ScoreBadge label="Score" value={clip.score} />
          <ScoreBadge label="Hook" value={clip.hook} />
          <ScoreBadge label="Flow" value={clip.flow} />
          <ScoreBadge label="Engagement" value={clip.engagement} />
          <ScoreBadge label="Trend" value={clip.trend} />
        </div>
        
        <h2 className="text-xl font-semibold text-n-1">{clip.title}</h2>
        <p className="text-n-3 text-sm whitespace-pre-wrap">{clip.transcript}</p>
        
        <button 
          className="w-full bg-color-1 hover:bg-color-1/80 text-n-1 py-2 px-4 rounded-full transition-colors duration-200 font-semibold flex items-center justify-center"
          onClick={handleDownload}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Download Clip
        </button>
      </div>
    </motion.div>
  );
};

const ScoreBadge: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="bg-n-6 rounded-full px-3 py-1 text-sm">
    <span className="text-n-3">{label}: </span>
    <span className="text-color-1 font-semibold">{value}</span>
  </div>
);

export default ProcessedVideoCard;
