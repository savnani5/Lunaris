import React from 'react';

interface ProjectCardProps {
  project: {
    id: string;
    thumbnail: string;
    title: string;
    status: 'completed' | 'processing' | 'failed';
  };
  onClick: (project: ProjectCardProps['project']) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  return (
    <div onClick={() => onClick(project)} className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
      <img src={project.thumbnail} alt={project.title} className="w-full h-32 object-cover" />
      <div className="p-2">
        <h3 className="text-white text-sm font-semibold truncate">{project.title}</h3>
      </div>
    </div>
  );
};

export default ProjectCard;