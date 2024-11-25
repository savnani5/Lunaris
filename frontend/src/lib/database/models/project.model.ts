import { ObjectId } from 'mongodb';

export interface Project {
  _id: string;
  clerk_user_id: string;
  youtube_video_url: string;
  title: string;
  thumbnail: string;
  clip_ids: string[];
  transcript: string | null;
  status: 'created' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  processing_timeframe: string;
  video_quality: string;
  required_credits: number;
  progress?: number;
  stage: string;
  videoDuration?: number;
  project_type: 'auto' | 'manual';
}

export class ProjectModel implements Project {
  constructor(
    public _id: string = new ObjectId().toString(),
    public clerk_user_id: string,
    public youtube_video_url: string,
    public title: string,
    public thumbnail: string,
    public clip_ids: string[] = [],
    public transcript: string | null = null,
    public status: 'created' | 'processing' | 'completed' | 'failed' = 'processing',
    public created_at: Date = new Date(),
    public processing_timeframe: string,
    public video_quality: string,
    public required_credits: number,
    public progress: number = 0,
    public stage: string = 'created',
    public videoDuration?: number,
    public project_type: 'auto' | 'manual' = 'auto'
  ) {}

  static fromObject(obj: any): ProjectModel {
    return new ProjectModel(
      obj._id,
      obj.clerk_user_id,
      obj.youtube_video_url,
      obj.title,
      obj.thumbnail,
      obj.clip_ids,
      obj.transcript,
      obj.status,
      new Date(obj.created_at),
      obj.processing_timeframe,
      obj.video_quality,
      obj.required_credits,
      obj.progress || 0,
      obj.stage || 'created',
      obj.videoDuration,
      obj.project_type || 'auto'
    );
  }

  toObject(): Project {
    return {
      _id: this._id,
      clerk_user_id: this.clerk_user_id,
      youtube_video_url: this.youtube_video_url,
      title: this.title,
      thumbnail: this.thumbnail,
      clip_ids: this.clip_ids,
      transcript: this.transcript,
      status: this.status,
      created_at: this.created_at,  
      processing_timeframe: this.processing_timeframe,
      video_quality: this.video_quality,
      required_credits: this.required_credits,
      progress: this.progress,
      stage: this.stage,
      videoDuration: this.videoDuration,
      project_type: this.project_type
    };
  }

  addClip(clipId: string): void {
    this.clip_ids.push(clipId);
  }
}
