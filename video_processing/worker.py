import boto3
import json
import os
import logging
import signal
from dotenv import find_dotenv, load_dotenv
from main import VideoProcessor
from app import LunarisApp
import time
from concurrent.futures import ThreadPoolExecutor
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Create logger
logger = logging.getLogger(__name__)

# Reduce boto3 and urllib3 logging noise
logging.getLogger('boto3').setLevel(logging.WARNING)
logging.getLogger('botocore').setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)
logging.getLogger('s3transfer').setLevel(logging.WARNING)

# Disable PIL debug logging
logging.getLogger('PIL').setLevel(logging.WARNING)

# Add a custom formatter for error messages
error_formatter = logging.Formatter(
    '%(asctime)s [%(levelname)s] %(message)s\n%(pathname)s:%(lineno)d',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Add a handler for error messages
error_handler = logging.StreamHandler()
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(error_formatter)
logger.addHandler(error_handler)

load_dotenv(find_dotenv())

class Worker:
    def __init__(self):
        # Initialize AWS clients
        self.sqs = boto3.client('sqs',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            region_name=os.environ.get('AWS_REGION')
        )
        self.s3 = boto3.client('s3',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            region_name=os.environ.get('AWS_REGION')
        )
        
        self.sqs_queue_url = os.environ.get('SQS_QUEUE_URL')
        self.s3_bucket = os.environ.get('S3_BUCKET_NAME')
        self.video_processor = VideoProcessor()
        self.running = True
        
        # Initialize thread pool with max workers
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.active_tasks = []
        self.tasks_lock = threading.Lock()

        # Set up signal handlers
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        signal.signal(signal.SIGINT, self.handle_shutdown)

        # Set up yt-dlp cache directory
        self.ytdl_cache_dir = "/efs/ytdl_cache"
        os.makedirs(self.ytdl_cache_dir, exist_ok=True)
        os.environ["YTDL_CACHE_DIR"] = self.ytdl_cache_dir

    def handle_shutdown(self, signum, frame):
        logger.info("Received shutdown signal. Cleaning up...")
        self.running = False
        # Wait for active tasks to complete
        with self.tasks_lock:
            for future in self.active_tasks:
                future.result()
        self.executor.shutdown(wait=True)

    def update_project_status(self, clerk_user_id, project_id, status, stage, progress, title, processing_timeframe):
        LunarisApp.update_project_status(clerk_user_id, project_id, status, stage, progress, title, processing_timeframe)

    def process_message(self, message):
        data = json.loads(message['Body'])
        
        try:
            logger.info(f"Processing video: {data['video_title']}")
            processed_clip_ids = self.video_processor.process_video(
                video_link=data['video_link'],
                video_path=data['video_path'],
                project_id=data['project_id'],
                clerk_user_id=data['clerk_user_id'],
                user_email=data['user_email'],
                video_title=data['video_title'],
                processing_timeframe=data['processing_timeframe'],
                video_quality=data['video_quality'],
                video_type=data['video_type'],
                start_time=data['start_time'],
                end_time=data['end_time'],
                clip_length=data['clip_length'],
                keywords=data['keywords'],
                caption_style=data['caption_style'],
                add_watermark=data['add_watermark'],
                update_status_callback=self.update_project_status,
                s3_client=self.s3,  # Pass S3 client
                s3_bucket=self.s3_bucket  # Pass S3 bucket
            )
            return True

        except Exception as e:
            logger.error(
                f"Video processing failed for project {data['project_id']}\n"
                f"Title: {data['video_title']}\n"
                f"Error: {str(e)}",
                exc_info=True
            )
            self.update_project_status(
                data['clerk_user_id'],
                data['project_id'],
                "failed",
                "failed",
                0,
                data['video_title'],
                data['processing_timeframe']
            )
            return False

    def run(self):
        logger.info("Worker started and waiting for messages...")
        
        while self.running:
            try:
                # Receive up to 4 messages
                response = self.sqs.receive_message(
                    QueueUrl=self.sqs_queue_url,
                    MaxNumberOfMessages=4,
                    WaitTimeSeconds=20,
                    VisibilityTimeout=3600
                )

                if 'Messages' in response:
                    for message in response['Messages']:
                        if not self.running:
                            break
                        
                        # Submit task to thread pool
                        future = self.executor.submit(self.process_message, message)
                        
                        # Clean up completed tasks
                        with self.tasks_lock:
                            self.active_tasks = [t for t in self.active_tasks if not t.done()]
                            self.active_tasks.append(future)
                    
                    time.sleep(1)  # Small delay to prevent tight polling
                            
            except Exception as e:
                logger.error(f"Main loop error: {str(e)}", exc_info=True)
                time.sleep(1)

        logger.info("Worker shutting down...")

if __name__ == '__main__':
    worker = Worker()
    worker.run()