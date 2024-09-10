'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProcessingBar from '@/components/ProcessingBar';
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

interface Project {
  _id: string;
  title: string;
  // Add other project properties as needed
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [processing, setProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [processedClips, setProcessedClips] = useState<Clip[]>([]);

  const backend_url = process.env.NEXT_PUBLIC_BACKEND_URL || "https://lunarisbackend-production.up.railway.app";

  useEffect(() => {
    if (id) {
      fetchProjectDetails(id);
    }
  }, [id]);

  const fetchProjectDetails = async (projectId: string) => {
    const response = await fetch(`${backend_url}/api/project/${projectId}`);
    if (response.ok) {
      const data = await response.json();
      setProject(data);
      if (data.status === 'completed') {
        router.push(`/project/${projectId}/clips`);
      } else {
        pollVideoStatus(projectId);
      }
    }
  };

  const pollVideoStatus = async (projectId: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(`${backend_url}/api/video-status/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'completed') {
          clearInterval(interval);
          setProcessing(false);
          setProgress(100);
          fetchProcessedClips(projectId);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setProcessing(false);
          // Handle error
        } else {
          setProgress((prev) => (prev < 90 ? prev + 10 : prev));
        }
      }
    }, 3000);

    // Clean up the interval on component unmount
    return () => clearInterval(interval);
  };

  const fetchProcessedClips = async (projectId: string) => {
    const response = await fetch(`${backend_url}/api/get-video/${projectId}`);
    if (response.ok) {
      const data = await response.json();
      setProcessedClips(data.clips);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <main className="flex flex-col items-center space-y-8">
        <h1 className="text-2xl font-bold">{project?.title || 'Loading...'}</h1>
        <ProcessingBar progress={progress} />
      </main>
    </div>
  );
}
