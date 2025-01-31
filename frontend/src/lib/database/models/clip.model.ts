import { ObjectId } from 'mongodb';

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
  hashtags: string[];
  created_at: Date;
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
    public hashtags: string[],
    public created_at: Date = new Date()
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
      obj.hashtags || [],
      new Date(obj.created_at)
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
      hashtags: this.hashtags,
      created_at: this.created_at
    };
  }
}
