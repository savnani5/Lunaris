from datetime import datetime
from bson import ObjectId

class Project:
    def __init__(self, clerk_user_id, youtube_video_url, video_title, video_thumbnail, video_duration, processingTimeframe, video_quality):
        self._id = str(ObjectId())
        self.clerk_user_id = clerk_user_id
        self.youtube_video_url = youtube_video_url
        self.title = video_title
        self.thumbnail = video_thumbnail
        self.clip_ids = []
        self.transcript = None
        self.status = "processing"
        self.created_at = datetime.utcnow()
        self.video_duration = video_duration
        self.processing_timeframe = processingTimeframe
        self.video_quality = video_quality
    
    def add_clip(self, clip_id):
        self.clip_ids.append(clip_id)

    def to_dict(self):
        return {
            "_id": self._id,
            "clerk_user_id": self.clerk_user_id,
            "youtube_video_url": self.youtube_video_url,
            "title": self.title,
            "thumbnail": self.thumbnail,
            "clip_ids": self.clip_ids,
            "transcript": self.transcript,
            "status": self.status,
            "created_at": self.created_at,
            "video_duration": self.video_duration,
            "processing_timeframe": self.processing_timeframe,
            "video_quality": self.video_quality
        }