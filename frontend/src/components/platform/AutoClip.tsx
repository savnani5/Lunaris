'use client';

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import debounce from 'lodash/debounce';
import { Slider } from '@mui/material';
import { Spinner } from '@/components/platform/Spinner';
import Tooltip from '@mui/material/Tooltip';

import ProjectCard from '@/components/platform/ProjectCard';
import CaptionStyleSelector from '@/components/platform/CaptionStyleSelector';
import { createProject, getProjectsByUserId, updateProjectStatus } from '@/lib/actions/project.actions';
import { getUserById, updateUserCredits } from '@/lib/actions/user.actions';
import { ProjectModel, Project } from '@/lib/database/models/project.model';
import { UserModel } from '@/lib/database/models/user.model';
import CreditPurchasePopup from '@/components/platform/CreditPurchasePopup';
import CreditWarningPopup from '@/components/platform/CreditWarningPopup';
import SubscriptionRequiredPopup from '@/components/platform/SubscriptionRequiredPopup';


const noCaptionVideo = '/assets/caption_styles/no_captions.mp4';
const jreVideo = '/assets/caption_styles/jre.mp4';
const elonVideo = '/assets/caption_styles/elon.mp4';
const imanVideo = '/assets/caption_styles/iman.mp4';
const sadiaVideo = '/assets/caption_styles/sadia.mp4';
const jakeVideo = '/assets/caption_styles/jake.mp4';
const chrisVideo = '/assets/caption_styles/chris.mp4';
const mattVideo = '/assets/caption_styles/matt.mp4';


// Add these styles near the top of the file with other constants
const aspectRatioOptions = [
  {
    id: 'landscape',
    label: 'Landscape (16:9)',
    ratio: '16:9',
    icon: (selected: boolean) => (
      <div className={`w-10 h-6 border-2 ${selected ? 'border-color-1 bg-color-1/20' : 'border-n-3'} rounded-sm`} />
    )
  },
  {
    id: 'portrait',
    label: 'Portrait (9:16)',
    ratio: '9:16',
    icon: (selected: boolean) => (
      <div className={`w-6 h-10 border-2 ${selected ? 'border-color-1 bg-color-1/20' : 'border-n-3'} rounded-sm`} />
    )
  }
];


