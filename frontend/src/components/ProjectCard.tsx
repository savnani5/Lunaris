import React from 'react';

interface ProjectCardProps {
  project: {
    id: string;
    thumbnail: string;
    title: string;
    status: 'completed' | 'processing' | 'failed';
    videoDuration: number;
    progress?: number;
    processingTimeframe?: string; // Add this line
  };
  onClick: (project: ProjectCardProps['project']) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div onClick={() => onClick(project)} className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative">
      <img src={project.thumbnail} alt={project.title} className="w-full h-32 object-cover" />
      {/* <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
        {formatDuration(project.videoDuration)}
      </div> */}
      {project.processingTimeframe && (
        <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
          {project.processingTimeframe}
        </div>
      )}
      {project.status === 'processing' && project.progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
          <div 
            className="h-full bg-blue-500" 
            style={{ width: `${project.progress}%` }}
          ></div>
        </div>
      )}
      <div className="p-2">
        <h3 className="text-white text-sm font-semibold truncate">{project.title}</h3>
        <p className="text-gray-400 text-xs">{project.status}</p>
      </div>
    </div>
  );
};

export default ProjectCard;