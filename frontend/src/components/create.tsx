'use client';

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import debounce from 'lodash/debounce';
import { Slider } from '@mui/material';

import ProjectCard from '@/components/ProjectCard';
import ProcessedVideoCard from '@/components/ProcessedVideoCard';

interface Project {
  id: string;
  thumbnail: string;
  title: string;
}

interface ProjectStatus {
  id: string;
  thumbnail: string;
  title: string;
  status: 'completed' | 'processing' | 'failed';
  progress?: number;
}

interface Clip {
  _id: string;
}

export function Create() {
  const router = useRouter(); 
  const [videoLink, setVideoLink] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [clipLength, setClipLength] = useState("Auto (0m~1m)");
  const [genre, setGenre] = useState("Auto");
  const [videoQuality, setVideoQuality] = useState("Auto");
  const [videoType, setVideoType] = useState("Portrait");
  const [keywords, setKeywords] = useState("");
  const { user } = useUser();
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [startTimePercentage, setStartTimePercentage] = useState(0);
  const [endTimePercentage, setEndTimePercentage] = useState(100);
  const [projects, setProjects] = useState<ProjectStatus[]>([]);
  const [clipLengthRange, setClipLengthRange] = useState({ min: 0, max: 180 });

  const backend_url = process.env.NEXT_PUBLIC_BACKEND_URL|| "https://lunarisbackend-production.up.railway.app";

  const fetchVideoDetails = async (url: string) => {
    try {
      const response = await fetch(`/api/video-details?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Received video details:", data); // Add this log
        setVideoDuration(parseDuration(data.duration));
        setVideoThumbnail(data.thumbnails.medium?.url || data.thumbnails.default?.url || "");
        setVideoTitle(data.title || "");
      }
    } catch (error) {
      console.error('Error fetching video details:', error);
    }
  };

  // Add this helper function to parse the duration
  const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (parseInt(match?.[1] ?? "0") || 0);
    const minutes = (parseInt(match?.[2] ?? "0") || 0);
    const seconds = (parseInt(match?.[3] ?? "0") || 0);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const debouncedFetchVideoDetails = debounce(fetchVideoDetails, 500);

  const handleVideoLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value;
    setVideoLink(newLink);
    if (newLink) {
      debouncedFetchVideoDetails(newLink);
    } else {
      setVideoThumbnail('');
      setVideoTitle('');
      setVideoDuration(null);
    }
  };

  useEffect(() => {
    if (videoLink) {
      fetchVideoDetails(videoLink);
    }
  }, [videoLink]);

  const handleProcessClick = async () => {
    setProcessing(true);
    
    // Use the user object from the hook
    const userId = user?.id;
    const email = user?.primaryEmailAddress?.emailAddress;

    const response = await fetch(`${backend_url}/api/process-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        link: videoLink, 
        genre,
        videoQuality,
        videoType,
        startTime,
        endTime,
        clipLength: clipLengthRange,
        keywords,
        userId,
        email,
        videoTitle,
        videoThumbnail
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const newProject: ProjectStatus = {
        id: data.project_id,
        thumbnail: videoThumbnail,
        title: videoTitle || 'Untitled Project',
        status: 'processing', // Add this line
        progress: 0 // Add this line if needed
      };
      setProjects(prevProjects => [...prevProjects, newProject]);
      setProcessing(false);
      // Clear the form or reset state as needed
      setVideoLink("");
      setVideoThumbnail("");
      setVideoTitle("");
      // ... reset other state variables
    } else {
      setProcessing(false);
      // Handle error
    }
  };

  const handleClipLengthClick = (length: string) => {
    setClipLength(length);
    let min = 0;
    let max = 180;

    switch (length) {
      case "Auto (0m~1m)":
        min = 0;
        max = 60;
        break;
      case "<30s":
        min = 0;
        max = 30;
        break;
      case "30s~60s":
        min = 30;
        max = 60;
        break;
      case "60s~90s":
        min = 60;
        max = 90;
        break;
      case "90s~3m":
        min = 90;
        max = 180;
        break;
    }

    setClipLengthRange({ min, max });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (videoDuration) {
      const newStartTime = Math.floor(videoDuration * (startTimePercentage / 100));
      const newEndTime = Math.floor(videoDuration * (endTimePercentage / 100));
      setStartTime(newStartTime);
      setEndTime(newEndTime);
    }
  }, [videoDuration, startTimePercentage, endTimePercentage]);

  const [timeRange, setTimeRange] = useState<number[]>([0, 100]);

  const handleTimeRangeChange = (event: Event, newValue: number | number[]) => {
    setTimeRange(newValue as number[]);
    if (videoDuration && Array.isArray(newValue)) {
      const newStartTime = Math.floor(videoDuration * (newValue[0] / 100));
      const newEndTime = Math.floor(videoDuration * (newValue[1] / 100));
      setStartTime(newStartTime);
      setEndTime(newEndTime);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`/api/get-projects?userId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.map((project: any) => ({
          id: project._id,
          thumbnail: project.thumbnail,
          title: project.title,
          status: project.status,
          progress: project.progress
        })));
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleProjectClick = (project: ProjectStatus) => {
    if (project.status === 'completed') {
      // Directly navigate to the clips page for completed projects
      router.push(`/project/${project.id}/clips`);
    } else {
      // Navigate to the processing page for projects still in progress
      router.push(`/project/${project.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <header className="flex items-center justify-between py-4">
        <nav className="flex items-center space-x-4"></nav>
        <div className="flex items-center space-x-4"></div>
      </header>
      <main className="flex flex-col items-center space-y-8">
        <div className="flex items-center w-full max-w-2xl space-x-4">
          <Input
            placeholder="Drop a YouTube link"
            className="flex-1 bg-gray-800 text-white"
            value={videoLink}
            onChange={handleVideoLinkChange}
          />
          <Button className="bg-blue-500" onClick={handleProcessClick} disabled={processing}>
            {processing ? "Processing..." : "Get viral clips"}
          </Button>
        </div>
        {(videoThumbnail || videoTitle) && (
          <div className="w-full max-w-2xl flex flex-col items-center space-y-2">
            {videoThumbnail && (
              <div className="flex flex-col items-center w-full">
                <img src={videoThumbnail} alt="Video thumbnail" width={280} height={158} className="mx-auto" />
                {videoTitle && (
                  <p className="text-center font-semibold mt-2 truncate w-full" style={{ maxWidth: '280px' }}>
                    {videoTitle}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-bold">Genre of Video </h2>
          <select 
            className="w-full bg-gray-800 text-white rounded-md p-2 mb-4"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option>Auto</option>
            <option>Podcast</option>
            <option>Anime</option>
            <option>TV shows</option>
          </select>
          <h2 className="text-lg font-bold">Video Quality</h2>
          <select 
            className="w-full bg-gray-800 text-white rounded-md p-2 mb-4"
            value={videoQuality}
            onChange={(e) => setVideoQuality(e.target.value)}
          >
            <option>1080p</option>
            <option>720p</option>
            <option>480p</option>
            <option>360p</option>
          </select>
          <h2 className="text-lg font-bold">Output Video Type</h2>
          <select 
            className="w-full bg-gray-800 text-white rounded-md p-2 mb-4"
            value={videoType}
            onChange={(e) => setVideoType(e.target.value)}
          >
            <option>Portrait</option>
            <option>Landscape</option>
          </select>
          <h2 className="text-lg font-bold">Processing Timeframe</h2>
          <div className="w-full mb-4 relative">
            <Slider
              value={timeRange}
              onChange={handleTimeRangeChange}
              valueLabelDisplay="auto"
              aria-labelledby="time-range-slider"
              getAriaValueText={(value) => `${formatTime((videoDuration ?? 0) * value / 100)}`}
              valueLabelFormat={(value) => formatTime((videoDuration ?? 0) * value / 100)}
            />
            {videoDuration && (
              <div className="flex justify-between mt-2">
                <span>{formatTime(startTime)}</span>
                <span>{formatTime(endTime)}</span>
              </div>
            )}
          </div>
          <h2 className="text-lg font-bold">Preferred Clip Length</h2>
          <div className="flex space-x-2 mb-4">
            <button
              className={`rounded-md px-2 py-1 ${clipLength === "Auto (0m~1m)" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}
              onClick={() => handleClipLengthClick("Auto (0m~1m)")}>
              Auto (0m~1m)
            </button>
            <button
              className={`rounded-md px-2 py-1 ${clipLength === "<30s" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}
              onClick={() => handleClipLengthClick("<30s")}>
              &lt;30s
            </button>
            <button
              className={`rounded-md px-2 py-1 ${clipLength === "30s~60s" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}
              onClick={() => handleClipLengthClick("30s~60s")}
            >
              30s~60s
            </button>
            <button
              className={`rounded-md px-2 py-1 ${clipLength === "60s~90s" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}
              onClick={() => handleClipLengthClick("60s~90s")}
            >
              60s~90s
            </button>
            <button
              className={`rounded-md px-2 py-1 ${clipLength === "90s~3m" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}
              onClick={() => handleClipLengthClick("90s~3m")}
            >
              90s~3m
            </button>
          </div>
          <h2 className="text-lg font-bold">Topic filter by keywords (optional)</h2>
          <input 
            type="text" 
            className="w-full bg-gray-800 text-white rounded-md p-2 mb-4" 
            placeholder="Add keywords, comma-separated"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>
        {projects.length > 0 && (
          <div className="w-full max-w-2xl mt-8">
            <h2 className="text-lg font-bold mb-4">Your Projects</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {projects
                .filter(project => project.status !== 'failed')
                .map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={handleProjectClick}
                  />
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
