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

  return (
    <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-lg">
      <div className="relative" style={{ paddingTop: `${(1 / aspectRatio) * 40}%` }}>
        <video src={clip.s3_uri} className="absolute top-0 left-0 w-full h-full" controls />
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-bold">{clip.title}</h2>
        <p>{clip.transcript}</p>
        <div className="mt-2">
          <span className="text-sm">Score: {clip.score}</span>
          <span className="text-sm ml-2">Hook: {clip.hook}</span>
          <span className="text-sm ml-2">Flow: {clip.flow}</span>
          <span className="text-sm ml-2">Engagement: {clip.engagement}</span>
          <span className="text-sm ml-2">Trend: {clip.trend}</span>
        </div>
      </div>
    </div>
  );
};

export default ProcessedVideoCard;
