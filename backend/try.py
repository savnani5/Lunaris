from pymongo import MongoClient
from bson.objectid import ObjectId
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

client = MongoClient(os.environ['MONGODB_URI'])
db = client.LunarisDB
users_collection = db.users
print(users_collection)
print(db)