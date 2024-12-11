'use client';

import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { WordTiming, SegmentIndices } from '@/lib/database/models/clip.model';
import { EditOperation, EditHistory } from '@/lib/types/editor.types';
import { TranscriptEditor } from './TranscriptEditor';
import { VideoTimeline } from './VideoTimeline';
import { PauseIcon } from 'lucide-react';
import { PlayIcon } from 'lucide-react';

interface PreviewCaptionsProps {
  wordTimings: WordTiming[];
  segment: { start: number; end: number };
  currentTime: number;
}

interface VideoEditorProps {
  clipId: string;
  videoUrl: string;
  padded_word_timings: WordTiming[];
  segment_indices: { start: number; end: number };
}

export function VideoEditor({ clipId, videoUrl, padded_word_timings, segment_indices }: VideoEditorProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistory>({
    operations: [],
    segmentBoundaries: {
      start: segment_indices.start,
      end: segment_indices.end
    },
    finalWordTimings: [...padded_word_timings]
  });
  
  const playerRef = useRef<ReactPlayer>(null);

  const handleWordUpdate = (index: number, newWord: string) => {
    const operation: EditOperation = {
      type: 'MODIFY',
      index,
      oldValue: { word: editHistory.finalWordTimings[index].word },
      newValue: { word: newWord },
      timestamp: Date.now()
    };

    setEditHistory(prev => ({
      ...prev,
      operations: [...prev.operations, operation],
      finalWordTimings: prev.finalWordTimings.map((timing, i) => 
        i === index ? { ...timing, word: newWord } : timing
      )
    }));
  };

  const handleSegmentChange = (start: number, end: number) => {
    const operation: EditOperation = {
      type: 'SEGMENT_CHANGE',
      newSegment: { start, end },
      timestamp: Date.now()
    };

    setEditHistory((prev: EditHistory) => ({
      ...prev,
      operations: [...prev.operations, operation],
      segmentBoundaries: { start, end }
    }));
  };

  const handleSaveChanges = async () => {
    try {
      const response = await fetch('/api/process-clip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clipId,
          editHistory,
          finalTimings: editHistory.finalWordTimings,
          segmentBoundaries: editHistory.segmentBoundaries
        }),
      });

      if (!response.ok) throw new Error('Failed to process clip');
      
      // Handle successful save
      const result = await response.json();
      // Maybe redirect to the new clip or show success message
    } catch (error) {
      console.error('Error saving changes:', error);
      // Show error message to user
    }
  };

  return (
    <div className="h-screen bg-n-8 flex flex-col">
      {/* Header with Save button */}
      <div className="h-16 border-b border-n-6 flex items-center justify-between px-6">
        <h1 className="text-2xl font-bold text-n-1">Video Editor</h1>
        <div className="flex gap-4">
          <button 
            className="bg-color-1 hover:bg-color-1/80 text-n-1 py-2 px-6 rounded-full"
            onClick={handleSaveChanges}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel */}
        <div className="w-1/3 border-r border-n-6 p-6">
          <TranscriptEditor
            wordTimings={editHistory.finalWordTimings}
            segmentIndices={editHistory.segmentBoundaries}
            onWordUpdate={handleWordUpdate}
            onWordClick={(timing) => {
              playerRef.current?.seekTo(timing.start, 'seconds');
              setCurrentTime(timing.start);
            }}
            currentTime={currentTime}
          />
        </div>

        {/* Right Panel */}
        <div className="flex-1 p-6 flex flex-col">
          <VideoPreview
            playerRef={playerRef}
            url={videoUrl}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            setDuration={setDuration}
            segmentBoundaries={editHistory.segmentBoundaries}
            wordTimings={editHistory.finalWordTimings}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="h-32 border-t border-n-6 p-6">
        <VideoTimeline
          currentTime={currentTime}
          duration={duration}
          wordTimings={editHistory.finalWordTimings}
          segmentIndices={editHistory.segmentBoundaries}
          onSeek={(time) => {
            playerRef.current?.seekTo(time, 'seconds');
            setCurrentTime(time);
          }}
          onSegmentChange={handleSegmentChange}
        />
      </div>
    </div>
  );
}

// Separate component for video preview
function VideoPreview({ 
  playerRef,
  url, 
  isPlaying, 
  setIsPlaying,
  currentTime,
  setCurrentTime,
  setDuration,
  segmentBoundaries,
  wordTimings 
}: {
  playerRef: React.RefObject<ReactPlayer>;
  url: string;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  segmentBoundaries: SegmentIndices;
  wordTimings: WordTiming[];
}) {
  const isInSegment = () => {
    const segmentStart = wordTimings[segmentBoundaries.start]?.start || 0;
    const segmentEnd = wordTimings[segmentBoundaries.end - 1]?.end || 0;
    return currentTime >= segmentStart && currentTime <= segmentEnd;
  };

  return (
    <>
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
        <ReactPlayer
          ref={playerRef}
          url={url}
          width="100%"
          height="100%"
          playing={isPlaying}
          onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
          onDuration={setDuration}
          controls={false}
        />
        {!isInSegment() && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <span className="text-n-1">Trimmed Section</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="bg-color-1 hover:bg-color-1/80 text-n-1 py-2 px-6 rounded-full flex items-center gap-2"
        >
          {isPlaying ? (
            <><PauseIcon /> Pause</>
          ) : (
            <><PlayIcon /> Play</>
          )}
        </button>
      </div>
    </>
  );
}

// Simple preview component for captions
function PreviewCaptions({ wordTimings, segment, currentTime }: PreviewCaptionsProps) {
  const currentWord = wordTimings.find(
    w => currentTime >= w.start && currentTime <= w.end
  );
  
  const isInSegment = (word: WordTiming) => {
    const index = wordTimings.indexOf(word);
    return index >= segment.start && index < segment.end;
  };

  if (!currentWord) return null;

  return (
    <div className="text-center text-xl font-semibold">
      <span className={isInSegment(currentWord) ? 'text-white' : 'text-gray-500 line-through'}>
        {currentWord.word}
      </span>
    </div>
  );
}
