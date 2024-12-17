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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchClips(id);
    }
  }, [id]);

  const fetchClips = async (projectId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/get-clips?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const sortedClips = data.sort((a: Clip, b: Clip) => b.score - a.score);
        setClips(sortedClips);
      }
    } catch (error) {
      console.error('Error fetching clips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-n-1 px-0 py-2 sm:p-4">
      <main className="flex flex-col items-center max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12">Project Clips</h1>
        <div className="w-full space-y-8">
          {isLoading ? (
            <div className="w-full bg-n-7/70 rounded-2xl p-8 text-center mx-auto" style={{ maxWidth: '52rem' }}>
              <p className="text-n-3">Loading clips...</p>
            </div>
          ) : clips.length > 0 ? (
            clips.map((clip, index) => (
              <ProcessedVideoCard 
                key={clip._id} 
                clip={clip} 
                index={index + 1} 
              />
            ))
          ) : (
            <div className="w-full bg-n-7/70 rounded-2xl p-8 text-center space-y-4 mx-auto" style={{ maxWidth: '52rem' }}>
              <h2 className="text-xl font-semibold">No clips found</h2>
              <p className="text-n-3">
                Try increasing the processing timeframe to generate more potential clips from your video.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
