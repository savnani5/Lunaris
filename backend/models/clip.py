from datetime import datetime
from bson import ObjectId

class Clip:
    def __init__(self, project_id, title, transcript, s3_uri, score, hook, flow, engagement, trend):
        self._id = str(ObjectId())
        self.project_id = project_id
        self.title = title
        self.transcript = transcript
        self.s3_uri = s3_uri
        self.score = score
        self.hook = hook
        self.flow = flow
        self.engagement = engagement
        self.trend = trend
        self.created_at = datetime.utcnow()

    def to_dict(self):
        return {
            "_id": self._id,
            "project_id": self.project_id,
            "title": self.title,
            "transcript": self.transcript,
            "s3_uri": self.s3_uri,
            "score": self.score,
            "hook": self.hook,
            "flow": self.flow,
            "engagement": self.engagement,
            "trend": self.trend,
            "created_at": self.created_at
        }
