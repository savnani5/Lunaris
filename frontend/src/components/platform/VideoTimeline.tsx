'use client';

import { useCallback, useRef, useState } from 'react';
import { WordTiming, SegmentIndices } from '@/lib/database/models/clip.model';

interface VideoTimelineProps {
  currentTime: number;
  duration: number;
  wordTimings: WordTiming[];
  segmentIndices: SegmentIndices;
  onSeek: (time: number) => void;
  onSegmentChange: (start: number, end: number) => void;
}

export function VideoTimeline({ currentTime, duration, wordTimings, segmentIndices, onSeek, onSegmentChange }: VideoTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'playhead' | null>(null);
    
  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onSeek(Math.max(0, Math.min(newTime, duration)));
  }, [duration, onSeek]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate segment boundaries
  const segmentStart = wordTimings[segmentIndices.start]?.start || 0;
  const segmentEnd = wordTimings[segmentIndices.end - 1]?.end || duration;

  const handleDragStart = (type: 'start' | 'end') => (e: React.MouseEvent) => {
    setIsDragging(type);
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!timelineRef.current || !isDragging) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const time = percentage * duration;
    
    // Find nearest word index
    const wordIndex = wordTimings.findIndex(w => w.start >= time);
    
    if (isDragging === 'start') {
      onSegmentChange(wordIndex, segmentIndices.end);
    } else if (isDragging === 'end') {
      onSegmentChange(segmentIndices.start, wordIndex);
    }
  }, [isDragging, duration, wordTimings, segmentIndices]);

  const handleDragEnd = () => {
    setIsDragging(null);
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between text-sm text-n-3 mb-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      <div 
        ref={timelineRef}
        className="relative h-8 bg-n-6 rounded-lg cursor-pointer"
        onClick={handleTimelineClick}
      >
        {/* Segment indicator */}
        <div 
          className="absolute h-full bg-color-1/20"
          style={{
            left: `${(segmentStart / duration) * 100}%`,
            width: `${((segmentEnd - segmentStart) / duration) * 100}%`
          }}
        />
        
        {/* Progress bar */}
        <div 
          className="absolute h-full bg-color-1/50 rounded-l-lg"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
        
        {/* Playhead */}
        <div 
          className="absolute w-4 h-4 bg-color-1 rounded-full -translate-x-1/2 top-1/2 -translate-y-1/2"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
        
        {/* Word markers */}
        {wordTimings.map((timing, index) => (
          <div
            key={index}
            className="absolute w-px h-2 bg-n-4 top-1/2 -translate-y-1/2"
            style={{ left: `${(timing.start / duration) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
