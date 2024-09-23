'use client';
import React, { useState, useEffect } from 'react';

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

  return (
    <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg">
      <div 
        className="relative rounded-lg overflow-hidden mb-4" 
        style={{ 
          paddingTop: isLandscape 
            ? `${(1 / aspectRatio) * 100}%` // landscape
            : `${(1 / aspectRatio) * 40}%` // portrait
        }}
      >
        <video src={clip.s3_uri} className="absolute top-0 left-0 w-full h-full" controls />
      </div>
      
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
        <span className="text-white">Score: <span className="text-xl font-semibold text-green-500">{clip.score}</span></span>
        <span className="text-white">Hook: <span className="text-xl font-semibold text-green-500">{clip.hook}</span></span>
        <span className="text-white">Flow: <span className="text-xl font-semibold text-green-500">{clip.flow}</span></span>
        <span className="text-white">Engagement: <span className="text-xl font-semibold text-green-500">{clip.engagement}</span></span>
        <span className="text-white">Trend: <span className="text-xl font-semibold text-green-500">{clip.trend}</span></span>
      </div>
      
      <h2 className="text-xl font-semibold text-white mb-2">{clip.title}</h2>
      <p className="text-gray-300 text-sm">{clip.transcript}</p>
    </div>
  );
};

export default ProcessedVideoCard;
