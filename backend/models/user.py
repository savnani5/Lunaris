from datetime import datetime

class User:
    def __init__(self, clerk_user_id, email):
        self.clerk_user_id = clerk_user_id
        self.email = email
        self.project_ids = []
        self.created_at = datetime.utcnow()

    def add_project(self, project_id):
        self.project_ids.append(project_id)

    def to_dict(self):
        return {
            "user_id": self.clerk_user_id,
            "email": self.email,
            "project_ids": self.project_ids,
            "created_at": self.created_at
        }

    @staticmethod
    def from_dict(data):
        user = User(data["user_id"], data["email"])
        user.project_ids = data.get("project_ids", [])
        user.created_at = data.get("created_at", datetime.utcnow())
        return user