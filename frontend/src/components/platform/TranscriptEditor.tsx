'use client';

import { useState } from 'react';
import { WordTiming } from '@/lib/database/models/clip.model';
import { EditOperation } from '@/lib/types/editor.types';

interface TranscriptEditorProps {
  wordTimings: WordTiming[];
  segmentIndices: { start: number; end: number };
  currentTime: number;
  onEdit: (operation: EditOperation) => void;
  onWordClick: (timing: WordTiming) => void;
  onSegmentUpdate: (start: number, end: number) => void;
}

export function TranscriptEditor({ 
  wordTimings, 
  segmentIndices,
  currentTime,
  onEdit,
  onWordClick,
  onSegmentUpdate
}: TranscriptEditorProps) {
  const [editableTimings, setEditableTimings] = useState(wordTimings);

  // Find currently spoken word
  const activeWordIndex = editableTimings.findIndex(
    word => currentTime >= word.start && currentTime <= word.end
  );

  const handleWordEdit = (index: number, newWord: string) => {
    const operation: EditOperation = {
      type: 'MODIFY',
      wordIndex: index,
      newValue: newWord,
      timestamp: Date.now()
    };

    const newTimings = [...editableTimings];
    newTimings[index] = {
      ...newTimings[index],
      word: newWord
    };
    setEditableTimings(newTimings);
    onEdit(operation);
  };

  const handleWordDelete = (index: number) => {
    if (index >= segmentIndices.start && index < segmentIndices.end) {
      const operation: EditOperation = {
        type: 'DELETE',
        wordIndex: index,
        timestamp: Date.now()
      };

      const newTimings = editableTimings.filter((_, i) => i !== index);
      setEditableTimings(newTimings);
      onEdit(operation);

      // Adjust segment indices if needed
      if (index < segmentIndices.end) {
        onSegmentUpdate(segmentIndices.start, segmentIndices.end - 1);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-semibold text-n-1">Transcript Editor</h2>
        <span className="text-sm text-n-3">
          Selected: {segmentIndices.end - segmentIndices.start} words
        </span>
      </div>
      <div className="flex-1 bg-n-7 rounded-lg p-4 overflow-y-auto editor-transcript">
        <div className="prose prose-invert max-w-none">
          {editableTimings.map((timing, index) => {
            const isInSegment = index >= segmentIndices.start && index < segmentIndices.end;
            const isActive = index === activeWordIndex;
            
            return (
              <span key={index}>
                <span
                  contentEditable={isInSegment}
                  suppressContentEditableWarning
                  onBlur={(e) => handleWordEdit(index, e.currentTarget.textContent || '')}
                  onClick={() => onWordClick(timing)}
                  onKeyDown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      handleWordDelete(index);
                    }
                  }}
                  className={`
                    inline-block mx-0.5 px-1 rounded cursor-pointer
                    ${isActive ? 'bg-color-1/30' : 'hover:bg-n-6'}
                    ${isInSegment ? '' : 'line-through opacity-50'}
                  `}
                >
                  {timing.word}
                </span>
                {timing.word !== '-' && <span className="text-n-4">-</span>}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
