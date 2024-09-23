'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProcessingBar from '@/components/ProcessingBar';
import ProcessedVideoCard from '@/components/ProcessedVideoCard';
import { useUser } from '@clerk/nextjs';

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
  processingTimeframe: string;
  // Add other project properties as needed
}

interface ProjectStatus {
  status: 'processing' | 'completed' | 'failed';
  stage: string;
  progress: number;
  title: string;
  processingTimeframe: string;
}

const stages = ['downloading', 'transcribing', 'analyzing', 'generating', 'uploading'];

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [processing, setProcessing] = useState(true);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>({
    status: 'processing',
    stage: 'initializing',
    progress: 0,
    title: '',
    processingTimeframe: ''
  });
  const { user } = useUser();

  useEffect(() => {
    if (id && user) {
      fetchProjectStatus();
    }
  }, [id, user]);

  const fetchProjectStatus = async () => {
    try {
      const response = await fetch(`/api/project-status?userId=${user?.id}&projectId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setProjectStatus(data);
        
        if (data.status === 'completed') {
          setProcessing(false);
          router.push(`/project/${id}/clips`);
        } else if (data.status === 'failed') {
          setProcessing(false);
          // TODO: Handle error
          // Failed project card appears
        }
      }
    } catch (error) {
      console.error('Error fetching project status:', error);
    }
  };

  useEffect(() => {
    if (processing) {
      const interval = setInterval(fetchProjectStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [processing]);

  const getStageDescription = (stage: string) => {
    switch (stage) {
      case 'downloading': return 'Fetching video...';
      case 'transcribing': return 'Transcribing audio...';
      case 'analyzing': return 'Analyzing content...';
      case 'generating': return 'Generating clips...';
      case 'uploading': return 'Sending clips...';
      default: return 'Processing';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <main className="flex flex-col items-center space-y-8">
        <h1 className="text-2xl font-bold">Your video is processing</h1>
        <p>We will email you once your video is done processing, check back soon!</p>
        {projectStatus.title && (
          <div className="text-center">
            <p className="text-xl font-semibold">{projectStatus.title}</p>
            <p className="text-sm text-gray-400">Processing timeframe: {projectStatus.processingTimeframe}</p>
          </div>
        )}
        {processing ? (
          <>
            <div className="w-full max-w-2xl">
              {stages.map((stage, index) => {
                const isCompleted = stages.indexOf(projectStatus.stage) > index;
                const isCurrent = projectStatus.stage === stage;
                return (
                  <div key={stage} className={`flex items-center mb-2 ${isCompleted ? 'text-green-500' : isCurrent ? 'text-blue-500' : 'text-gray-500'}`}>
                    <div className={`w-4 h-4 mr-2 rounded-full ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                    <p>{getStageDescription(stage)} {isCompleted ? '(Completed)' : isCurrent ? `(${projectStatus.progress}%)` : ''}</p>
                  </div>
                );
              })}
            </div>
            <ProcessingBar progress={projectStatus.progress} />
          </>
        ) : (
          <div className="w-full max-w-2xl">
            {projectStatus.title && (
              <h2 className="text-xl font-bold mb-2">{projectStatus.title}</h2>
            )}
            {projectStatus.processingTimeframe && (
              <p className="text-sm text-gray-400 mb-4">Processing timeframe: {projectStatus.processingTimeframe}</p>
            )}
            <h3 className="text-lg font-bold mb-2">Processing:</h3>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${projectStatus.progress}%` }}
              ></div>
            </div>
            <p className="text-right mt-1 text-sm">{projectStatus.progress}%</p>
          </div>
        )}
      </main>
    </div>
  );
}