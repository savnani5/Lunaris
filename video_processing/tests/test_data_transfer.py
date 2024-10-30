import requests
import os
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

def test_update_project_status():
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    project_status_endpoint = f"{frontend_url}/api/project-status"

    # Test data
    data = {
        "userId": "user_2mgQY5AlHwwPrfHNd5hD7SHQPfO",
        "projectId": str(ObjectId("66fb2f01fc16d988e6ac6f69")),  # Convert ObjectId to string
        "status": "processing",
        "progress": 100,
        "stage": "analyzing",
        "title": "Test Project",
        "processing_timeframe": "00:00 - 05:00"
    }

    # Send POST request
    response = requests.post(project_status_endpoint, json=data)

    # Print response
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

def test_send_clip_data():
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    clips_endpoint = f"{frontend_url}/api/get-clips"

    # Dummy clip data
    clip_data = {
        "project_id": str(ObjectId()),
        "title": "Test Clip",
        "transcript": "This is a test transcript for the clip.",
        "s3_uri": "https://example.com/test-clip.mp4",
        "score": 85,
        "hook": "A",
        "flow": "B+",
        "engagement": "A-",
        "trend": "B"
    }

    # Send POST request
    response = requests.post(clips_endpoint, json=clip_data)

    # Print response
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == '__main__':
    # test_update_project_status()
    test_send_clip_data()