export function AutoClip() {
  const router = useRouter(); 
  const [videoLink, setVideoLink] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [clipLength, setClipLength] = useState("Auto (30s~60s)");
  const [genre, setGenre] = useState("Auto");
  const [videoQuality, setVideoQuality] = useState("720p");
  const [videoType, setVideoType] = useState("landscape");
  const [keywords, setKeywords] = useState("");
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<UserModel | null>(null);
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
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState("iman");
  const [isPolling, setIsPolling] = useState(false);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [isLoadingVideoDetails, setIsLoadingVideoDetails] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("Basic");
  const [showCreditPurchasePopup, setShowCreditPurchasePopup] = useState(false);
  const [showSubscriptionRequiredPopup, setShowSubscriptionRequiredPopup] = useState(false);
  const [activeXHR, setActiveXHR] = useState<XMLHttpRequest | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const captionStyles = [
    { id: "no_captions", name: "No Captions", videoSrc: noCaptionVideo },
    { id: "iman", name: "Viral Highlights", videoSrc: imanVideo },
    { id: "sadia", name: "Neon Glow", videoSrc: sadiaVideo },
    { id: "chris", name: "Simple Bold", videoSrc: chrisVideo },
    { id: "elon", name: "Classic", videoSrc: elonVideo },
    { id: "matt", name: "Funky", videoSrc: mattVideo },
    { id: "jake", name: "Bold", videoSrc: jakeVideo },
    { id: "jre", name: "Lowercase Magic", videoSrc: jreVideo }
  ];

  const fetchVideoDetails = async (url: string) => {
    setIsLoadingVideoDetails(true);
    try {
      const response = await fetch(`/api/video-details?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Received video details:", data);
        setVideoDuration(parseDuration(data.duration));
        setVideoThumbnail(data.thumbnails.medium?.url || data.thumbnails.default?.url || "");
        setVideoTitle(data.title || "");
      }
    } catch (error) {
      console.error('Error fetching video details:', error);
    } finally {
      setIsLoadingVideoDetails(false);
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

    // Create local URL immediately for preview
    const localUrl = URL.createObjectURL(file);
    setVideoTitle(file.name);
    setIsValidInput(true);
    setVideoLink("");
    setUploadedVideo(file);

    // Start upload in background
    setIsUploading(true);
    try {
      // Get presigned URL
      const presignedUrlResponse = await fetch('/api/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type
        })
      });

      if (!presignedUrlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileKey, bucket } = await presignedUrlResponse.json();

      // Upload to S3 with progress tracking
      const uploadResponse = await fetchWithProgress(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.lengthComputable) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(progress);
          }
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Update uploadedVideo with S3 information
      setUploadedVideo(prev => ({
        ...prev,
        s3Uri: `s3://${bucket}/${fileKey}`,
        bucket,
        key: fileKey
      } as any));

      // Create a video element to get metadata
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          setVideoDuration(video.duration);
          resolve(null);
        };
        video.onerror = reject;
        video.src = localUrl;
      });
      
      // Generate thumbnail
      video.currentTime = 1;
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg');
        setVideoThumbnail(thumbnailUrl);
      }

      video.remove();
      URL.revokeObjectURL(localUrl);

    } catch (error) {
      console.error('Error processing video:', error);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsValidInput(false);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to track upload progress with fetch
  const fetchWithProgress = (url: string, options: RequestInit & { onUploadProgress?: (event: ProgressEvent) => void }): Promise<Response> => {
    const { onUploadProgress, ...fetchOptions } = options;
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      setActiveXHR(xhr); // Store the XHR instance
      
      xhr.open(options.method || 'GET', url);
      
      // Set headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
      }

      // Handle progress
      if (onUploadProgress) {
        xhr.upload.onprogress = onUploadProgress;
      }

      // Handle response
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
          }));
        } else {
          reject(new Error(`HTTP ${xhr.status} - ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      
      // Send the request
      xhr.send(options.body as XMLHttpRequestBodyInit);
    });
  };

  const handleProcessClick = async () => {
    const processingDuration = endTime - startTime;
    const requiredCredits = Math.ceil(processingDuration / 60);

    if (userCredits < requiredCredits) {
      setShowCreditWarning(true);
      return;
    }

    setProcessing(true);
    
    const userId = clerkUser?.id ?? '';
    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? '';

    const processing_timeframe = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    
    try {
      const updatedUser = await updateUserCredits(userId, -requiredCredits);
      if (updatedUser) {
        setUserCredits(updatedUser.credits);
      }

      const newProject = await createProject({
        clerk_user_id: userId,
        youtube_video_url: videoLink,
        title: videoTitle || 'Untitled Project',
        thumbnail: videoThumbnail,
        processing_timeframe: processing_timeframe,
        video_quality: videoQuality,
        required_credits: requiredCredits,
        videoDuration: videoDuration,
        status: 'processing',
        progress: 0,
        stage: 'initializing',
        project_type: 'auto'
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
        formData.append('videoDuration', videoDuration?.toString() || '0');
        formData.append('startTime', startTime.toString());
        formData.append('endTime', endTime.toString());
        formData.append('clipLengthMin', clipLengthRange.min.toString());
        formData.append('clipLengthMax', clipLengthRange.max.toString());
        formData.append('keywords', keywords);
        formData.append('captionStyle', selectedCaptionStyle);
        formData.append('project_type', 'auto');

        if (uploadedVideo) {
          formData.append('videoLink', (uploadedVideo as any).s3Uri);
        } else {
          formData.append('videoLink', videoLink);
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/process-video`, {
            method: "POST",
            body: formData,
            headers: {
              'Accept': 'application/json',
            },
          });

          if (!response.ok) {
            // If Flask server fails to receive the request, clean up S3
            if (uploadedVideo && (uploadedVideo as any).bucket && (uploadedVideo as any).key) {
              try {
                await fetch('/api/cleanup-s3', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    bucket: (uploadedVideo as any).bucket,
                    key: (uploadedVideo as any).key
                  })
                });
              } catch (cleanupError) {
                console.error('Error cleaning up S3:', cleanupError);
              }
            }
            throw new Error('Failed to start video processing');
          }

          // Deduct credits after project creation
          console.log("Project created, starting polling");
          setIsPolling(true);
          pollProjectStatus(userId, newProject._id);
        } catch (error) {
          console.error('Error in video processing:', error);
          await updateProjectStatus(userId, newProject._id, 'failed', 0);
          // Refund credits
          await updateUserCredits(userId, requiredCredits);
          setUserCredits(prevCredits => prevCredits + requiredCredits);
          throw error;
        }

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
      console.error('Error in project creation:', error);
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
      case "Auto (30s~60s)":
        min = 30;
        max = 60;
        break;
      case "<30s":
        min = 0;
        max = 30;
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
    if (clerkUser?.id) {
      fetchUserData(clerkUser.id);
      fetchUserProjects(clerkUser.id);
    }
  }, [clerkUser]);

  const fetchUserData = async (userId: string) => {
    try {
      const userData = await getUserById(userId);
      if (userData) {
        setUser(UserModel.fromObject(userData));
        setUserCredits(userData.credits);
        setCurrentPlan(userData.planType || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchUserProjects = async (userId: string) => {
    try {
      setIsLoadingProjects(true);
      const userProjects = await getProjectsByUserId(userId);
      if (userProjects) {
        setProjects(userProjects);
      }
    } catch (error) {
      console.error('Error fetching user projects:', error);
    } finally {
      setIsLoadingProjects(false);
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
    // Cancel ongoing upload if exists
    if (activeXHR) {
      activeXHR.abort();
      setActiveXHR(null);
    }

    if (uploadedVideo && (uploadedVideo as any).bucket && (uploadedVideo as any).key) {
      try {
        fetch('/api/cleanup-s3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: (uploadedVideo as any).bucket,
            key: (uploadedVideo as any).key
          })
        });
      } catch (error) {
        console.error('Error cleaning up S3:', error);
      }
    }
    
    // Reset states
    setUploadedVideo(null);
    setVideoThumbnail("");
    setVideoTitle("");
    setVideoDuration(null);
    setIsValidInput(false);
    setIsUploading(false);
    setUploadProgress(0);
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
        const status = await fetchProjectStatus(clerkUser?.id ?? '', project._id);
        return { ...project, ...status };
      }
      return project;
    }));

    setProjects(updatedProjects);

    // Check if any projects are still processing
    const stillProcessing = updatedProjects.some(project => project.status === 'processing');
    setIsPolling(stillProcessing);

  }, [projects, clerkUser]);

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

  const handleBuyCredits = () => {
    if (!user?.isSubscribed) {
      setShowSubscriptionRequiredPopup(true);
    } else {
      setShowCreditPurchasePopup(true);
    }
  };

  const formatCredits = (credits: number) => {
    const hours = Math.floor(credits / 60);
    const minutes = credits % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Calculate required credits based on start and end times
  const requiredCredits = Math.floor((endTime - startTime) / 60);

  return (
    <div className="min-h-screen bg-black text-n-1 px-0 py-1 sm:p-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 sm:mb-0">Auto Create Clips</h1>
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
          <Tooltip
            title={
              <div className="text-n-1">
                <p className="font-semibold mb-1">
                  {user?.isSubscribed ? `${currentPlan} Plan` : "Promotional Credits"}
                </p>
                <p className="text-sm text-n-3">1 credit = 1 minute of video processing</p>
              </div>
            }
            arrow
            classes={{
              tooltip: 'bg-n-6/70 p-2 rounded-lg',
              arrow: 'text-n-6/70'
            }}
          >
            <div className="flex items-center bg-n-6/70 rounded-full px-3 py-1 cursor-help">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-green-500 font-semibold whitespace-nowrap">{formatCredits(userCredits)}</span>
            </div>
          </Tooltip>
          <Button 
            className="bg-color-1 hover:bg-color-1/80 text-n-1 transition-colors duration-200 whitespace-nowrap"
            onClick={handleBuyCredits}
          >
            Add credits
          </Button>
        </div>
      </header>
      <main className="mt-6 space-y-6 max-w-4xl mx-auto"> {/* Reduced top margin and vertical spacing */}
        <div className="bg-n-7/70 rounded-2xl p-4 sm:p-6 space-y-4"> {/* Reduced padding and vertical spacing */}
          <h2 className="text-2xl font-semibold mb-2">Video Source</h2> {/* Added bottom margin */}
          <div className="flex items-center w-full space-x-2 sm:space-x-4">
            <Input
              placeholder="Drop a YouTube link"
              className="flex-1 bg-n-6 text-n-1 border-n-5 focus:border-color-1"
              value={videoLink}
              onChange={handleVideoLinkChange}
              disabled={isUploading || !!uploadedVideo}
            />
            <Button 
              className="bg-color-1 hover:bg-color-1/80 text-n-1 transition-colors duration-200 text-xs sm:text-base whitespace-nowrap px-2 sm:px-4" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !!videoLink}
            >
              {isUploading ? `${uploadProgress}%` : "Upload Video"}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handleFileUpload}
            />
          </div>
          {isLoadingVideoDetails ? (
            <div className="w-full flex justify-center items-center py-8">
              <Spinner className="w-8 h-8 text-color-1" />
            </div>
          ) : (
            (videoThumbnail || videoTitle) && (
              <div className="w-full flex flex-col items-center space-y-2 relative">
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
            )
          )}
        </div>

        <div className="bg-n-7/70 rounded-2xl p-4 sm:p-6 space-y-4"> {/* Reduced padding and vertical spacing */}
          <h2 className="text-2xl font-semibold mb-2">Clip Settings</h2> {/* Added bottom margin */}
          <div className="space-y-3"> {/* Added a wrapper with reduced vertical spacing */}
            <div>
              <div className="flex items-center mb-1"> {/* Reduced bottom margin */}
                <h3 className="text-lg font-bold mr-2">Genre of Video</h3>
              </div>
              <select 
                className="w-full bg-n-6 text-n-1 rounded-md p-2"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              >
                <option>Auto</option>
                <option>Podcast</option>
                {/* <option>Anime</option> */}
                <option>TV shows</option>
              </select>
            </div>
            <div>
              <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold mb-1">Video Quality</h3>
              <span className="text-xs sm:text-sm text-n-3 whitespace-nowrap">(reduce quality for faster processing)</span>
              </div>
              <select 
                className="w-full bg-n-6 text-n-1 rounded-md p-2"
                value={videoQuality}
                onChange={(e) => setVideoQuality(e.target.value)}
              >
                <option>1080p</option>
                <option>720p</option>
                <option>480p</option>
                <option>360p</option>
              </select>
            </div>
            <div className="flex items-center mb-2">
            <h3 className="text-lg font-bold mr-2">Processing Timeframe</h3>
              <div className="bg-gray-700 bg-opacity-50 text-green-500 text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 rounded flex items-center">
                <span className="hidden sm:inline">required credits</span>
                <span className="sm:hidden">credits</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5 ml-1 sm:ml-2 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="ml-1">{requiredCredits}</span>
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
                sx={{
                  color: '#8B5CF6', // Purple color
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#8B5CF6',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: '#4B5563',
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#8B5CF6',
                  },
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: '#8B5CF6',
                  },
                }}
              />
              {videoDuration && (
                <>
                  <div className="flex justify-between mt-2">
                    <span>{formatTime(startTime)}</span>
                    <span>{formatTime(endTime)}</span>
                  </div>
                  {/* Removed the credits display below the slider */}
                </>
              )}
            </div>
            <h3 className="text-lg font-bold">Preferred Clip Length</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {/* <button
                className={`rounded-md px-2 py-1 ${clipLength === "Auto (0m~1m)" ? "bg-purple-500 text-white" : "bg-gray-600 text-white"}`}
                onClick={() => handleClipLengthClick("Auto (0m~1m)")}>
                Auto (0m~1m)
              </button> */}
              <button
                className={`rounded-md px-2 py-1 ${clipLength === "Auto (30s~60s)" ? "bg-purple-500 text-white" : "bg-gray-600 text-white"}`}
                onClick={() => handleClipLengthClick("Auto (30s~60s)")}
              >
                Auto (30s~60s)
              </button> 
              <button
                className={`rounded-md px-2 py-1 ${clipLength === "<30s" ? "bg-purple-500 text-white" : "bg-gray-600 text-white"}`}
                onClick={() => handleClipLengthClick("<30s")}>
                &lt;30s
              </button>
              <button
                className={`rounded-md px-2 py-1 ${clipLength === "60s~90s" ? "bg-purple-500 text-white" : "bg-gray-600 text-white"}`}
                onClick={() => handleClipLengthClick("60s~90s")}
              >
                60s~90s
              </button>
              <button
                className={`rounded-md px-2 py-1 ${clipLength === "90s~3m" ? "bg-purple-500 text-white" : "bg-gray-600 text-white"}`}
                onClick={() => handleClipLengthClick("90s~3m")}
              >
                90s~3m
              </button>
            </div>
            <h3 className="text-lg font-bold">Topic filter by keywords (optional)</h3>
            <input 
              type="text" 
              className="w-full bg-n-6 text-n-1 rounded-md p-2 mb-4" 
              placeholder="Add keywords, comma-separated"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-n-7/70 rounded-2xl p-4 sm:p-8 space-y-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-3">Output Aspect Ratio</h3>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {aspectRatioOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setVideoType(option.id)}
                    className={`flex items-center justify-center space-x-3 p-2 sm:p-4 rounded-lg border-2 transition-all
                      ${videoType === option.id 
                        ? 'border-color-1 bg-n-6/50' 
                        : 'border-n-5/50 hover:border-n-4'}`}
                  >
                    {option.icon(videoType === option.id)}
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <CaptionStyleSelector
              styles={captionStyles}
              selectedStyle={selectedCaptionStyle}
              onStyleSelect={handleCaptionStyleSelect}
            />
          </div>
        </div>

        <Button 
          className="w-full bg-color-1 hover:bg-color-1/80 text-n-1 py-4 text-lg font-semibold rounded-full transition-colors duration-200" 
          onClick={handleProcessClick} 
          disabled={
            processing || 
            isUploading || 
            !isValidInput || 
            (!videoLink && !uploadedVideo) ||
            isLoadingVideoDetails
          }
        >
          {processing ? "Processing..." : "Get viral clips"}
        </Button>

        {projects.length > 0 && (
          <div className="w-full mt-8">
            
          </div>
        )}
      </main>
      <h2 className="text-lg font-bold mb-4 max-w-[1920px] mx-auto px-1 mt-8">Auto Clip Projects</h2>
      {isLoadingProjects ? (
        <div className="flex justify-center items-center py-8">
          <Spinner className="w-8 h-8 text-color-1" />
        </div>
      ) : projects.length > 0 ? (
        <div className="max-w-[1920px] mx-auto px-1 mt-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {projects
              .filter(project => project.status !== 'failed' && project.project_type === 'auto')
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
      ) : (
        <p className="text-center text-n-3">No projects found. Start creating your first project!</p>
      )}
      {showCreditWarning && (
        <CreditWarningPopup 
          onClose={() => setShowCreditWarning(false)}
          availableCredits={userCredits}
          requiredCredits={Math.ceil((endTime - startTime) / 60)}
        />
      )}
      {showCreditPurchasePopup && user && (
        <CreditPurchasePopup
          onClose={() => setShowCreditPurchasePopup(false)}
          userId={user.clerk_id}
          planType={user.planType || ''}
        />
      )}
      {showSubscriptionRequiredPopup && (
        <SubscriptionRequiredPopup
          onClose={() => setShowSubscriptionRequiredPopup(false)}
        />
      )}
    </div>
  );
}