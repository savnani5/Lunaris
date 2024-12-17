'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import ReactPlayer from 'react-player';
import { Input } from "@/components/ui/input";

interface VideoClipEditorProps {
  videoUrl: string;
  onClipsChange: (clips: ClipTimeframe[]) => void;
  isYouTube?: boolean;
  onRemoveVideo?: () => void;
}

interface ClipTimeframe {
  id: string;
  startTime: number;
  endTime: number;
}

interface TimeInput {
  hours: string;
  minutes: string;
  seconds: string;
}

interface ClipTimeInputs {
  [clipId: string]: {
    start: TimeInput;
    end: TimeInput;
  };
}

const timeToSeconds = (time: TimeInput): number => {
  const hours = parseInt(time.hours) || 0;
  const minutes = parseInt(time.minutes) || 0;
  const seconds = parseInt(time.seconds) || 0;
  return hours * 3600 + minutes * 60 + seconds;
};

const secondsToTime = (totalSeconds: number): TimeInput => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return {
    hours: hours.toString(),
    minutes: minutes.toString(),
    seconds: seconds.toString()
  };
};

export function VideoClipEditor({ videoUrl, onClipsChange, isYouTube = false, onRemoveVideo }: VideoClipEditorProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeRange, setTimeRange] = useState<number[]>([0, 100]);
  const [selectedClip, setSelectedClip] = useState<ClipTimeframe | null>(null);
  const [clips, setClips] = useState<ClipTimeframe[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [shouldUpdateProgress, setShouldUpdateProgress] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const speedOptions = [0.5, 1, 1.5, 2, 2.5, 3];
  const timelineRef = useRef<HTMLDivElement>(null);
  const [clipPlaying, setClipPlaying] = useState<string | null>(null);
  const [clipTimeInputs, setClipTimeInputs] = useState<ClipTimeInputs>({});
  const [inputError, setInputError] = useState("");
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dragType, setDragType] = useState<'start' | 'end' | null>(null);
  const [lastSelectedClipId, setLastSelectedClipId] = useState<string | null>(null);
  const [touchActive, setTouchActive] = useState(false);

  // Add this effect to handle video URL changes
  useEffect(() => {
    if (!isYouTube && videoUrl) {
      // Revoke previous URL to prevent memory leaks
      if (uploadedVideoUrl) {
        URL.revokeObjectURL(uploadedVideoUrl);
      }
      // Create new URL for uploaded video
      const newUrl = URL.createObjectURL(new Blob([videoUrl], { type: 'video/mp4' }));
      setUploadedVideoUrl(newUrl);
      setIsVideoReady(false); // Reset ready state for new video
    }
    
    // Cleanup function
    return () => {
      if (uploadedVideoUrl) {
        URL.revokeObjectURL(uploadedVideoUrl);
      }
    };
  }, [videoUrl, isYouTube]);

  // Add this effect to handle video loading
  useEffect(() => {
    setIsLoading(true);
    setIsVideoReady(false);
    setIsPlaying(false);
    
    // Reset player when URL changes
    if (playerRef.current) {
      playerRef.current.seekTo(0);
    }
  }, [videoUrl]);

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const handleProgress = (state: { played: number; playedSeconds: number }) => {
    if (!isVideoReady) return;
    
    if (shouldUpdateProgress && !isSeeking) {
      setCurrentTime(state.playedSeconds);
      
      if (clipPlaying) {
        const clip = clips.find(c => c.id === clipPlaying);
        if (clip && state.playedSeconds >= clip.endTime) {
          setClipPlaying(null);
          setIsPlaying(false);
        }
      }
    }
  };

  const handleReady = () => {
    console.log("Video ready event triggered");
    setIsReady(true);
    setIsVideoReady(true);
    setIsLoading(false);
    setIsPlaying(true);
  };

  const handleError = (error: any) => {
    console.error("Video player error:", error);
    setIsLoading(false);
    setIsVideoReady(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addNewClip = () => {
    const newClip = {
      id: `clip-${Date.now()}`,
      startTime: Number(currentTime),
      endTime: Math.min(Number(currentTime) + 60, duration)
    };
    const updatedClips = [...clips, newClip];
    setClips(updatedClips);
    
    // Initialize time inputs for new clip
    setClipTimeInputs(prev => ({
      ...prev,
      [newClip.id]: {
        start: secondsToTime(newClip.startTime),
        end: secondsToTime(newClip.endTime)
      }
    }));
    
    setSelectedClip(newClip);
    const startPercentage = (newClip.startTime / duration) * 100;
    const endPercentage = (newClip.endTime / duration) * 100;
    setTimeRange([startPercentage, endPercentage]);
    onClipsChange(updatedClips);
  };

  const removeClip = (clipId: string) => {
    const updatedClips = clips.filter(clip => clip.id !== clipId);
    setClips(updatedClips);
    
    // Clean up time inputs when removing clip
    setClipTimeInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[clipId];
      return newInputs;
    });
    
    if (selectedClip?.id === clipId) {
      setSelectedClip(null);
    }
    onClipsChange(updatedClips);
  };

  const selectClip = (clip: ClipTimeframe) => {
    const startPercentage = (clip.startTime / duration) * 100;
    const endPercentage = (clip.endTime / duration) * 100;
    setTimeRange([startPercentage, endPercentage]);

    // Only seek to start time if:
    // 1. Selecting a different clip than currently selected
    // 2. Reselecting the same clip after it was deselected
    if (clip.id !== selectedClip?.id || clip.id !== lastSelectedClipId) {
      setCurrentTime(clip.startTime);
      if (playerRef.current) {
        playerRef.current.seekTo(clip.startTime, 'seconds');
      }
      setIsPlaying(true);
    }

    setSelectedClip(clip);
    setLastSelectedClipId(clip.id);

    // Initialize time inputs when selecting clip
    setClipTimeInputs(prev => ({
      ...prev,
      [clip.id]: {
        start: secondsToTime(clip.startTime),
        end: secondsToTime(clip.endTime)
      }
    }));
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isVideoReady) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = duration * clickPosition;
    
    setCurrentTime(newTime);
    if (playerRef.current) {
      playerRef.current.seekTo(newTime, 'seconds');
    }
    
    setIsPlaying(true);
    
    setSelectedClip(null);
  };

  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSeeking) {
      const rect = e.currentTarget.getBoundingClientRect();
      const hoverPosition = (e.clientX - rect.left) / rect.width;
      const newTime = duration * hoverPosition;
      
      if (dragType === 'start' && selectedClip) {
        const updatedClip = {
          ...selectedClip,
          startTime: Math.min(newTime, selectedClip.endTime - 1)
        };
        updateClip(updatedClip);
      } else if (dragType === 'end' && selectedClip) {
        const updatedClip = {
          ...selectedClip,
          endTime: Math.max(newTime, selectedClip.startTime + 1)
        };
        updateClip(updatedClip);
      } else {
        setCurrentTime(newTime);
        if (playerRef.current) {
          playerRef.current.seekTo(newTime, 'seconds');
        }
      }
    }
  };

  const handleStartDrag = (
    event: React.MouseEvent,
    targetClip: ClipTimeframe,
    handle: 'start' | 'end'
  ) => {
    event.preventDefault();
    const timeline = timelineRef.current;
    if (!timeline) return;

    const timelineRect = timeline.getBoundingClientRect();
    const startX = event.clientX;
    const clipStartPercent = (targetClip.startTime / duration) * 100;
    const clipEndPercent = (targetClip.endTime / duration) * 100;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / timelineRect.width) * 100;

      if (handle === 'start') {
        const newStartPercent = Math.max(0, Math.min(clipStartPercent + deltaPercent, clipEndPercent - 1));
        const newStartTime = (newStartPercent / 100) * duration;
        updateClip({
          ...targetClip,
          startTime: newStartTime
        });
      } else {
        const newEndPercent = Math.min(100, Math.max(clipStartPercent + 1, clipEndPercent + deltaPercent));
        const newEndTime = (newEndPercent / 100) * duration;
        updateClip({
          ...targetClip,
          endTime: newEndTime
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleStopDrag = useCallback(() => {
    if (isSeeking) {
      setIsSeeking(false);
      setDragType(null);
      setShouldUpdateProgress(true);
      setIsPlaying(true);
    }
  }, [isSeeking]);

  useEffect(() => {
    const handleMouseUp = () => handleStopDrag();
    const handleMouseLeave = () => handleStopDrag();

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleStopDrag]);

  const validateAndUpdateTime = (
    clipId: string, 
    type: 'start' | 'end', 
    field: 'hours' | 'minutes' | 'seconds', 
    value: string
  ) => {
    // Allow empty string or numbers only
    if (value !== '' && !/^\d+$/.test(value)) return;

    // Validate ranges
    if (field === 'minutes' || field === 'seconds') {
      if (parseInt(value) >= 60) return;
    }

    // Update the input state
    setClipTimeInputs(prev => {
      const newInputs = {
        ...prev,
        [clipId]: {
          ...prev[clipId],
          [type]: {
            ...prev[clipId]?.[type],
            [field]: value
          }
        }
      };

      // Calculate new times
      const startSeconds = timeToSeconds(newInputs[clipId].start);
      const endSeconds = timeToSeconds(newInputs[clipId].end);

      // Validate and update clip if times are valid
      if (!isNaN(startSeconds) && !isNaN(endSeconds) && 
          startSeconds < endSeconds && 
          startSeconds >= 0 && endSeconds <= duration) {
        
        setInputError("");
        const updatedClips = clips.map(c => 
          c.id === clipId ? { ...c, startTime: startSeconds, endTime: endSeconds } : c
        );
        setClips(updatedClips);
        onClipsChange(updatedClips);
      } else {
        if (startSeconds >= endSeconds) {
          setInputError("Start time must be less than end time");
        } else if (endSeconds > duration) {
          setInputError(`Time cannot exceed video duration (${formatTime(duration)})`);
        }
      }

      return newInputs;
    });
  };

  // Add this effect to initialize time inputs when a clip is selected
  useEffect(() => {
    if (selectedClip) {
      const startTime = secondsToTime(selectedClip.startTime);
      const endTime = secondsToTime(selectedClip.endTime);
      
      setClipTimeInputs(prev => ({
        ...prev,
        [selectedClip.id]: {
          start: startTime,
          end: endTime
        }
      }));
    }
  }, [selectedClip]);

  // Update the click outside handler to also clear lastSelectedClipId
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedClip && timelineRef.current) {
        const isTimelineClick = timelineRef.current.contains(event.target as Node);
        const clipsList = document.querySelector('.clips-list');
        const isClipsListClick = clipsList?.contains(event.target as Node);

        if (!isTimelineClick && !isClipsListClick) {
          setSelectedClip(null);
          setLastSelectedClipId(null); // Clear last selected clip id
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedClip]);

  // Add this function to handle clip updates
  const updateClip = (updatedClip: ClipTimeframe) => {
    const updatedClips = clips.map(clip => 
      clip.id === updatedClip.id ? updatedClip : clip
    );
    setClips(updatedClips);
    onClipsChange(updatedClips);
    
    // Update time range for the selected clip
    if (selectedClip?.id === updatedClip.id) {
      const startPercentage = (updatedClip.startTime / duration) * 100;
      const endPercentage = (updatedClip.endTime / duration) * 100;
      setTimeRange([startPercentage, endPercentage]);

      // Update time inputs when dragging sliders
      setClipTimeInputs(prev => ({
        ...prev,
        [updatedClip.id]: {
          start: secondsToTime(updatedClip.startTime),
          end: secondsToTime(updatedClip.endTime)
        }
      }));
    }
  };

  // Add click handler for the video container
  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't trigger if clicking controls
    if ((e.target as HTMLElement).closest('.video-controls')) {
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleTouchStart = (e: React.TouchEvent, clip: ClipTimeframe, type: 'start' | 'end') => {
    e.preventDefault();
    setTouchActive(true);
    setIsSeeking(true);
    setDragType(type);
    setSelectedClip(clip);
    setShouldUpdateProgress(false);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchActive || !timelineRef.current || !selectedClip || !dragType) return;

    e.preventDefault(); // Prevent scrolling while dragging

    const rect = timelineRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const touchPosition = (touch.clientX - rect.left) / rect.width;
    const newTime = duration * Math.max(0, Math.min(1, touchPosition));

    if (dragType === 'start') {
      const updatedClip = {
        ...selectedClip,
        startTime: Math.min(Math.max(0, newTime), selectedClip.endTime - 1)
      };
      updateClip(updatedClip);
    } else if (dragType === 'end') {
      const updatedClip = {
        ...selectedClip,
        endTime: Math.min(Math.max(selectedClip.startTime + 1, newTime), duration)
      };
      updateClip(updatedClip);
    }
  }, [touchActive, selectedClip, dragType, duration, updateClip]);

  const handleTouchEnd = useCallback(() => {
    if (touchActive) {
      setTouchActive(false);
      setIsSeeking(false);
      setDragType(null);
      setShouldUpdateProgress(true);
      setIsPlaying(true);
    }
  }, [touchActive]);

  useEffect(() => {
    const handleTouchMoveWithPrevent = (e: TouchEvent) => {
      if (touchActive) {
        e.preventDefault(); // Prevent scrolling while dragging
        handleTouchMove(e);
      }
    };

    if (timelineRef.current) {
      document.addEventListener('touchmove', handleTouchMoveWithPrevent, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMoveWithPrevent);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd, touchActive]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-2 sm:space-y-4">
        <div 
          className="relative aspect-video bg-black rounded-lg overflow-hidden cursor-pointer w-full max-h-[85vh] sm:max-h-none" 
          onClick={handleVideoClick}
        >
          {!isYouTube && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveVideo?.();
              }}
              className="absolute top-4 right-4 z-[60] bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors duration-200"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          )}

          {(isLoading || !isVideoReady) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-color-1"></div>
            </div>
          )}
          
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            width="100%"
            height="100%"
            playing={isPlaying}
            playbackRate={playbackSpeed}
            onDuration={handleDuration}
            onProgress={handleProgress}
            onReady={handleReady}
            onError={handleError}
            progressInterval={100}
            config={{
              youtube: {
                playerVars: { showinfo: 1 }
              },
              file: {
                forceVideo: true,
                attributes: {
                  controlsList: 'nodownload',
                  preload: 'auto'
                }
              }
            }}
            style={{ 
              display: isVideoReady && !isLoading ? 'block' : 'none',
              pointerEvents: isVideoReady && !isLoading ? 'auto' : 'none'
            }}
          />

          {/* Add play/pause overlay indicator */}
          {isVideoReady && !isLoading && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity duration-200"
            >
              {!isPlaying && (
                <div className="p-4 rounded-full bg-white bg-opacity-50 hover:bg-opacity-75 transition-opacity duration-200">
                  <svg className="w-12 h-12 text-black" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Adjusted controls for better mobile visibility */}
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-black/70 to-transparent video-controls">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={handlePlayPause}
                  className="text-white hover:text-color-1 transition-colors"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
                <span className="text-white text-sm sm:text-base">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              
              {/* Adjusted playback speed dropdown for mobile */}
              <div className="relative">
                <button 
                  className="text-white hover:text-color-1 transition-colors px-2 py-1 rounded-md flex items-center space-x-1 group"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm sm:text-base relative">
                    {playbackSpeed}x
                    <div className="absolute bottom-full right-0 mb-2 bg-n-6 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-90 group-hover:visible transition-all">
                      <div className="p-1 sm:p-2 space-y-0.5 sm:space-y-1">
                        {speedOptions.map((speed) => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`w-full text-left px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm whitespace-nowrap
                              ${playbackSpeed === speed 
                                ? 'bg-color-1 text-white' 
                                : 'text-white hover:bg-n-5'}`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline - Adjusted height for mobile */}
        <div 
          ref={timelineRef}
          className="relative h-16 sm:h-24 bg-n-7 rounded-lg overflow-hidden"
        >
          {/* Add a gradient background instead */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.2))'
            }}
          />

          {/* Semi-transparent overlay */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Time markers */}
          <div className="absolute top-0 left-0 right-0 h-6 flex justify-between px-2 text-xs text-white z-20">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="bg-black/50 px-1 rounded">
                {formatTime((duration * i) / 4)}
              </span>
            ))}
          </div>

          {/* Clips overlay */}
          <div className="absolute inset-0">
            {clips.map((clip, index) => {
              const leftPos = (clip.startTime / duration) * 100;
              const width = ((clip.endTime - clip.startTime) / duration) * 100;
              const clipColor = `hsl(${(index * 60) % 360}, 70%, 50%)`;
              
              return (
                <div
                  key={clip.id}
                  className="absolute h-full timeline-clip"
                  style={{
                    left: `${leftPos}%`,
                    width: `${width}%`,
                    background: `${clipColor}20`,
                    borderColor: clipColor,
                    pointerEvents: 'none'
                  }}
                >
                  <div 
                    className="timeline-handle left-handle" 
                    style={{ 
                      left: 0,
                      pointerEvents: 'auto',
                      cursor: 'ew-resize'
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation(); // Prevent timeline click
                      handleStartDrag(e, clip, 'start');
                    }}
                    onTouchStart={(e) => handleTouchStart(e, clip, 'start')}
                  />
                  <div 
                    className="timeline-handle right-handle" 
                    style={{ 
                      right: 0,
                      pointerEvents: 'auto',
                      cursor: 'ew-resize'
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation(); // Prevent timeline click
                      handleStartDrag(e, clip, 'end');
                    }}
                    onTouchStart={(e) => handleTouchStart(e, clip, 'end')}
                  />
                </div>
              );
            })}
          </div>

          {/* Current time indicator */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-color-1 z-10"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />

          {/* Clickable timeline area - place below handles in z-index */}
          <div 
            className="absolute inset-0 z-10"
            onClick={handleTimelineClick}
            onMouseMove={handleTimelineHover}
          />
        </div>

        {/* Clips list section - only show when clips exist */}
        {clips.length > 0 && (
          <div className="mt-4 space-y-2 sm:space-y-4 clips-list">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
              <h3 className="text-base sm:text-lg font-bold">Processing Clips</h3>
              <Button
                onClick={addNewClip}
                className="w-full sm:w-auto bg-color-1 hover:bg-color-1/80 text-n-1 text-sm sm:text-base"
                disabled={!isReady}
              >
                Add Clip at Current Time
              </Button>
            </div>

            <div className="h-[300px] overflow-y-auto space-y-2">
              {clips.slice().reverse().map((clip, index) => {
                const clipColor = `hsl(${((clips.length - 1 - index) * 60) % 360}, 70%, 50%)`;
                return (
                  <div
                    key={clip.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer
                      ${selectedClip?.id === clip.id 
                        ? 'border-color-1 bg-n-6/50' 
                        : 'border-n-5/50 hover:border-n-4'}`}
                    onClick={() => selectClip(clip)}
                  >
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Clip {clips.length - index}</span>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeClip(clip.id);
                          }}
                          className="text-red-500 hover:text-red-400"
                        >
                          Remove
                        </Button>
                      </div>

                      {selectedClip?.id === clip.id ? (
                        <div className="space-y-2 w-full">
                          {/* Mobile-optimized time inputs */}
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <div className="flex items-center space-x-0.5 sm:space-x-1">
                              <Input
                                type="text"
                                value={clipTimeInputs[clip.id]?.start?.hours ?? '0'}
                                onChange={(e) => validateAndUpdateTime(clip.id, 'start', 'hours', e.target.value)}
                                className="w-[38px] sm:w-14 h-7 sm:h-9 text-center text-xs sm:text-base px-0 sm:px-2"
                                placeholder="HH"
                                maxLength={2}
                              />
                              <span>:</span>
                              <Input
                                type="text"
                                value={clipTimeInputs[clip.id]?.start?.minutes ?? '0'}
                                onChange={(e) => validateAndUpdateTime(clip.id, 'start', 'minutes', e.target.value)}
                                className="w-[38px] sm:w-14 h-7 sm:h-9 text-center text-xs sm:text-base px-0 sm:px-2"
                                placeholder="MM"
                                maxLength={2}
                              />
                              <span>:</span>
                              <Input
                                type="text"
                                value={clipTimeInputs[clip.id]?.start?.seconds ?? '0'}
                                onChange={(e) => validateAndUpdateTime(clip.id, 'start', 'seconds', e.target.value)}
                                className="w-[38px] sm:w-14 h-7 sm:h-9 text-center text-xs sm:text-base px-0 sm:px-2"
                                placeholder="SS"
                                maxLength={2}
                              />
                            </div>
                            <span className="text-xs sm:text-base">to</span>
                            <div className="flex items-center space-x-0.5 sm:space-x-1">
                              <Input
                                type="text"
                                value={clipTimeInputs[clip.id]?.end?.hours ?? '0'}
                                onChange={(e) => validateAndUpdateTime(clip.id, 'end', 'hours', e.target.value)}
                                className="w-[38px] sm:w-14 h-7 sm:h-9 text-center text-xs sm:text-base px-0 sm:px-2"
                                placeholder="HH"
                                maxLength={2}
                              />
                              <span>:</span>
                              <Input
                                type="text"
                                value={clipTimeInputs[clip.id]?.end?.minutes ?? '0'}
                                onChange={(e) => validateAndUpdateTime(clip.id, 'end', 'minutes', e.target.value)}
                                className="w-[38px] sm:w-14 h-7 sm:h-9 text-center text-xs sm:text-base px-0 sm:px-2"
                                placeholder="MM"
                                maxLength={2}
                              />
                              <span>:</span>
                              <Input
                                type="text"
                                value={clipTimeInputs[clip.id]?.end?.seconds ?? '0'}
                                onChange={(e) => validateAndUpdateTime(clip.id, 'end', 'seconds', e.target.value)}
                                className="w-[38px] sm:w-14 h-7 sm:h-9 text-center text-xs sm:text-base px-0 sm:px-2"
                                placeholder="SS"
                                maxLength={2}
                              />
                            </div>
                          </div>
                          {inputError && (
                            <span className="text-red-500 text-sm block">{inputError}</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-n-3">
                          {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                          <span className="ml-2 text-color-1">
                            ({Math.ceil((clip.endTime - clip.startTime) / 60)} credits)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Show Add Clip button alone when no clips exist */}
        {clips.length === 0 && (
          <div className="mt-4">
            <Button
              onClick={addNewClip}
              className="w-full sm:w-auto bg-color-1 hover:bg-color-1/80 text-n-1 text-sm sm:text-base"
              disabled={!isReady}
            >
              Add Clip at Current Time
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}