'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProcessingBar from '@/components/ProcessingBar';
import { useUser } from '@clerk/nextjs';

interface ProjectStatus {
  status: 'created' | 'processing' | 'completed' | 'failed';
  stage: string;
  progress: number;
  title: string;
  processing_timeframe: string;
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
    processing_timeframe: ''
  });
  const { user } = useUser();

  useEffect(() => {
    if (id && user) {
      const fetchProjectStatus = async () => {
        try {
          const response = await fetch(`/api/project-status?userId=${user.id}&projectId=${id}`);
          if (response.ok) {
            const data: ProjectStatus = await response.json();
            setProjectStatus(data);
            
            if (data.status === 'completed') {
              setProcessing(false);
              router.push(`/project/${id}/clips`);
            } else if (data.status === 'failed') {
              setProcessing(false);
              // TODO: Handle error
              // Failed project card appears
            }
          } else if (response.status === 404) {
            console.error('Project not found');
            // Handle project not found error
          }
        } catch (error) {
          console.error('Error fetching project status:', error);
        }
      };

      fetchProjectStatus();
      const interval = setInterval(fetchProjectStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [id, user, router]);

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
            {projectStatus.processing_timeframe && (
              <p className="text-sm text-gray-400">Processing timeframe: {projectStatus.processing_timeframe}</p>
            )}
          </div>
        )}
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
      </main>
    </div>
  );
}


// Red lines for failed project with error message
// Give back the credits for the failed project