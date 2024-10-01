'use client';

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import debounce from 'lodash/debounce';
import { Slider } from '@mui/material';

import ProjectCard from '@/components/ProjectCard';
import CaptionStyleSelector from '@/components/CaptionStyleSelector';
import { createProject, getProjectsByUserId, updateProjectStatus, getProjectById } from '@/lib/actions/project.actions';
import { getUserById } from '@/lib/actions/user.actions';
import { ProjectModel, Project } from '@/lib/database/models/project.model';
import { backend_url } from '@/lib/constants';


const bigBangVideo = '/assets/caption_styles/big_bang.mp4';
const elonVideo = '/assets/caption_styles/elon.mp4';
const imanGadziVideo = '/assets/caption_styles/iman_gadzi.mp4';
const ycVideo = '/assets/caption_styles/yc.mp4';
const jakePaulVideo = '/assets/caption_styles/jake_paul.mp4';
const chrisWilliamsonVideo = '/assets/caption_styles/chris_williamson.mp4';
const mattRifeVideo = '/assets/caption_styles/matt_rife.mp4';


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
  const [userCredits, setUserCredits] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [startTimePercentage, setStartTimePercentage] = useState(0);
  const [endTimePercentage, setEndTimePercentage] = useState(100);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clipLengthRange, setClipLengthRange] = useState({ min: 0, max: 180 });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isValidInput, setIsValidInput] = useState(false);
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState("elon");
  const [isPolling, setIsPolling] = useState(false);

  const captionStyles = [
    { id: "big_bang", name: "Big Bang", videoSrc: bigBangVideo },
    { id: "elon", name: "Elon Musk", videoSrc: elonVideo },
    { id: "iman_gadzi", name: "Iman Gadzi", videoSrc: imanGadziVideo },
    { id: "yc", name: "YC", videoSrc: ycVideo },
    { id: "jake_paul", name: "Jake Paul", videoSrc: jakePaulVideo },
    { id: "chris_williamson", name: "Chris Williamson", videoSrc: chrisWilliamsonVideo },
    { id: "matt_rife", name: "Matt Rife", videoSrc: mattRifeVideo },
  ];

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
    setIsValidInput(!!newLink);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadedVideo(file);
    setVideoTitle(file.name);
    setIsValidInput(true);

    // Create a temporary URL for the video file
    const videoURL = URL.createObjectURL(file);

    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
    };

    video.onloadeddata = () => {
      console.log("Video data loaded, waiting to generate thumbnail...");
      // Wait a short moment to ensure the video is ready
      setTimeout(() => {
        video.currentTime = 1; // Set to 1 second to avoid potential black frames at the start
      }, 1000);
    };

    video.onseeked = () => {
      console.log("Video seeked, generating thumbnail...");
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnailUrl = canvas.toDataURL('image/jpeg');
      console.log("Thumbnail generated:", thumbnailUrl.substring(0, 100) + "...");
      setVideoThumbnail(thumbnailUrl);
      URL.revokeObjectURL(videoURL);
    };

    video.src = videoURL;
    video.load();

    // Simulating upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
      }
    }, 500);
  };

  const handleProcessClick = async () => {
    setProcessing(true);
    
    const userId = user?.id ?? '';
    const email = user?.primaryEmailAddress?.emailAddress ?? '';

    const processing_timeframe = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    const processingDuration = endTime - startTime;
    
    try {
      const newProject = await createProject({
        clerk_user_id: userId,
        youtube_video_url: videoLink,
        title: videoTitle || 'Untitled Project',
        thumbnail: videoThumbnail,
        processing_timeframe: processing_timeframe,
        video_quality: videoQuality,
        required_credits: Math.ceil(processingDuration / 60),
        videoDuration: videoDuration,
        status: 'processing',
        progress: 0,
        stage: 'initializing'
      } as Omit<ProjectModel, '_id' | 'created_at' | 'clip_ids' | 'transcript'>);

      if (newProject) {
        // Send data to Flask backend for processing
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('email', email);
        formData.append('projectId', newProject._id);
        formData.append('videoTitle', videoTitle);
        formData.append('processing_timeframe', processing_timeframe);
        formData.append('genre', genre);
        formData.append('videoQuality', videoQuality);
        formData.append('videoType', videoType);
        formData.append('startTime', startTime.toString());
        formData.append('endTime', endTime.toString());
        formData.append('clipLengthMin', clipLengthRange.min.toString());
        formData.append('clipLengthMax', clipLengthRange.max.toString());
        formData.append('keywords', keywords);
        formData.append('captionStyle', selectedCaptionStyle);


        // If there's an uploaded video file, append it to the formData
        if (uploadedVideo) {
          formData.append('video', uploadedVideo);
        } else {
          formData.append('videoLink', videoLink);
        }

        const response = await fetch(`${backend_url}/api/process-video`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          // Start polling for project status
          setIsPolling(true);
          pollProjectStatus(userId, newProject._id);
        } else {
          console.error('Failed to start video processing');
          // Update project status to 'failed'
          await updateProjectStatus(userId, newProject._id, 'failed', 0);
        }

        // Update local state
        setProjects(prevProjects => [
          ...prevProjects,
          {
            ...newProject,
            id: newProject._id,
            status: 'processing',
            progress: 0,
          }
        ]);
      }
    } catch (error) {
      console.error('Error processing video:', error);
    } finally {
      setProcessing(false);
    }
  };

  const pollProjectStatus = async (userId: string, projectId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/project-status?userId=${userId}&projectId=${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setProjects(prevProjects =>
            prevProjects.map(p =>
              p._id === projectId
                ? { ...p, status: data.status, progress: data.progress, stage: data.stage }
                : p
            )
          );

          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(intervalId);
            setIsPolling(false);
          }
        } else {
          console.error('Failed to fetch project status');
        }
      } catch (error) {
        console.error('Error polling project status:', error);
      }
    }, 5000);
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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
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
      fetchUserCredits(user.id);
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      if (user?.id) {
        const fetchedProjects = await getProjectsByUserId(user.id);
        if (fetchedProjects) {
          // Fetch status for each project
          const updatedProjects = await Promise.all(fetchedProjects.map(async (project: Project) => {
            const status = await fetchProjectStatus(user.id, project._id);
            return { ...project, ...status };
          }));
          setProjects(updatedProjects);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchProjectStatus = async (userId: string, projectId: string): Promise<Partial<Project>> => {
    try {
      const response = await fetch(`/api/project-status?userId=${userId}&projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status,
          progress: data.progress,
          stage: data.stage
        };
      }
    } catch (error) {
      console.error('Error fetching project status:', error);
    }
    return {};
  };

  const fetchUserCredits = async (userId: string) => {
    try {
      const userData = await getUserById(userId);
      if (userData) {
        setUserCredits(userData.credits);
      }
    } catch (error) {
      console.error('Error fetching user credits:', error);
    }
  };

  const handleProjectClick = (project: Project) => {
    if (project.status === 'completed') {
      // Directly navigate to the clips page for completed projects
      router.push(`/project/${project._id}/clips`);
    } else {
      // Navigate to the processing page for projects still in progress
      router.push(`/project/${project._id}`);
    }
  };

  const handleRemoveVideo = () => {
    setUploadedVideo(null);
    setVideoThumbnail("");
    setVideoTitle("");
    setVideoDuration(null);
    setIsValidInput(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCaptionStyleSelect = (styleId: string) => {
    setSelectedCaptionStyle(styleId);
  };

  const pollProjectStatuses = useCallback(async () => {
    const processingProjects = projects.filter(project => project.status === 'processing');
    
    if (processingProjects.length === 0) {
      setIsPolling(false);
      return;
    }

    const updatedProjects = await Promise.all(projects.map(async (project: Project) => {
      if (project.status === 'processing') {
        const status = await fetchProjectStatus(user?.id ?? '', project._id);
        return { ...project, ...status };
      }
      return project;
    }));

    setProjects(updatedProjects);

    // Check if any projects are still processing
    const stillProcessing = updatedProjects.some(project => project.status === 'processing');
    setIsPolling(stillProcessing);

  }, [projects, user]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPolling) {
      intervalId = setInterval(pollProjectStatuses, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling, pollProjectStatuses]);

  useEffect(() => {
    const hasProcessingProjects = projects.some(project => project.status === 'processing');
    setIsPolling(hasProcessingProjects);
  }, [projects]);

  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <header className="flex items-center justify-between py-4">
        <nav className="flex items-center space-x-4"></nav>
        <div className="flex items-center space-x-4"></div>
      </header>
      <main className="flex flex-col items-center space-y-8">
        <h1>Welcome, {user?.firstName}</h1>
        <p>You have {userCredits} minutes of credits left.</p>
        <div className="flex items-center w-full max-w-2xl space-x-4">
          <Input
            placeholder="Drop a YouTube link"
            className="flex-1 bg-gray-800 text-white"
            value={videoLink}
            onChange={handleVideoLinkChange}
            disabled={isUploading || !!uploadedVideo}
          />
          <Button 
            className="bg-blue-500" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !!videoLink}
          >
            {isUploading ? `Uploading ${uploadProgress}%` : "Upload Video"}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="video/*"
            onChange={handleFileUpload}
          />
        </div>
        {(videoThumbnail || videoTitle) && (
          <div className="w-full max-w-2xl flex flex-col items-center space-y-2 relative">
            {videoThumbnail && (
              <div className="flex flex-col items-center w-full relative">
                <div className="relative">
                  <img 
                    src={videoThumbnail} 
                    alt="Video thumbnail" 
                    width={280} 
                    height={158} 
                    className="mx-auto"
                    onError={() => console.error("Error loading thumbnail")}
                    onLoad={() => console.log("Thumbnail loaded successfully")}
                  />
                  {uploadedVideo && (
                    <Button
                      className="absolute -top-3 -right-3 bg-transparent hover:bg-gray-800 text-white rounded-full p-1 transition-colors duration-200"
                      onClick={handleRemoveVideo}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </Button>
                  )}
                </div>
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
            {/* <option>Anime</option> */}
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
          <h2 className="text-lg font-bold">Output Aspect Ratio</h2>
          <select 
            className="w-full bg-gray-800 text-white rounded-md p-2 mb-4"
            value={videoType}
            onChange={(e) => setVideoType(e.target.value)}
          >
            <option value="portrait">Portrait (9:16)</option>
            <option value="landscape">Landscape (16:9)</option>
          </select>
          <div className="flex items-center mb-2">
            <h2 className="text-lg font-bold mr-2">Processing Timeframe</h2>
            <div className="bg-gray-700 bg-opacity-50 text-white text-xs font-semibold px-2 py-2 rounded">
              save credits
            </div>
          </div>
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
        <CaptionStyleSelector
          styles={captionStyles}
          selectedStyle={selectedCaptionStyle}
          onStyleSelect={handleCaptionStyleSelect}
        />
        <Button 
          className="w-full max-w-2xl bg-blue-500 mt-4 py-3 text-lg font-semibold" 
          onClick={handleProcessClick} 
          disabled={processing || isUploading || !isValidInput}
        >
          {processing ? "Processing..." : "Get viral clips"}
        </Button>
        {projects.length > 0 && (
          <div className="w-full mt-8 px-2">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-lg font-bold mb-4">Your Projects</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {projects
                  .filter(project => project.status !== 'failed')
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      onClick={() => handleProjectClick(project)}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}