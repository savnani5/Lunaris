from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from threading import Thread
import os
import logging
from logging.handlers import RotatingFileHandler
import boto3
from main import VideoProcessor
from dotenv import find_dotenv, load_dotenv
import argparse
import resend
from werkzeug.utils import secure_filename
import tempfile
import requests
from celery import Celery

load_dotenv(find_dotenv())

# Configure Celery
app = Flask(__name__)
celery = Celery(app.name, broker=os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0'))
celery.conf.update(
    result_backend=os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)
celery.conf.update(app.config)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.info("Starting app.py")

class LunarisApp:
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')  # Set a default value
    video_path = "./downloads"
    output_path = "./subtitled_clips"
    s3_client = None
    s3_bucket = None
    debug = False

    @classmethod
    def setup_s3(cls):
        if not cls.debug:
            try:
                cls.s3_client = boto3.client('s3',
                    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
                    region_name=os.environ.get('AWS_REGION')
                )
                cls.s3_bucket = os.environ.get('S3_BUCKET_NAME')
                if not cls.s3_bucket:
                    raise ValueError("S3_BUCKET_NAME environment variable is not set")
                print(f"S3 client initialized with bucket: {cls.s3_bucket}")
            except Exception as e:
                print(f"Failed to initialize S3 client: {str(e)}")
                cls.s3_client = None
                cls.s3_bucket = None

    def __init__(self, debug=False):
        LunarisApp.debug = debug
        self.app = app
        self.processing_videos = {}

        self.configure_app()
        self.setup_cors()
        self.setup_routes()
        self.setup_logging()
        self.setup_resend()
        self.video_processor = VideoProcessor()
        LunarisApp.setup_s3()  # Call the class method to set up S3

    def configure_app(self):
        self.app.config.update(
            APPLICATION_ROOT='/',
            PREFERRED_URL_SCHEME='https' if not self.debug else 'http',
            SERVER_NAME=os.environ.get('SERVER_NAME')
        )

    def setup_cors(self):
        CORS(self.app, resources={r"/api/*": {"origins": "*"}}, 
            allow_headers=['Content-Type', 'Authorization'], 
            supports_credentials=True)


    def setup_routes(self):
        logger.info("Setting up routes")
        self.app.route('/api/process-video', methods=['POST'])(self.process_video)
        self.app.route('/<base_url>/<user_id>/<project_id>/<filename>', methods=['GET'])(self.get_clip)
        self.app.route('/health', methods=['GET'])(self.health_check)
        self.app.route('/api/project-status/<user_id>/<project_id>', methods=['GET'])(self.get_project_status)


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
        add_watermark = request.form.get('addWatermark', False)
        
        self.app.logger.info(f'Received video: {video_link or video_path}')

        # Use Celery to queue the task
        task = process_video_task.delay(
            video_link, video_path, project_id, clerk_user_id, user_email, video_title,
            processing_timeframe, video_quality, video_type, start_time, end_time,
            clip_length, keywords, caption_style, add_watermark
        )

        return jsonify({'message': 'Video processing started', 'task_id': task.id}), 202
    
    def get_project_status(self, user_id, project_id):
        project_status = self.processing_videos.get(f"{user_id}_{project_id}", {})
        
        return jsonify({
            "status": project_status.get("status"),
            "stage": project_status.get("stage"),
            "progress": project_status.get("progress"),
            "title": project_status.get("title"),
            "processing_timeframe": project_status.get("processing_timeframe")
        })

    def get_clip(self, base_url, user_id, project_id, filename):
        self.app.logger.info(f"Fetching clip: {filename} for project: {project_id}")
        clip_path = os.path.join(base_url, user_id, project_id)
        return send_from_directory(clip_path, filename)
        
    def health_check(self):
        logger.info("Health check called")
        try:
            # Check database connection
            self.client.server_info()
            # Check S3 connection if not in debug mode
            if not self.debug:
                self.s3_client.list_buckets()
            return jsonify({'status': 'healthy'}), 200
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return jsonify({'status': 'unhealthy', 'message': str(e)}), 500

    def run(self):
        port = int(os.environ.get('PORT', 5001))
        self.app.run(host='0.0.0.0', debug=False, port=port)

    @classmethod
    def update_project_status(cls, clerk_user_id, project_id, status, stage, progress, title, processing_timeframe):
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
            app.logger.info(f"Sending project status update: {data}")
            response = requests.post(f"{cls.frontend_url}/api/project-status", json=data)
            response.raise_for_status()
            app.logger.info(f"Project status updated: {data}")
        except requests.exceptions.RequestException as e:
            app.logger.error(f"Failed to update project status: {str(e)}")
            app.logger.error(f"Response content: {e.response.content if e.response else 'No response'}")

    @classmethod
    def get_video_processor(cls):
        # This method ensures we always have a VideoProcessor instance
        if not hasattr(cls, '_video_processor'):
            cls._video_processor = VideoProcessor()
        return cls._video_processor


@celery.task(name='tasks.process_video_task')
def process_video_task(video_link, video_path, project_id, clerk_user_id, user_email, video_title, processing_timeframe, video_quality, video_type, start_time, end_time, clip_length, keywords, caption_style, add_watermark=False):
    with app.app_context():
        try:
            LunarisApp.update_project_status(clerk_user_id, project_id, "processing", "downloading", 0, video_title, processing_timeframe)
            
            app.logger.info(f"Starting video processing for project: {project_id}")
            video_processor = LunarisApp.get_video_processor()
            if video_link:
                downloaded_video_path, downloaded_audio_path, video_title = video_processor.download_video(video_link, LunarisApp.video_path, video_quality, start_time, end_time)
            else:
                downloaded_video_path = video_path
                downloaded_audio_path = video_processor.extract_audio(video_path)

            LunarisApp.update_project_status(clerk_user_id, project_id, "processing", "transcribing", 10, video_title, processing_timeframe)
            app.logger.info(f"Video processed: {downloaded_video_path}")
            transcript, word_timings = video_processor.transcribe_audio(downloaded_audio_path)

            LunarisApp.update_project_status(clerk_user_id, project_id, "processing", "analyzing", 20, video_title, processing_timeframe)
            app.logger.info(f"Audio transcription completed for project: {project_id}")
            interesting_data = video_processor.get_interesting_segments(transcript, word_timings, clip_length, keywords)

            LunarisApp.update_project_status(clerk_user_id, project_id, "processing", "generating", 40, video_title, processing_timeframe)
            app.logger.info(f"Interesting segments identified for project: {project_id}")
            
            total_segments = len(interesting_data)

            processed_clip_ids = video_processor.crop_and_add_subtitles(
                downloaded_video_path, 
                interesting_data, 
                video_type,
                caption_style,
                LunarisApp.output_path, 
                s3_client=LunarisApp.s3_client, 
                s3_bucket=LunarisApp.s3_bucket, 
                user_id=clerk_user_id,
                project_id=project_id,
                debug=LunarisApp.debug,
                progress_callback=lambda i: LunarisApp.update_project_status(clerk_user_id, project_id, "processing", "generating", 40 + int((i / total_segments) * 50), video_title, processing_timeframe),
                add_watermark=add_watermark
            )

            LunarisApp.update_project_status(clerk_user_id, project_id, "processing", "uploading", 95, video_title, processing_timeframe)
            app.logger.info(f"Cropping and adding subtitles for project: {project_id}")

            app.logger.info(f'Successfully processed and uploaded clips')
            
            # Send email to user to notify them that the video has been processed
            try:
                email_params: resend.Emails.SendParams = {
                    "from": "Lunaris Clips <output@lunaris.media>",
                    "to": [user_email],
                    "subject": "Your clips are ready 🎬!",
                    "html": f"""
                    <p>Hey there 👋</p>
                    <p>The clips for your video "<b>{video_title}</b>" are ready!</p> 
                    <p>You can view your clips <a href="{LunarisApp.frontend_url}/project/{project_id}/clips">here</a>.</p>
                    """
                }
                resend.Emails.send(email_params)
                app.logger.info(f"Notification email sent to {user_email}")

            except Exception as e:
                app.logger.error(f"Failed to send notification email: {str(e)}")

            # Delete the folder video_title and all files in it under ./downloads
            video_title_folder = os.path.join(LunarisApp.video_path, video_title)
            if os.path.exists(video_title_folder):
                for file in os.listdir(video_title_folder):
                    file_path = os.path.join(video_title_folder, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                os.rmdir(video_title_folder)
                app.logger.info(f'Deleted folder and contents: {video_title_folder}')
            else:
                app.logger.info(f'Folder not found: {video_title_folder}')
            
            LunarisApp.update_project_status(clerk_user_id, project_id, "completed", "completed", 100, video_title, processing_timeframe)

        except Exception as e:
            app.logger.error(f"Error processing video for project {project_id}: {str(e)}", exc_info=True)
            LunarisApp.update_project_status(clerk_user_id, project_id, "failed", "failed", 0, video_title, processing_timeframe)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run the Lunaris App')
    parser.add_argument('-d', '--debug', action='store_true', help='Run in debug mode')
    args = parser.parse_args()

    lunaris_app = LunarisApp(debug=args.debug)
    lunaris_app.app.logger.info(f"Lunaris App initialized with debug mode: {args.debug}")
    lunaris_app.run() 