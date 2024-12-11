import { ObjectId } from 'mongodb';

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface SegmentIndices {
  start: number;
  end: number;
}

export interface Clip {
  _id: string;
  project_id: string;
  title: string;
  transcript: string;
  s3_uri: string;
  score: number;
  hook: string;
  flow: string;
  engagement: string;
  trend: string;
  created_at: Date;
  padded_word_timings?: WordTiming[];  // Optional field
  segment_indices?: SegmentIndices;    // Optional field
}

export class ClipModel implements Clip {
  constructor(
    public _id: string = new ObjectId().toString(),
    public project_id: string,
    public title: string,
    public transcript: string,
    public s3_uri: string,
    public score: number,
    public hook: string,
    public flow: string,
    public engagement: string,
    public trend: string,
    public created_at: Date = new Date(),
    public padded_word_timings?: WordTiming[],
    public segment_indices?: SegmentIndices
  ) {}

  static fromObject(obj: any): ClipModel {
    return new ClipModel(
      obj._id,
      obj.project_id,
      obj.title,
      obj.transcript,
      obj.s3_uri,
      obj.score,
      obj.hook,
      obj.flow,
      obj.engagement,
      obj.trend,
      new Date(obj.created_at),
      obj.padded_word_timings,
      obj.segment_indices
    );
  }

  toObject(): Clip {
    return {
      _id: this._id,
      project_id: this.project_id,
      title: this.title,
      transcript: this.transcript,
      s3_uri: this.s3_uri,
      score: this.score,
      hook: this.hook,
      flow: this.flow,
      engagement: this.engagement,
      trend: this.trend,
      created_at: this.created_at,
      padded_word_timings: this.padded_word_timings,
      segment_indices: this.segment_indices
    };
  }
}
