from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import logging
from logging.handlers import RotatingFileHandler
import boto3
from main import VideoProcessor
from dotenv import find_dotenv, load_dotenv
from werkzeug.utils import secure_filename
import tempfile
import requests
import json
from concurrent.futures import ThreadPoolExecutor
import threading

load_dotenv(find_dotenv())

app = Flask(__name__)
CORS(app)

CORS(app, resources={r"/api/*": {"origins": "*"}}, 
            allow_headers=['Content-Type', 'Authorization'], 
            supports_credentials=True)


# Configure logging
logging.basicConfig(
    level=os.getenv('LOGGING_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Reduce boto3 logging noise
logging.getLogger('boto3').setLevel(os.getenv('BOTO_LOG_LEVEL', 'WARNING'))
logging.getLogger('botocore').setLevel(os.getenv('BOTO_LOG_LEVEL', 'WARNING'))
logging.getLogger('urllib3').setLevel(os.getenv('BOTO_LOG_LEVEL', 'WARNING'))

logger = logging.getLogger(__name__)

logger.info("Starting app.py")

class LunarisApp:
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')  # Set a default value
    video_path = "./downloads"
    output_path = "./subtitled_clips"
    s3_client = None
    s3_bucket = None
    debug = False

    # Add thread-safe SQS client
    _sqs_lock = threading.Lock()
    _executor = ThreadPoolExecutor(max_workers=8)  # For async tasks

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
        self.processing_videos = {}

        self.configure_app()
        # self.setup_cors()
        # self.setup_routes()
        self.setup_logging()
        self.video_processor = VideoProcessor()
        LunarisApp.setup_s3()  # Call the class method to set up S3
        self.setup_sqs()

   
    def configure_app(self):
        app.config.update(
            APPLICATION_ROOT='/',
            PREFERRED_URL_SCHEME='https' if not self.debug else 'http',
        )

    # def setup_cors(self):
    #     CORS(app, resources={r"/api/*": {"origins": "*"}}, 
    #         allow_headers=['Content-Type', 'Authorization'], 
    #         supports_credentials=True)

    def setup_logging(self):
        # Consider using CloudWatch for logging in production
        if not self.debug:
            # Setup CloudWatch logging here
            pass
        else:
            # Remove existing handlers
            app.logger.handlers.clear()

            log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            log_file = 'lunaris_app.log'
            
            file_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
            file_handler.setFormatter(log_formatter)
            file_handler.setLevel(logging.INFO)

            console_handler = logging.StreamHandler()
            console_handler.setFormatter(log_formatter)
            console_handler.setLevel(logging.INFO)

            app.logger.addHandler(file_handler)
            app.logger.addHandler(console_handler)
            app.logger.setLevel(logging.INFO)

            # Disable Flask's default logger
            app.logger.propagate = False

            app.logger.info("Logging setup completed")
            app.logger.setLevel(logging.INFO)

            # Disable Flask's default logger
            app.logger.propagate = False

            app.logger.info("Logging setup completed")
    

    def setup_sqs(self):
        self.sqs = boto3.client('sqs',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            region_name=os.environ.get('AWS_REGION')
        )
        self.sqs_queue_url = os.environ.get('SQS_QUEUE_URL')

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
        app.logger.info("Received request to process video")
        
        try:
            video_link = request.form.get('videoLink')

            # Extract request data
            # Common data extraction
            project_type = request.form.get('project_type')
            message = {
                'video_link': video_link,
                'project_type': project_type,
                'project_id': request.form.get('projectId'),
                'clerk_user_id': request.form.get('userId'),
                'user_email': request.form.get('email'),
                'video_title': request.form.get('videoTitle'),
                'video_quality': request.form.get('videoQuality'),
                'video_type': request.form.get('videoType').lower(),
                'video_duration': float(request.form.get('videoDuration', 0)),
                'caption_style': request.form.get('captionStyle', 'elon'),
            }

            # Type-specific data extraction
            if project_type == 'auto':
                message.update({
                    'processing_timeframe': request.form.get('processing_timeframe'),
                    'start_time': float(request.form.get('startTime')),
                    'end_time': float(request.form.get('endTime')),
                    'clip_length': {
                        'min': float(request.form.get('clipLengthMin')),
                        'max': float(request.form.get('clipLengthMax'))
                    },
                    'keywords': request.form.get('keywords'),
                    'add_watermark': request.form.get('addWatermark', False)
                })
            else:  # manual
                message['clips'] = json.loads(request.form.get('clips'))

            # Send to SQS
            with self._sqs_lock:
                try:
                    response = self.sqs.send_message(
                        QueueUrl=self.sqs_queue_url,
                        MessageBody=json.dumps(message)
                    )
                    
                    return jsonify({
                        'message': 'Video processing queued successfully',
                        'task_id': response['MessageId']
                    }), 202
                    
                except Exception as e:
                    app.logger.error(f"Failed to queue video processing: {str(e)}")
                    return jsonify({
                        'error': 'Failed to queue video processing'
                    }), 500
                
        except Exception as e:
            app.logger.error(f"Error processing video request: {str(e)}")
            return jsonify({
                'error': 'Failed to process video request'
            }), 500

    def _cleanup_temp_file(self, file_path):
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except Exception as e:
            app.logger.error(f"Failed to cleanup temporary file {file_path}: {str(e)}")

    def health_check(self):
        logger.info("Health check called")
        return jsonify({'status': 'healthy'}), 200

    def run(self):
        app.run(host='0.0.0.0', port=5001)

    @classmethod
    def update_project_status(cls, clerk_user_id, project_id, status, stage, progress, title, processing_timeframe, remaining_estimate=None):
        try:
            data = {
                'userId': clerk_user_id,
                'projectId': project_id,
                'status': status,
                'progress': progress,
                'stage': stage,
                'title': title,
                'processing_timeframe': processing_timeframe,
                'remaining_estimate': remaining_estimate
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

    
# Create a single instance of LunarisApp
lunaris_app = LunarisApp(debug=False)

# Global routes
@app.route('/health', methods=['GET'])
def health_check():
    logger.info("Health check called")
    return jsonify({'status': 'healthy'}), 200

@app.route('/api/process-video', methods=['POST'])
def process_video():
    return lunaris_app.process_video()

if __name__ == "__main__":
    app.logger.info(f"Lunaris App initialized with debug mode: False")    
    lunaris_app.run()