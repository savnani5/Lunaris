import React from 'react';
import { Project } from '@/lib/database/models/project.model';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  return (
    <div onClick={() => onClick(project)} className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative">
      <img src={project.thumbnail} alt={project.title} className="w-full h-32 object-cover" />
      <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
        {project.video_quality}
      </div>
      {project.videoDuration && (
        <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
          {(() => {
            const duration = new Date(project.videoDuration * 1000);
            const hours = duration.getUTCHours();
            const minutes = duration.getUTCMinutes();
            const seconds = duration.getUTCSeconds();
            
            if (hours > 0) {
              return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
              return `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
          })()}
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