import os
import boto3
from dotenv import load_dotenv
from botocore.exceptions import ClientError

# Load environment variables
load_dotenv()

# AWS credentials and configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

def test_s3_upload():
    # Path to the subtitled_clips folder
    clips_folder = './subtitled_clips'
    
    if not os.path.exists(clips_folder):
        print(f"Error: {clips_folder} does not exist.")
        return
    
    # Iterate through files in the subtitled_clips folder
    for filename in os.listdir(clips_folder):
        if filename.endswith('.mp4'):
            local_file_path = os.path.join(clips_folder, filename)
            s3_file_key = f'test_uploads/{filename}'
            
            try:
                # Upload the file to S3
                s3_client.upload_file(local_file_path, S3_BUCKET_NAME, s3_file_key)
                print(f"Successfully uploaded {filename} to S3 bucket {S3_BUCKET_NAME}")
                
                # Generate a pre-signed URL for the uploaded file
                url = s3_client.generate_presigned_url('get_object',
                                                       Params={'Bucket': S3_BUCKET_NAME,
                                                               'Key': s3_file_key},
                                                       ExpiresIn=3600)
                print(f"Pre-signed URL for {filename}: {url}")
                
            except ClientError as e:
                print(f"Error uploading {filename}: {e}")

if __name__ == "__main__":
    test_s3_upload()
