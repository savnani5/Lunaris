from datetime import datetime
from bson import ObjectId

class Project:
    def __init__(self, clerk_user_id, youtube_video_url):
        self._id = str(ObjectId())
        self.clerk_user_id = clerk_user_id
        self.youtube_video_url = youtube_video_url
        self.title = None
        self.thumbnail = None
        self.clip_ids = []
        self.transcript = None
        self.status = "processing"
        self.created_at = datetime.utcnow()

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
            "created_at": self.created_at
        }

    @staticmethod
    def from_dict(data):
        project = Project(data["clerk_user_id"], data["youtube_video_url"], data.get("title"))
        project._id = data["_id"]
        project.thumbnail = data.get("thumbnail")
        project.clip_ids = data.get("clip_ids", [])
        project.transcript = data.get("transcript")
        project.status = data.get("status", "processing")
        project.created_at = data.get("created_at", datetime.utcnow())
        return project