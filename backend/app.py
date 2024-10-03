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
import argparse
import resend
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import tempfile
import requests

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
        self.app.route('/<base_url>/<user_id>/<project_id>/<filename>', methods=['GET'])(self.get_clip)
        self.app.route('/health', methods=['GET'])(self.health_check)
        self.app.route('/api/project-status/<user_id>/<project_id>', methods=['GET'])(self.get_project_status)

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
        
    def update_clip_progress(self, clerk_user_id, project_id, current_clip, total_clips):
        # Calculate the progress percentage
        base_progress = 40  # Starting progress for generating stage
        max_progress = 90   # Increased max progress before completion
        clip_progress = (current_clip / total_clips) * (max_progress - base_progress)
        total_progress = base_progress + clip_progress

        # Update the processing_videos dictionary
        self.processing_videos[f"{clerk_user_id}_{project_id}"].update({
            "status": "processing",
            "stage": "generating",
            "progress": int(total_progress)
        })


    def process_video_thread(self, video_link, video_path, project_id, clerk_user_id, user_email, video_title, processing_timeframe, video_quality, video_type, start_time, end_time, clip_length, keywords, caption_style):
        with self.app.app_context():
            try:
                self.update_project_status(clerk_user_id, project_id, "processing", "downloading", 0, video_title, processing_timeframe)
                
                self.app.logger.info(f"Starting video processing for project: {project_id}")
                if video_link:
                    downloaded_video_path, downloaded_audio_path, video_title = self.video_processor.download_video(video_link, self.video_path, video_quality, start_time, end_time)
                else:
                    downloaded_video_path = video_path
                    downloaded_audio_path = self.video_processor.extract_audio(video_path)

                self.update_project_status(clerk_user_id, project_id, "processing", "transcribing", 10, video_title, processing_timeframe)
                self.app.logger.info(f"Video processed: {downloaded_video_path}")
                transcript, word_timings = self.video_processor.transcribe_audio(downloaded_audio_path)

                self.update_project_status(clerk_user_id, project_id, "processing", "analyzing", 20, video_title, processing_timeframe)
                self.app.logger.info(f"Audio transcription completed for project: {project_id}")
                interesting_data = self.video_processor.get_interesting_segments(transcript, word_timings, clip_length, keywords)

                self.update_project_status(clerk_user_id, project_id, "processing", "generating", 40, video_title, processing_timeframe)
                self.app.logger.info(f"Interesting segments identified for project: {project_id}")
                
                total_segments = len(interesting_data)
                processed_clip_ids = self.video_processor.crop_and_add_subtitles(
                    downloaded_video_path, 
                    interesting_data, 
                    video_type,
                    caption_style,
                    self.output_path, 
                    s3_client=self.s3_client, 
                    s3_bucket=self.s3_bucket, 
                    user_id=clerk_user_id,
                    project_id=project_id,
                    debug=self.debug,
                    progress_callback=lambda i: self.update_project_status(clerk_user_id, project_id, "processing", "generating", 40 + int((i / total_segments) * 50), video_title, processing_timeframe)
                )

                self.update_project_status(clerk_user_id, project_id, "processing", "uploading", 95, video_title, processing_timeframe)
                self.app.logger.info(f"Cropping and adding subtitles for project: {project_id}")

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
                        <p>You can view your clips <a href="{self.frontend_url}/project/{project_id}/clips">here</a>.</p>
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
                
                self.update_project_status(clerk_user_id, project_id, "completed", "completed", 100, video_title, processing_timeframe)

            except Exception as e:
                self.update_project_status(clerk_user_id, project_id, "failed", "failed", 0, video_title, processing_timeframe)
                self.app.logger.error(f"Error processing video for project {project_id}: {str(e)}", exc_info=True)

    def get_project_status(self, user_id, project_id):
        project_status = self.processing_videos.get(f"{user_id}_{project_id}", {})
        
        return jsonify({
            "status": project_status.get("status"),
            "stage": project_status.get("stage"),
            "progress": project_status.get("progress"),
            "title": project_status.get("title"),
            "processing_timeframe": project_status.get("processing_timeframe")
        })

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

        # extract for data from request
        clerk_user_id = request.form.get('userId')
        user_email = request.form.get('email')
        project_id = request.form.get('projectId')
        video_title = request.form.get('videoTitle')
        processing_timeframe = request.form.get('processing_timeframe')
        genre = request.form.get('genre')
        video_quality = request.form.get('videoQuality')
        video_type = request.form.get('videoType').lower()
        start_time = float(request.form.get('startTime'))
        end_time = float(request.form.get('endTime'))
        clip_length = {
            'min': float(request.form.get('clipLengthMin')),
            'max': float(request.form.get('clipLengthMax'))
        }
        keywords = request.form.get('keywords')
        caption_style = request.form.get('captionStyle', 'elon')

        self.app.logger.info(f'Received video: {video_link or video_path}')

        thread = Thread(target=self.process_video_thread, args=(video_link, 
                                                                video_path,
                                                                project_id, 
                                                                clerk_user_id,
                                                                user_email,
                                                                video_title,
                                                                processing_timeframe,
                                                                video_quality, 
                                                                video_type,
                                                                start_time,
                                                                end_time,
                                                                clip_length,
                                                                keywords,
                                                                caption_style))
        thread.start()
        return jsonify({'message': 'Video processing started'}), 202
    
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

    def update_project_status(self, clerk_user_id, project_id, status, stage, progress, title, processing_timeframe):
        try:
            data = {
                'userId': clerk_user_id,
                'projectId': project_id,
                'status': status,
                'progress': progress,
                'stage': stage,
                'title': title,
                'processing_timeframe': processing_timeframe
            }
            self.app.logger.info(f"Sending project status update: {data}")
            response = requests.post(f"{self.frontend_url}/api/project-status", json=data)
            response.raise_for_status()
            self.app.logger.info(f"Project status updated: {data}")
        except requests.exceptions.RequestException as e:
            self.app.logger.error(f"Failed to update project status: {str(e)}")
            self.app.logger.error(f"Response content: {e.response.content if e.response else 'No response'}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run the Lunaris App')
    parser.add_argument('-d', '--debug', action='store_true', help='Run in debug mode')
    args = parser.parse_args()

    lunaris_app = LunarisApp(debug=args.debug)
    lunaris_app.app.logger.info(f"Lunaris App initialized with debug mode: {args.debug}")
    lunaris_app.run()  # Call the run method instead of just accessing the app attribute