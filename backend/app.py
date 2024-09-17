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
import resend
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import tempfile


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
        self.setup_resend()
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
            PREFERRED_URL_SCHEME='https' if not self.debug else 'http',
            SERVER_NAME=os.environ.get('SERVER_NAME')
        )

    def setup_cors(self):
        self.frontend_url = os.environ.get('FRONTEND_URL', '*')  # Use * if FRONTEND_URL is not set
        print(self.frontend_url)
        CORS(self.app, resources={r"/api/*": {"origins": self.frontend_url}}, 
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
    
    def setup_resend(self):
        resend.api_key = os.environ.get('RESEND_API_KEY')

    def process_video_thread(self, video_link, video_path, project_id, clerk_user_id, user_email, video_quality, video_type, start_time, end_time, clip_length, keywords):
        with self.app.app_context():
            try:
                self.app.logger.info(f"Starting video processing for project: {project_id}")
                project = self.projects_collection.find_one({"_id": project_id})
                if not project:
                    self.app.logger.error(f'Project not found: {project_id}')
                    return

                if video_link:
                    downloaded_video_path, downloaded_audio_path, video_title = self.video_processor.download_video(video_link, self.video_path, video_quality, start_time, end_time)
                else:
                    downloaded_video_path = video_path
                    downloaded_audio_path = self.video_processor.extract_audio(video_path)
                    video_title = os.path.splitext(os.path.basename(video_path))[0]

                self.app.logger.info(f"Video processed: {downloaded_video_path}")
                transcript, word_timings = self.video_processor.transcribe_audio(downloaded_audio_path)
                self.app.logger.info(f"Audio transcription completed for project: {project_id}")
                interesting_data = self.video_processor.get_interesting_segments(transcript, word_timings, clip_length, keywords)
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
                
                # Send email to user to notify them that the video has been processed
                try:
                    email_params: resend.Emails.SendParams = {
                        "from": "Lunaris Clips <output@lunaris.media>",
                        "to": [user_email],
                        "subject": "Your clips are ready 🎬!",
                        "html": f"""
                        <p>Hey there 👋</p>
                        <p>The clips for your video "<b>{video_title}</b>" are ready!</p> 
                        <p>You can view your clips <a href="{self.frontend_url}/project/{project_id}">here</a>.</p>
                        """
                    }
                    resend.Emails.send(email_params)
                    self.app.logger.info(f"Notification email sent to {user_email}")

                except Exception as e:
                    self.app.logger.error(f"Failed to send notification email: {str(e)}")

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
        
        # Check if the post request has the file part
        if 'video' in request.files:
            file = request.files['video']
            if file.filename == '':
                return jsonify({'error': 'No selected file'}), 400
            if file:
                filename = secure_filename(file.filename)
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                    file.save(temp_file.name)
                    video_path = temp_file.name
                video_link = None
        else:
            video_link = request.form.get('videoLink')
            video_path = None

        clerk_user_id = request.form.get('userId')
        video_title = request.form.get('videoTitle')
        video_thumbnail = request.form.get('videoThumbnail')
        video_duration = request.form.get('videoDuration')
        user_email = request.form.get('email')
        
        # Check if user exists, if not create a new one
        user = self.users_collection.find_one({"_id": clerk_user_id})
        
        if not user:
            new_user = User(clerk_user_id, user_email)
            user_dict = new_user.to_dict()
            self.users_collection.insert_one(user_dict)
            self.app.logger.info(f"Created new user with ID: {clerk_user_id}")
        else:
            self.app.logger.info(f"Found existing user with ID: {clerk_user_id}")

        project = Project(clerk_user_id, video_link or video_path, video_title, video_thumbnail, video_duration)
        project_dict = project.to_dict()
        result = self.projects_collection.insert_one(project_dict)
        project_id = result.inserted_id

        # Update user with new project ID
        self.users_collection.update_one(
            {"_id": clerk_user_id},
            {"$push": {"project_ids": project_id}}
        )

        self.app.logger.info(f'Received video: {video_link or video_path}')

        thread = Thread(target=self.process_video_thread, args=(video_link, 
                                                                video_path,
                                                                project_id, 
                                                                clerk_user_id,
                                                                user_email,
                                                                request.form.get('videoQuality'), 
                                                                request.form.get('videoType').lower(), 
                                                                float(request.form.get('startTime')), 
                                                                float(request.form.get('endTime')), 
                                                                {
                                                                    'min': float(request.form.get('clipLengthMin')),
                                                                    'max': float(request.form.get('clipLengthMax'))
                                                                }, 
                                                                request.form.get('keywords')))
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
        port = int(os.environ.get('PORT', 5001))  # Use PORT from environment or default to 5001
        self.app.run(host='0.0.0.0', debug=False, port=port)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run the Lunaris App')
    parser.add_argument('-d', '--debug', action='store_true', help='Run in debug mode')
    args = parser.parse_args()

    lunaris_app = LunarisApp(debug=args.debug)
    lunaris_app.app.logger.info(f"Lunaris App initialized with debug mode: {args.debug}")
    lunaris_app.run()  # Call the run method instead of just accessing the app attribute