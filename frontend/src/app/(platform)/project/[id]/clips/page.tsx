'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProcessedVideoCard from '@/components/platform/ProcessedVideoCard';

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

export default function ProjectClipsPage() {
  const params = useParams();
  const id = params.id as string;
  const [clips, setClips] = useState<Clip[]>([]);

  useEffect(() => {
    if (id) {
      fetchClips(id);
    }
  }, [id]);

  const fetchClips = async (projectId: string) => {
    try {
      const response = await fetch(`/api/get-clips?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        // Sort clips by score in descending order
        const sortedClips = data.sort((a: Clip, b: Clip) => b.score - a.score);
        setClips(sortedClips);
      }
    } catch (error) {
      console.error('Error fetching clips:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-n-1 p-4">
      <main className="flex flex-col items-center space-y-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">Project Clips</h1>
        {clips.length > 0 ? (
          clips.map((clip) => (
            <ProcessedVideoCard key={clip._id} clip={clip} />
          ))
        ) : (
          <div className="w-full max-w-2xl bg-n-7/70 rounded-2xl p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold">No clips found</h2>
            <p className="text-n-3">
              Try increasing the processing timeframe to generate more potential clips from your video.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
