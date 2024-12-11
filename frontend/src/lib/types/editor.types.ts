import { WordTiming } from "../database/models/clip.model";

export interface EditOperation {
  type: 'DELETE' | 'MODIFY' | 'SEGMENT_CHANGE';
  wordIndex?: number;
  newValue?: string;
  newSegment?: {
    start: number;
    end: number;
  };
  timestamp: number;
}

export interface EditorState {
  operations: EditOperation[];
  originalWordTimings: WordTiming[];
  currentSegment: {
    start: number;
    end: number;
  };
  isDirty: boolean;
}

export interface EditHistory {
  operations: EditOperation[];
  segmentBoundaries: {
    start: number;
    end: number;
  };
  finalWordTimings: WordTiming[];
}
