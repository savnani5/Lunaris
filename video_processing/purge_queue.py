import boto3
import os
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

def purge_sqs_queue():
    sqs = boto3.client('sqs',
        aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
        region_name=os.environ.get('AWS_REGION')
    )
    
    queue_url = os.environ.get('SQS_QUEUE_URL')
    
    try:
        # Purge the queue
        sqs.purge_queue(QueueUrl=queue_url)
        print("Queue purged successfully")
        
        # Optional: Receive and delete any in-flight messages
        while True:
            response = sqs.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=10,
                VisibilityTimeout=1
            )
            
            if 'Messages' not in response:
                break
                
            for message in response['Messages']:
                sqs.delete_message(
                    QueueUrl=queue_url,
                    ReceiptHandle=message['ReceiptHandle']
                )
                
        print("In-flight messages cleaned up")
        
    except Exception as e:
        print(f"Error cleaning up queue: {e}")

if __name__ == "__main__":
    purge_sqs_queue()