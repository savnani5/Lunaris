'use client';

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import debounce from 'lodash/debounce';
import { Slider } from '@mui/material';

import ProjectCard from '@/components/ProjectCard';
import CaptionStyleSelector from '@/components/CaptionStyleSelector';

const bigBangVideo = '/assets/caption_styles/big_bang.mp4';
const elonVideo = '/assets/caption_styles/elon.mp4';
const imanGadziVideo = '/assets/caption_styles/iman_gadzi.mp4';
const ycVideo = '/assets/caption_styles/yc.mp4';
const jakePaulVideo = '/assets/caption_styles/jake_paul.mp4';
const chrisWilliamsonVideo = '/assets/caption_styles/chris_williamson.mp4';
const mattRifeVideo = '/assets/caption_styles/matt_rife.mp4';


interface ProjectStatus {
  id: string;
  clerkUserId: string;
  youtubeVideoUrl: string;
  title: string;
  thumbnail: string;
  clipIds: string[];
  transcript: string | null;
  status: 'completed' | 'processing' | 'failed';
  createdAt: string;
  videoDuration: number;
  progress?: number;
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isValidInput, setIsValidInput] = useState(false);
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState("pod_p");

  const captionStyles = [
    { id: "big_bang", name: "Big Bang", videoSrc: bigBangVideo },
    { id: "elon", name: "Elon Musk", videoSrc: elonVideo },
    { id: "iman_gadzi", name: "Iman Gadzi", videoSrc: imanGadziVideo },
    { id: "yc", name: "YC", videoSrc: ycVideo },
    { id: "jake_paul", name: "Jake Paul", videoSrc: jakePaulVideo },
    { id: "chris_williamson", name: "Chris Williamson", videoSrc: chrisWilliamsonVideo },
    { id: "matt_rife", name: "Matt Rife", videoSrc: mattRifeVideo },
  ];

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

    const formData = new FormData();
    const formFields = {
      userId,
      email,
      genre,
      videoQuality,
      videoType,
      startTime: startTime.toString(),
      endTime: endTime.toString(),
      clipLengthMin: clipLengthRange.min.toString(),
      clipLengthMax: clipLengthRange.max.toString(),
      keywords,
      videoTitle,
      videoThumbnail,
      videoDuration: videoDuration?.toString() || '0', // Add this line
      captionStyle: selectedCaptionStyle,
    };

    Object.entries(formFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

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
      const data = await response.json();
      const newProject: ProjectStatus = {
        id: data.project_id,
        clerkUserId: userId,
        youtubeVideoUrl: videoLink,
        title: videoTitle || 'Untitled Project',
        thumbnail: videoThumbnail,
        clipIds: [],
        transcript: null,
        status: 'processing',
        createdAt: new Date().toISOString(),
        videoDuration: videoDuration || 0,
        progress: 0,
      };
      setProjects(prevProjects => [...prevProjects, newProject]);
      setProcessing(false);
      // Clear the form or reset state as needed
      setVideoLink("");
      setVideoThumbnail("");
      setVideoTitle("");
      setUploadedVideo(null);
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
          clerkUserId: project.clerk_user_id,
          youtubeVideoUrl: project.youtube_video_url,
          title: project.title,
          thumbnail: project.thumbnail,
          clipIds: project.clip_ids,
          transcript: project.transcript,
          status: project.status,
          createdAt: project.created_at,
          videoDuration: project.video_duration,
          progress: project.progress || 0,
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
                  .sort((a, b) => {
                    if (a.status === 'processing' && b.status !== 'processing') return -1;
                    if (b.status === 'processing' && a.status !== 'processing') return 1;
                    return 0;
                  })
                  .map((project) => (
                    <ProjectCard
                      key={project.id}
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
