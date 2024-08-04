'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";

interface ProcessedVideoCardProps {
  videoUrl: string;
  metadata: {
    title: string;
    description: string;
    score: number;
    hook: string;
    flow: string;
    engagement: string;
    trend: string;
  };
}

const ProcessedVideoCard: React.FC<ProcessedVideoCardProps> = ({ videoUrl, metadata }) => {
  const [aspectRatio, setAspectRatio] = useState(16 / 9); // Default aspect ratio

  useEffect(() => {
    const video = document.createElement('video');
    video.src = videoUrl;

    video.addEventListener('loadedmetadata', () => {
      setAspectRatio(video.videoWidth / video.videoHeight);
    });

    return () => {
      video.removeEventListener('loadedmetadata', () => {
        setAspectRatio(video.videoWidth / video.videoHeight);
      });
    };
  }, [videoUrl]);

  return (
    <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-lg">
      <div className="relative" style={{ paddingTop: `${(1 / aspectRatio) * 40}%` }}>
        <video src={videoUrl} className="absolute top-0 left-0 w-full h-full" controls />
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-bold">{metadata.title}</h2>
        <p>{metadata.description}</p>
        <div className="mt-2">
          <span className="text-sm">Score: {metadata.score}</span>
          <span className="text-sm ml-2">Hook: {metadata.hook}</span>
          <span className="text-sm ml-2">Flow: {metadata.flow}</span>
          <span className="text-sm ml-2">Engagement: {metadata.engagement}</span>
          <span className="text-sm ml-2">Trend: {metadata.trend}</span>
        </div>
      </div>
    </div>
  );
};

export default ProcessedVideoCard;