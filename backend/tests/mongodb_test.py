from pymongo import MongoClient
import os
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

client = MongoClient(os.environ['MONGODB_URI'])

# Create or connect to a database
db = client['lunarisDB']

# Create or connect to collections
users_collection = db['users']
videos_collection = db['videos']

# Test by inserting a document into users collection
user_doc = {
    "clerk_user_id": "12345",
    "email": "testuser@example.com",
    "created_at": "2024-08-28T12:00:00Z"
}
result = users_collection.insert_one(user_doc)
print(f"Inserted user with ID: {result.inserted_id}")

# Test by inserting a document into videos collection
video_doc = {
    "user_id": result.inserted_id,
    "youtube_video_url": "https://youtube.com/sample-video",
    "processed_clips": [],
    "created_at": "2024-08-28T12:05:00Z"
}
result = videos_collection.insert_one(video_doc)
print(f"Inserted video with ID: {result.inserted_id}")

# Fetch and print the inserted documents
inserted_user = users_collection.find_one({"_id": result.inserted_id})
print("Inserted User:", inserted_user)

inserted_video = videos_collection.find_one({"_id": result.inserted_id})
print("Inserted Video:", inserted_video)
