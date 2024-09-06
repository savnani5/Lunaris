from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from threading import Thread
import os
import logging
from logging.handlers import RotatingFileHandler
import boto3
from pymongo import MongoClient
from main import VideoProcessor
from dotenv import find_dotenv, load_dotenv
from models.user import User
from models.project import Project
import argparse
from botocore.exceptions import ClientError

load_dotenv(find_dotenv())

class LunarisApp:
    def __init__(self, debug=False):
        self.app = Flask(__name__)
        self.debug = debug
        self.processing_videos = {}
        self.video_path = "./downloads"
        self.output_path = "./subtitled_clips"

        self.configure_app()
        self.setup_cors()
        self.setup_routes()
        self.setup_mongoDB()
        self.setup_logging()
        self.video_processor = VideoProcessor(self.db)
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            region_name=os.environ.get('AWS_REGION')
        ) if not debug else None
        self.s3_bucket = os.environ.get('S3_BUCKET_NAME')
        

    def configure_app(self):
        self.app.config.update(
            APPLICATION_ROOT='/',
            PREFERRED_URL_SCHEME='https' if not self.debug else 'http'
        )

    def setup_cors(self):
        frontend_url = os.environ.get('FRONTEND_URL', '*')  # Use * if FRONTEND_URL is not set
        print(frontend_url)
        CORS(self.app, resources={r"/api/*": {"origins": frontend_url}}, 
            allow_headers=['Content-Type', 'Authorization'], 
            supports_credentials=True)


    def setup_routes(self):
        self.app.route('/api/process-video', methods=['POST'])(self.process_video)
        self.app.route('/api/video-status/<project_id>', methods=['GET'])(self.video_status)
        self.app.route('/api/get-video/<project_id>', methods=['GET'])(self.get_video)
        self.app.route('/<base_url>/<user_id>/<project_id>/<filename>', methods=['GET'])(self.get_clip)
        self.app.route('/health', methods=['GET'])(self.health_check)

    def setup_mongoDB(self):
        self.app.config['MONGODB_URI'] = os.environ.get('MONGODB_URI')
        self.client = MongoClient(self.app.config['MONGODB_URI'])
        self.db = self.client['lunarisDB']
        self.users_collection = self.db['users']
        self.projects_collection = self.db['projects']
        self.clips_collection = self.db['clips']

    def setup_logging(self):
        # Consider using CloudWatch for logging in production
        if not self.debug:
            # Setup CloudWatch logging here
            pass
        else:
            # Remove existing handlers
            self.app.logger.handlers.clear()

            log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            log_file = 'lunaris_app.log'
            
            file_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
            file_handler.setFormatter(log_formatter)
            file_handler.setLevel(logging.INFO)

            console_handler = logging.StreamHandler()
            console_handler.setFormatter(log_formatter)
            console_handler.setLevel(logging.INFO)

            self.app.logger.addHandler(file_handler)
            self.app.logger.addHandler(console_handler)
            self.app.logger.setLevel(logging.INFO)

            # Disable Flask's default logger
            self.app.logger.propagate = False

            self.app.logger.info("Logging setup completed")
            self.app.logger.setLevel(logging.INFO)

            # Disable Flask's default logger
            self.app.logger.propagate = False

            self.app.logger.info("Logging setup completed")

    def process_video_thread(self, video_link, project_id, video_quality, video_type='portrait', clerk_user_id=None):
        with self.app.app_context():
            try:
                self.app.logger.info(f"Starting video processing for project: {project_id}")
                project = self.projects_collection.find_one({"_id": project_id})
                if not project:
                    self.app.logger.error(f'Project not found: {project_id}')
                    return

                downloaded_video_path, downloaded_audio_path, video_title = self.video_processor.download_video(video_link, self.video_path, video_quality)
                self.app.logger.info(f"Video downloaded: {downloaded_video_path}")
                transcript, word_timings = self.video_processor.transcribe_audio(downloaded_audio_path)
                self.app.logger.info(f"Audio transcription completed for project: {project_id}")
                interesting_data = self.video_processor.get_interesting_segments(transcript, word_timings)
                self.app.logger.info(f"Interesting segments identified for project: {project_id}")
                processed_clip_ids = self.video_processor.crop_and_add_subtitles(
                    downloaded_video_path, 
                    interesting_data, 
                    video_type, 
                    self.output_path, 
                    s3_client=self.s3_client, 
                    s3_bucket=self.s3_bucket, 
                    user_id=clerk_user_id,
                    project_id=project_id,
                    debug=self.debug
                )
                self.app.logger.info(f"Cropping and adding subtitles for project: {project_id}")
                # Update project status, clip_ids and transcript
                self.projects_collection.update_one(
                    {"_id": project_id},
                    {
                        "$set": {
                            "status": "completed",
                            "transcript": transcript,
                            "clip_ids": processed_clip_ids
                        }
                    }
                )

                self.app.logger.info(f'Successfully processed and uploaded clips')
                
                # Delete the folder video_title and all files in it under ./downloads
                video_title_folder = os.path.join(self.video_path, video_title)
                if os.path.exists(video_title_folder):
                    for file in os.listdir(video_title_folder):
                        file_path = os.path.join(video_title_folder, file)
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                    os.rmdir(video_title_folder)
                    self.app.logger.info(f'Deleted folder and contents: {video_title_folder}')
                else:
                    self.app.logger.info(f'Folder not found: {video_title_folder}')
            
            except Exception as e:
                # Update project status, clip_ids and transcript
                self.projects_collection.update_one(
                    {"_id": project_id},
                    {
                        "$set": {
                            "status": "failed"
                        }
                    }
                )
                self.app.logger.error(f"Error processing video for project {project_id}: {str(e)}", exc_info=True)


    def process_video(self):
        self.app.logger.info("Received request to process video")
        data = request.get_json()
        if 'link' not in data:
            self.app.logger.error('No video link provided in the request.')
            return jsonify({'error': 'No video link provided'}), 400

        video_link = data['link']
        clerk_user_id = data['userId']
        user = self.users_collection.find_one({"clerk_user_id": clerk_user_id})
        
        if not user:
            new_user = User(clerk_user_id, data['email'])
            user_dict = new_user.to_dict()
            result = self.users_collection.insert_one(user_dict)

        project = Project(clerk_user_id, video_link)
        project_dict = project.to_dict()
        result = self.projects_collection.insert_one(project_dict)
        project_id = result.inserted_id

        # Update user with new project ID
        self.users_collection.update_one(
            {"clerk_user_id": clerk_user_id},
            {"$push": {"project_ids": project_id}}
        )

        self.app.logger.info(f'Received video link: {video_link}')

        thread = Thread(target=self.process_video_thread, args=(video_link, project_id, data['videoQuality'], data['videoType'].lower(), clerk_user_id))
        thread.start()
        
        return jsonify({'message': 'Video processing started', 'project_id': str(project_id)}), 202

    def video_status(self, project_id):
        self.app.logger.info(f"Checking video status for project: {project_id}")
        project = self.projects_collection.find_one({"_id": project_id})
        if not project:
            return jsonify({'error': 'Invalid project ID'}), 404

        return jsonify({'status': project['status']})

    # TODO: Just send signal of completion to frontend, it will fetch clips directly on frontend from DB connection
    def get_video(self, project_id):
        self.app.logger.info(f"Fetching video for project: {project_id}")
        project = self.projects_collection.find_one({"_id": project_id})
        if not project or project['status'] != 'completed':
            return jsonify({'error': 'Video not available'}), 404

        clips = list(self.db.clips.find({"project_id": project_id}))
        if not clips:
            return jsonify({'error': 'Clip not found'}), 404
        
        return jsonify({'clips': clips})

    
    def get_clip(self, base_url, user_id, project_id, filename):
        self.app.logger.info(f"Fetching clip: {filename} for project: {project_id}")
        clip_path = os.path.join(base_url, user_id, project_id)
        return send_from_directory(clip_path, filename)
        
    def health_check(self):
        try:
            # Check database connection
            self.client.server_info()
            # Check S3 connection if not in debug mode
            if not self.debug:
                self.s3_client.list_buckets()
            return jsonify({'status': 'healthy'}), 200
        except Exception as e:
            self.app.logger.error(f"Health check failed: {str(e)}")
            return jsonify({'status': 'unhealthy', 'message': 'Service is experiencing issues'}), 500

    def run(self):
        self.app.logger.info("Starting Lunaris App")
        if not os.path.exists('./downloads'):
            os.makedirs('./downloads')
        if not os.path.exists(self.output_path):
            os.makedirs(self.output_path)
        port = int(os.environ.get('PORT', 5001))  # Use PORT from environment or default to 5001
        self.app.run(host='0.0.0.0', debug=False, port=port)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run the Lunaris App')
    parser.add_argument('-d', '--debug', action='store_true', help='Run in debug mode')
    args = parser.parse_args()

    lunaris_app = LunarisApp(debug=args.debug)
    lunaris_app.app.logger.info(f"Lunaris App initialized with debug mode: {args.debug}")
    lunaris_app.run()  # Call the run method instead of just accessing the app attribute