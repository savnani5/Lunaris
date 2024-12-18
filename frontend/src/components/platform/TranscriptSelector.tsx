import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ReactPlayer from "react-player";

interface TranscriptLine {
  text: string;
  start: number;
  end: number;
}

interface Clip {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  lineIndices: number[];
}

interface Props {
  transcript: TranscriptLine[];
  videoUrl: string;
  onSelectionChange?: (selection: { start: number; end: number }) => void;
  currentTime: number;
  onTimeClick: (time: number) => void;
  onPlaybackChange?: (playing: boolean) => void;
  onClipAdd?: (clip: Clip) => void;
  onClipsChange?: (clips: Clip[]) => void;
}

export function TranscriptSelector({
  transcript,
  videoUrl,
  onSelectionChange,
  currentTime,
  onTimeClick,
  onPlaybackChange,
  onClipsChange
}: Props) {
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [touchStartPosition, setTouchStartPosition] = useState<{ x: number; y: number } | null>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === undefined) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateDuration = (startTime: number, endTime: number) => {
    if (isNaN(startTime) || isNaN(endTime)) return 0;
    const durationInSeconds = endTime - startTime;
    return Math.ceil(durationInSeconds / 60);
  };

  const handleStart = (index: number, event: React.MouseEvent | React.TouchEvent) => {
    if ('button' in event && event.ctrlKey) {
      const newSelected = new Set(selectedLines);
      const maxSelected = Math.max(...Array.from(selectedLines));
      
      if (index <= maxSelected) {
        for (let i = index; i <= maxSelected; i++) {
          newSelected.delete(i);
        }
        setSelectedLines(newSelected);
      }
      return;
    }

    setIsSelecting(true);
    setSelectionStart(index);
    
    const newSelected = new Set<number>();
    newSelected.add(index);
    setSelectedLines(newSelected);
  };

  const handleMove = (event: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in event) {
      if (!isLongPressing && !isSelecting) return;
      event.preventDefault();
    } else {
      if (!isSelecting) return;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    if (isLongPressing) {
      setIsLongPressing(false);
      setIsSelecting(false);
    }
    
    setTouchStartPosition(null);
  };

  const handleTouchCancel = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    setIsLongPressing(false);
    setIsSelecting(false);
    setTouchStartPosition(null);
  };

  useEffect(() => {
    const handleGlobalMove = (event: MouseEvent | TouchEvent) => {
      if (!isSelecting) return;
    };

    const handleGlobalEnd = () => {
      setIsSelecting(false);
    };

    document.addEventListener('mousemove', handleGlobalMove);
    document.addEventListener('touchmove', handleGlobalMove);
    document.addEventListener('mouseup', handleGlobalEnd);
    document.addEventListener('touchend', handleGlobalEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isSelecting]);

  const handleMouseEnter = (index: number) => {
    if (!isSelecting || selectionStart === null) return;

    const newSelected = new Set<number>();
    const start = Math.min(selectionStart, index);
    const end = Math.max(selectionStart, index);

    for (let i = start; i <= end; i++) {
      newSelected.add(i);
    }
    
    setSelectedLines(newSelected);
  };

  const handleAddClip = () => {
    if (selectedLines.size === 0) return;

    const selectedIndexes = Array.from(selectedLines).sort((a, b) => a - b);
    const startLineIndex = selectedIndexes[0];
    const endLineIndex = selectedIndexes[selectedIndexes.length - 1];
    
    const startLine = transcript[startLineIndex];
    const endLine = transcript[endLineIndex];
    
    let endTime = endLine.end;
    if (isNaN(endTime) || endTime === undefined) {
      if (endLineIndex < transcript.length - 1) {
        endTime = transcript[endLineIndex + 1].start;
      } else {
        endTime = endLine.start + 3;
      }
    }

    const newClip = {
      id: `clip-${Date.now()}`,
      startTime: Number(startLine.start),
      endTime: Number(endTime),
      text: selectedIndexes.map(idx => transcript[idx].text).join(' '),
      lineIndices: selectedIndexes
    };

    if (isNaN(newClip.startTime) || isNaN(newClip.endTime)) {
      console.error('Invalid time values:', { 
        startTime: newClip.startTime, 
        endTime: newClip.endTime,
        startLine,
        endLine 
      });
      return;
    }

    setClips(prevClips => {
      const newClips = [newClip, ...prevClips];
      onClipsChange?.(newClips);
      return newClips;
    });
    setSelectedLines(new Set());
  };

  const removeClip = (clipId: string) => {
    setClips(prevClips => {
      const newClips = prevClips.filter(c => c.id !== clipId);
      onClipsChange?.(newClips);
      return newClips;
    });
    
    if (selectedClip?.id === clipId) {
      setSelectedClip(null);
      setSelectedLines(new Set());
    }
  };

  useEffect(() => {
    if (selectedClip && currentTime >= selectedClip.endTime) {
      setIsPlaying(false);
      onPlaybackChange?.(false);
      if (playerRef.current) {
        playerRef.current.seekTo(selectedClip.startTime);
      }
    }
  }, [currentTime, selectedClip]);

  const handleClipClick = (clip: Clip) => {
    setSelectedClip(clip);
    setSelectedLines(new Set(clip.lineIndices));
    
    if (playerRef.current) {
      const startTime = Number(clip.startTime);
      playerRef.current.seekTo(startTime, 'seconds');
    }
    
    onTimeClick(Number(clip.startTime));
    
    setIsPlaying(true);
    onPlaybackChange?.(true);
    
    const firstLineIndex = clip.lineIndices[0];
    const lineElement = containerRef.current?.querySelector(`[data-line-index="${firstLineIndex}"]`);
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSelectedClip(null);
        setSelectedLines(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProgress = (state: { played: number; playedSeconds: number }) => {
    onTimeClick(state.playedSeconds);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }
  
    const results: number[] = [];
    transcript.forEach((line, index) => {
      if (line.text.toLowerCase().includes(query.toLowerCase())) {
        results.push(index);
      }
    });
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  
    if (results.length > 0) {
      const firstResultElement = containerRef.current?.querySelector(
        `[data-line-index="${results[0]}"]`
      );
      if (firstResultElement) {
        firstResultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
  
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex - 1;
      if (newIndex < 0) newIndex = searchResults.length - 1;
    }
  
    setCurrentSearchIndex(newIndex);
    const element = containerRef.current?.querySelector(
      `[data-line-index="${searchResults[newIndex]}"]`
    );
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);


  const handleWheel = (event: React.WheelEvent) => {
    if (isSelecting) {
      event.preventDefault();
      const container = containerRef.current;
      if (container) {
        container.scrollTop += event.deltaY;
        
        const containerRect = container.getBoundingClientRect();
        const relativeY = Math.min(
          Math.max(event.clientY - containerRect.top, 0),
          containerRect.height
        );
        
        const elements = document.elementsFromPoint(
          containerRect.left + (containerRect.width / 2),
          containerRect.top + relativeY
        );
        
        const lineElement = elements.find(el => 
          el.hasAttribute('data-line-index') || 
          el.closest('[data-line-index]')
        );

        if (lineElement) {
          const targetElement = lineElement.hasAttribute('data-line-index') 
            ? lineElement 
            : lineElement.closest('[data-line-index]');
          
          if (targetElement) {
            const index = parseInt(targetElement.getAttribute('data-line-index') || '0');
            handleMouseEnter(index);
          }
        }
      }
    }
  };

  const handleTouchStart = (index: number, event: React.TouchEvent) => {
    longPressTimeoutRef.current = setTimeout(() => {
      setIsLongPressing(true);
      setIsSelecting(true);
      setSelectionStart(index);
      
      const newSelected = new Set<number>();
      newSelected.add(index);
      setSelectedLines(newSelected);
      
      if (event.touches[0]) {
        setTouchStartPosition({
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        });
      }
    }, 500);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!isLongPressing && !isSelecting) return;
    
    const touch = event.touches[0];
    if (!touch) return;

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const relativeY = Math.min(
      Math.max(touch.clientY - containerRect.top, 0),
      containerRect.height
    );

    const scrollThreshold = 50;
    if (relativeY < scrollThreshold) {
      container.scrollTop -= 10;
    } else if (relativeY > containerRect.height - scrollThreshold) {
      container.scrollTop += 10;
    }

    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const lineElement = elements.find(el => 
      el.hasAttribute('data-line-index') || 
      el.closest('[data-line-index]')
    );

    if (lineElement) {
      const targetElement = lineElement.hasAttribute('data-line-index') 
        ? lineElement 
        : lineElement.closest('[data-line-index]');
      
      if (targetElement) {
        const index = parseInt(targetElement.getAttribute('data-line-index') || '0');
        handleMouseEnter(index);
      }
    }

    event.preventDefault();
  };

  return (
    <div className="w-full relative flex flex-col gap-4">
      
      <div className="w-full">
        <div className="aspect-video w-full">
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            width="100%"
            height="100%"
            playing={isPlaying}
            controls={true}
            onProgress={handleProgress}
          />
        </div>
      </div>
    
      <div className="w-full">
        <div className="space-y-4" ref={containerRef}>
          <div className="flex items-center space-x-2 px-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search transcript..."
                className="w-full bg-n-6 text-n-1 rounded-lg px-3 py-3 text-base border border-n-5 focus:border-color-1 outline-none pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-n-3 hover:text-n-1"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-n-3 text-sm">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
                <button
                  onClick={() => navigateSearch('prev')}
                  className="p-3 hover:bg-n-6 rounded-lg"
                >
                  ↑
                </button>
                <button
                  onClick={() => navigateSearch('next')}
                  className="p-3 hover:bg-n-6 rounded-lg"
                >
                  ↓
                </button>
              </div>
            )}
          </div>
          <p className="text-n-3 mb-4 text-sm px-2">
            Click/Touch and drag to select multiple lines
          </p>
          <div 
            ref={containerRef}
            className="transcript-container h-[400px] overflow-y-auto bg-n-6/50 backdrop-blur-sm rounded-xl p-2 md:p-4"
            onMouseMove={handleMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onWheel={handleWheel}
            style={{ 
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch',
              position: 'relative'
            }}
          >
            {transcript.map((line, index) => (
              <div 
                key={index}
                data-line-index={index}
                onMouseDown={(e) => handleStart(index, e)}
                onTouchStart={(e) => handleTouchStart(index, e)}
                onMouseEnter={() => handleMouseEnter(index)}
                className={`p-3 md:p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedLines.has(index) 
                    ? selectedClip 
                      ? 'bg-color-1/40 border-l-2 border-color-1'
                      : 'bg-color-1/20 border-l-2 border-color-1'
                    : searchResults.includes(index)
                      ? currentSearchIndex === searchResults.indexOf(index)
                        ? 'bg-yellow-500/30 border-l-2 border-yellow-500'
                        : 'bg-yellow-500/20'
                      : 'hover:bg-n-5/50'
                }`}
              >
                <div className="text-color-1 text-base md:text-sm mb-1">
                  {formatTime(line.start)}
                </div>
                <div className="text-n-1 text-base">
                  {line.text}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleAddClip}
            className="w-full bg-color-1 hover:bg-color-1/80 rounded-lg py-3 text-base"
            disabled={selectedLines.size === 0}
          >
            Add Selection as Clip
          </Button>
        </div>
      </div>

      {clips.length > 0 && (
        <div className="mt-4 h-[250px] md:h-[300px] overflow-y-auto space-y-2 px-2">
          {clips.map((clip, index) => (
            <div
              key={clip.id}
              className={`p-3 md:p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedClip?.id === clip.id ? 'border-color-1 bg-n-6/50' : 'border-n-5/50 hover:border-n-4'
              }`}
              onClick={() => handleClipClick(clip)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-base">Clip {clips.length - index}</span>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClip(clip.id);
                      }}
                      className="text-red-500 hover:text-red-400 ml-2 p-2"
                    >
                      Remove
                    </Button>
                  </div>
                  <p className="text-n-1 text-base md:text-sm line-clamp-2">{clip.text}</p>
                  <div className="text-base md:text-sm text-n-3 mt-1">
                    <span>{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</span>
                    <span className="ml-2 text-color-1">
                      ({calculateDuration(clip.startTime, clip.endTime)} credits)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
