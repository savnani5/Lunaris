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
from datetime import datetime
import tempfile

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

        # Determine if we're running locally or in production
        self.is_production = os.environ.get('AWS_EXECUTION_ENV') is not None
        
        # Set cache directory based on environment
        if self.is_production:
            self.ytdl_cache_dir = '/efs/ytdl_cache'
        else:
            # Use system temp directory for local development
            self.ytdl_cache_dir = os.path.join(tempfile.gettempdir(), 'ytdl_cache')
        
        # Create cache directory if it doesn't exist
        try:
            os.makedirs(self.ytdl_cache_dir, exist_ok=True)
            logger.info(f"Using cache directory: {self.ytdl_cache_dir}")
        except OSError as e:
            logger.warning(f"Could not create cache directory {self.ytdl_cache_dir}: {e}")
            # Fallback to temporary directory
            self.ytdl_cache_dir = os.path.join(tempfile.gettempdir(), 'ytdl_cache')
            os.makedirs(self.ytdl_cache_dir, exist_ok=True)
            logger.info(f"Using fallback cache directory: {self.ytdl_cache_dir}")

    def handle_shutdown(self, signum, frame):
        logger.info("Received shutdown signal. Cleaning up...")
        self.running = False
        
        # Wait for active tasks to complete with timeout
        with self.tasks_lock:
            for future in self.active_tasks:
                try:
                    future.result(timeout=10)  # 10 second timeout
                except TimeoutError:
                    logger.warning("Task didn't complete within timeout during shutdown")
                except Exception as e:
                    logger.error(f"Task failed during shutdown: {e}")
        
        self.executor.shutdown(wait=True)
        logger.info("Shutdown complete")

    def update_project_status(self, clerk_user_id, project_id, status, stage, progress, title, processing_timeframe, remaining_estimate=None):
        LunarisApp.update_project_status(
            clerk_user_id, 
            project_id, 
            status, 
            stage, 
            progress, 
            title, 
            processing_timeframe,
            remaining_estimate
        )

    def process_message(self, message):
        try:
            data = json.loads(message['Body'])
            project_type = data.get('project_type', 'auto')
            
            logger.info(f"Processing video: {data['video_title']}")
            self.video_processor.process_video(
                video_link=data.get('video_link'),
                video_path=data.get('video_path'),
                project_id=data.get('project_id'),
                clerk_user_id=data.get('clerk_user_id'),
                user_email=data.get('user_email'),
                video_title=data.get('video_title'),
                processing_timeframe=data.get('processing_timeframe'),
                video_quality=data.get('video_quality'),
                video_type=data.get('video_type'),
                start_time=data.get('start_time'),
                end_time=data.get('end_time'), 
                clip_length=data.get('clip_length'),  # None for manual
                keywords=data.get('keywords', ''),    # None for manual
                caption_style=data.get('caption_style'), 
                add_watermark=data.get('add_watermark'),
                update_status_callback=self.update_project_status,
                s3_client=self.s3,
                s3_bucket=self.s3_bucket,
                project_type=project_type,
                clips=data.get('clips')  # Will be None for auto projects
            )
            
            # Delete the message after successful processing
            self.sqs.delete_message(
                QueueUrl=self.sqs_queue_url,
                ReceiptHandle=message['ReceiptHandle']
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
            
            # Delete failed messages to prevent reprocessing
            self.sqs.delete_message(
                QueueUrl=self.sqs_queue_url,
                ReceiptHandle=message['ReceiptHandle']
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

    def list_inflight_messages(self):
        """List all in-flight messages without affecting them"""
        try:
            # Get queue attributes to see message counts
            response = self.sqs.get_queue_attributes(
                QueueUrl=self.sqs_queue_url,
                AttributeNames=['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
            )
            
            attrs = response['Attributes']
            logger.info(f"Queue status:")
            logger.info(f"Messages available: {attrs['ApproximateNumberOfMessages']}")
            logger.info(f"Messages in flight: {attrs['ApproximateNumberOfMessagesNotVisible']}")
            
            # Attempt to peek at in-flight messages (they won't be returned until visibility timeout expires)
            response = self.sqs.receive_message(
                QueueUrl=self.sqs_queue_url,
                MaxNumberOfMessages=10,
                VisibilityTimeout=0  # Don't change current visibility timeout
            )
            
            if 'Messages' in response:
                for msg in response['Messages']:
                    body = json.loads(msg['Body'])
                    logger.info(f"Message ID: {msg['MessageId']}")
                    logger.info(f"Project ID: {body.get('project_id')}")
                    logger.info(f"Video Title: {body.get('video_title')}")
                    logger.info("---")
            
            return response.get('Messages', [])
            
        except Exception as e:
            logger.error(f"Error listing in-flight messages: {e}")
            return []

    def purge_all_messages(self):
        """Purge all messages (both queued and in-flight)"""
        try:
            # First purge the queue (removes available messages)
            self.sqs.purge_queue(QueueUrl=self.sqs_queue_url)
            logger.info("Queue purged successfully")
            
            # Wait 60 seconds (required by AWS between purge operations)
            logger.info("Waiting 60 seconds before cleaning up in-flight messages...")
            time.sleep(60)
            
            # Then receive and delete any in-flight messages as they become visible
            messages_deleted = 0
            while True:
                response = self.sqs.receive_message(
                    QueueUrl=self.sqs_queue_url,
                    MaxNumberOfMessages=10,
                    VisibilityTimeout=1  # Short timeout to make messages visible again quickly
                )
                
                if 'Messages' not in response:
                    break
                    
                for message in response['Messages']:
                    try:
                        self.sqs.delete_message(
                            QueueUrl=self.sqs_queue_url,
                            ReceiptHandle=message['ReceiptHandle']
                        )
                        messages_deleted += 1
                    except Exception as e:
                        logger.error(f"Error deleting message: {e}")
                
            logger.info(f"Cleanup complete. Deleted {messages_deleted} in-flight messages")
            
        except Exception as e:
            logger.error(f"Error during queue purge: {e}")

    def cancel_specific_project(self, project_id):
        """Cancel processing for a specific project"""
        try:
            messages_checked = 0
            messages_deleted = 0
            
            while True:
                response = self.sqs.receive_message(
                    QueueUrl=self.sqs_queue_url,
                    MaxNumberOfMessages=10,
                    VisibilityTimeout=30
                )
                
                if 'Messages' not in response:
                    break
                    
                for message in response['Messages']:
                    messages_checked += 1
                    body = json.loads(message['Body'])
                    
                    if body.get('project_id') == project_id:
                        try:
                            self.sqs.delete_message(
                                QueueUrl=self.sqs_queue_url,
                                ReceiptHandle=message['ReceiptHandle']
                            )
                            messages_deleted += 1
                            logger.info(f"Deleted message for project {project_id}")
                        except Exception as e:
                            logger.error(f"Error deleting message: {e}")
                    else:
                        # Return message to queue if it's not for our target project
                        try:
                            self.sqs.change_message_visibility(
                                QueueUrl=self.sqs_queue_url,
                                ReceiptHandle=message['ReceiptHandle'],
                                VisibilityTimeout=0
                            )
                        except Exception as e:
                            logger.error(f"Error returning message to queue: {e}")
                            
            logger.info(f"Project cancellation complete. Checked {messages_checked} messages, deleted {messages_deleted} messages for project {project_id}")
            
        except Exception as e:
            logger.error(f"Error cancelling project: {e}")

if __name__ == '__main__':
    worker = Worker()
    worker.run()
    # worker.list_inflight_messages()
    # worker.purge_all_messages()
    # worker.cancel_specific_project("project_123")