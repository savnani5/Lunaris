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
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);

  const backend_url = process.env.NEXT_PUBLIC_BACKEND_URL || "https://lunarisbackend-production.up.railway.app";

  useEffect(() => {
    if (id) {
      setProcessing(true);
      pollVideoStatus(id);
    }
  }, [id]);

  const pollVideoStatus = async (project_id: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(`${backend_url}/api/video-status/${project_id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'completed') {
          clearInterval(interval);
          setProcessing(false);
          setProgress(100);
          router.push(`/project/${project_id}/clips`);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setProcessing(false);
          // TODO: Handle error
          // Failed project card appears
        } else {
          setProgress((prev) => (prev < 90 ? prev + 10 : prev));
        }
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <main className="flex flex-col items-center space-y-8">
      <h1 className="text-2xl font-bold">Your video is processing</h1>
        <p>We will email you once your video is done processing, check back soon!</p>
        <p>Fetching video {project?.title}</p>
        {processing ? (
          <ProcessingBar progress={progress} />
        ) : (
          clips.map((clip) => (
            <ProcessedVideoCard key={clip._id} clip={clip} />
          ))
        )}
      </main>
    </div>
  );
}


// Your video is processing
// You will receive a notification once your video is done processing, check back soon!

// Fetching video "The fall of the Roman Empire explained | Gregory Aldrete and Lex Fridman"
// Curation method: ClipBasic...
// From 0:01:50 to 0:08:52, preferred clip length is auto...
// Estimated waiting time: ~ 2min
// Processing & analyzing... 77%
// Processing & analyzing... 77%