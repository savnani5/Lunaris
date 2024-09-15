'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProcessedVideoCard from '@/components/ProcessedVideoCard';

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
        setClips(data);
      }
    } catch (error) {
      console.error('Error fetching clips:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <main className="flex flex-col items-center space-y-8">
        <h1 className="text-2xl font-bold">Project Clips</h1>
        <p>We will email you once the clips are ready!</p>
        {clips.map((clip) => (
          <ProcessedVideoCard key={clip._id} clip={clip} />
        ))}
      </main>
    </div>
  );
}
