## Checkout make viral clips from podcast -> Automate that!
# If no faces -> detect a human body and use the bounding box of the human body
# Sliding change of frames -> smooth moving bbox

import moviepy.editor as mp_edit
import mediapipe as mp
import argparse
import os
import shutil
import glob
import tempfile
import subprocess
import json
from openai import OpenAI
import cv2
from moviepy.editor import TextClip, CompositeVideoClip
from moviepy.editor import VideoFileClip, AudioFileClip
from models.clip import Clip
from flask import url_for
from botocore.exceptions import ClientError
from deepgram import (
    DeepgramClient,
    PrerecordedOptions,
    FileSource,
)
from pydantic import BaseModel
from typing import List

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
DG_API_KEY = os.environ["DG_API_KEY"]

class Segment(BaseModel):
    title: str
    text: str
    transcript: str
    score: int
    hook: str
    flow: str
    engagement: str
    trend: str

class SegmentList(BaseModel):
    segments: List[Segment]

class VideoProcessor:
    def __init__(self, db):
        self.face_detection = mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)
        self.openai_client = OpenAI()
        self.deepgram_client = DeepgramClient(DG_API_KEY)
        self.db = db

    def download_video(self, source, path, quality, start_time, end_time):
        # Add directory check
        if not os.path.exists(path):
            os.makedirs(path)

        quality = quality.replace('p', '')
        
        if isinstance(source, str):  # It's a URL
            video_title = subprocess.check_output(["yt-dlp", source, "--get-title"], universal_newlines=True).strip()
            path = os.path.join(path, video_title)
            if not os.path.exists(path):
                os.mkdir(path)
            else:
                # Delete the contents of the folder
                for file in os.listdir(path):
                    file_path = os.path.join(path, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
            
            subprocess.run(["yt-dlp", source, "-P", path, "-S", f"res:{quality}", "--output", "%(title)s.%(ext)s"])
            print("Video downloaded successfully!")
            video_path = glob.glob(os.path.join(path, "*.*"))[0]
        else:  # It's a local file path
            video_title = os.path.splitext(os.path.basename(source))[0]
            path = os.path.join(path, video_title)
            if not os.path.exists(path):
                os.mkdir(path)
            video_path = os.path.join(path, os.path.basename(source))
            shutil.copy(source, video_path)
            print("Video copied successfully!")

        video_extension = os.path.splitext(video_path)[1]
        
        # Cut video
        cut_video_path = video_path.replace(video_extension, f"_cut{video_extension}")
        subprocess.run(["ffmpeg", "-i", video_path, "-ss", str(start_time), "-to", str(end_time), "-c", "copy", cut_video_path])
        
        # Extract and cut audio
        cut_audio_path = cut_video_path.replace(video_extension, ".mp3")
        subprocess.run(["ffmpeg", "-i", cut_video_path, "-q:a", "0", "-map", "a", cut_audio_path])
        
        # Remove original files
        os.remove(video_path)
        
        print("Video cut and audio extracted successfully!")
        return cut_video_path, cut_audio_path, video_title

    def extract_audio(self, video_path):
        audio_path = os.path.splitext(video_path)[0] + ".mp3"
        subprocess.run(["ffmpeg", "-i", video_path, "-q:a", "0", "-map", "a", audio_path])
        print("Audio extracted successfully!")
        return audio_path

    def clip_video(self, video_path, segments, output_folder='./clips'):
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)
        
        video = mp_edit.VideoFileClip(video_path)
        
        for i, segment in enumerate(segments):
            start = segment['start']
            end = segment['end']
            clip = video.subclip(start, end)
            clip.write_videofile(f"{output_folder}/clip_{i+1}.mp4")

    def get_interesting_segments(self, transcript_text, word_timings, clip_length, keywords, output_file='interesting_segments.json'):
        # Generate prompt for OpenAI
        prompt = f"""
        You are an expert content creator specializing in extracting engaging clips from podcasts. Analyze the following transcript and create compelling short-form content:

        Transcript:
        {transcript_text}

        Task:
        1. Identify the most interesting and engaging segments from the transcript.
        2. Each segment should be cohesive, maintaining context and flow.
        3. Segment length: {clip_length['min']} to {clip_length['max']} seconds.
        4. If provided, focus on segments containing these keywords: {keywords if keywords else 'No specific keywords'}.
        5. For each segment, provide:
           - Title: A catchy, relevant title
           - Text: The exact transcript without punctuation
           - Transcript: The same text with proper punctuation and capitalization
           - Score: A number between 70 and 100, indicating overall quality
           - Hook: Grade A, A+, A-, B, or B+
           - Flow: Grade A, A+, A-, B, or B+
           - Engagement: Grade A, A+, A-, B, or B+
           - Trend: Grade A, A+, A-, B, or B+

        Ensure each segment is self-contained and engaging, with a good narrative flow. Prioritize segments that will captivate and retain viewer attention.
        """

        completion = self.openai_client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": "You are an AI assistant specialized in analyzing podcast transcripts and identifying engaging segments for short-form content creation. Your task is to extract interesting, cohesive segments that maintain context and flow, suitable for social media clips."},
                {"role": "user", "content": prompt},
            ],
            response_format=SegmentList,
        )

        segments = completion.choices[0].message.parsed.segments

        # Build the combined segment data
        segment_data = []

        for segment in segments:
            title = segment.title
            text = segment.text
            transcript = segment.transcript
            score = segment.score
            hook = segment.hook
            flow = segment.flow
            engagement = segment.engagement
            trend = segment.trend
            word_timings_in_segment = []

            # Find the start and end times for the combined text
            words = text.lower().split()
            start_time = None
            end_time = None
            start = False

            for i in range(len(word_timings)):
                if start:
                    word_timings_in_segment.append(word_timings[i])

                # Check if the first 10 words match
                if [wt['word'] for wt in word_timings[i:i+10]] == words[:10]:
                    start_time = word_timings[i]['start']
                    start = True
                    word_timings_in_segment.append(word_timings[i])

                # Check if the last 10 words match
                if [wt['word'] for wt in word_timings[i:i+10]] == words[-10:]:
                    end_time = word_timings[i+9]['end']
                    word_timings_in_segment.extend(word_timings[i+1:i+10])
                    break
            
            if start_time is None or end_time is None:
                continue

            segment_data.append({
                'title': title,
                'start': start_time,
                'end': end_time,
                'text': text,
                'transcript': transcript,
                'word_timings': word_timings_in_segment,
                'score': score,
                'hook': hook,
                'flow': flow,
                'engagement': engagement,
                'trend': trend
            })
        
        # Write the combined data to a JSON file
        with open(output_file, 'w') as json_file:
            json.dump(segment_data, json_file, indent=4)

        print(f"Interesting segments extracted and saved to {output_file}")
        return segment_data

    def detect_faces_and_draw_boxes(self, frame):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_detection.process(rgb_frame)
        if results.detections:
            face_bboxes = []
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                x, y, w, h = bbox.xmin, bbox.ymin, bbox.width, bbox.height
                x, y, w, h = int(x * frame.shape[1]), int(y * frame.shape[0]), int(w * frame.shape[1]), int(h * frame.shape[0])
                face_bboxes.append((x, y, w, h))
            return face_bboxes
        return []

    def crop_and_add_subtitles(self, video_path, segments, output_video_type='portrait', output_folder='./subtitled_clips', s3_client=None, s3_bucket=None, user_id=None, project_id=None, debug=False):
        # Add directory check
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)
        
        video = mp_edit.VideoFileClip(video_path)
        video_duration = video.duration
        
        prev_box1 = None
        processed_clip_ids = []

        for segment in segments:
            clip = self.process_segment(video, segment, video_duration)
            if clip is None:
                continue
            
            processed_clip = self.process_clip(clip, output_video_type, prev_box1)
            final_clip = self.add_subtitles(processed_clip, segment['word_timings'], segment['start'], output_video_type)
            
            _, clip_url = self.save_or_upload_clip(final_clip, segment['title'], output_video_type, output_folder, s3_client, s3_bucket, user_id, project_id, debug)
            
            clip_id = self.create_and_save_clip(project_id, segment, clip_url)
            processed_clip_ids.append(clip_id)

        return processed_clip_ids

    def process_segment(self, video, segment, video_duration):
        start = segment['start']
        end = segment['end']

        if end > video_duration:
            end = video_duration
        if start >= end:
            return None
        
        return video.subclip(start, end)

    def process_clip(self, clip, output_video_type, prev_box1):
        def process_frame(get_frame, t):
            nonlocal prev_box1
            frame = get_frame(t)

            if output_video_type == 'portrait':
                frame_height, frame_width, _ = frame.shape
                target_width, target_height = 1080, 1920
                faces = self.detect_faces_and_draw_boxes(frame)
                
                if faces:
                    face = faces[0]
                    (x, y, w, h) = face
                    new_box = self.adjust_bounding_box(x, y, w, h, frame_height, frame_width)
                    if prev_box1 is None or self.is_significant_change(prev_box1, new_box):
                        prev_box1 = new_box
                    x, y, w, h = prev_box1
                    face_crop = frame[y:y+h, x:x+w]
                    processed_frame = cv2.resize(face_crop, (target_width, target_height))
                elif prev_box1 is not None:
                    x, y, w, h = prev_box1
                    face_crop = frame[y:y+h, x:x+w]
                    processed_frame = cv2.resize(face_crop, (target_width, target_height))
                else:
                    center_x, center_y = frame_width // 2, frame_height // 2
                    default_w, default_h = target_width, target_height
                    default_x = max(0, center_x - default_w // 2)
                    default_y = max(0, center_y - default_h // 2)
                    default_crop = frame[default_y:default_y+default_h, default_x:default_x+default_w]
                    processed_frame = cv2.resize(default_crop, (target_width, target_height))
            else:  # landscape
                target_width, target_height = 1920, 1080
                processed_frame = cv2.resize(frame, (target_width, target_height))

            return processed_frame
        
        return clip.fl(process_frame)

    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        def make_textclip(txt, start_time, end_time, color='white', position=('center', 'center')):
            txt_clip = TextClip(txt.upper(), fontsize=50 if output_video_type == 'landscape' else 100, 
                                color=color, font='Arial-Bold', bg_color='black')
            txt_clip = txt_clip.set_position(position).set_start(start_time).set_duration(end_time - start_time)
            return txt_clip

        position = ('center', processed_clip.h * (0.85 if output_video_type == 'landscape' else 0.85))
        txt_clips = [make_textclip(wt['word'], wt['start'] - start_time, wt['end'] - start_time, color='yellow', position=position)
                     for wt in word_timings]
        
        return CompositeVideoClip([processed_clip] + txt_clips)


    def save_or_upload_clip(self, final_clip, title, output_video_type, output_folder, s3_client, s3_bucket, user_id, project_id, debug):
        clip_filename = f"{title}_{output_video_type}.mp4"
        
        # Create directory structure
        if debug:
            # Create user directory if it doesn't exist
            user_dir = os.path.join(output_folder, str(user_id))
            if not os.path.exists(user_dir):
                os.makedirs(user_dir)
            
            # Create project directory if it doesn't exist
            project_dir = os.path.join(user_dir, str(project_id))
            if not os.path.exists(project_dir):
                os.makedirs(project_dir)
            
            output_file_path = os.path.join(project_dir, clip_filename)
            final_clip.write_videofile(output_file_path, codec='libx264')
            print(f"Video '{title}' processed and subtitled successfully as {output_video_type}!")
            clip_url = url_for('get_clip', base_url=output_folder, user_id=user_id, project_id=project_id, filename=clip_filename, _external=True)
            print(f"Debug: Clip URL: {clip_url}")

        elif s3_client and s3_bucket:
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
                temp_filename = temp_file.name
                final_clip.write_videofile(temp_filename, codec='libx264')
            try:
                s3_key = os.path.join(str(user_id), str(project_id), clip_filename)
                s3_client.upload_file(temp_filename, s3_bucket, s3_key)
                
                # Generate a pre-signed URL
                try:
                    clip_url = s3_client.generate_presigned_url('get_object',
                                                                Params={'Bucket': s3_bucket,
                                                                        'Key': s3_key},
                                                                        ExpiresIn=3600 * 24)  # URL expires in 1 day
                except ClientError as e:
                    print(f"Error generating pre-signed URL: {e}")
                    clip_url = None

                print(f"Debug: Pre-signed URL: {clip_url}")
                print(f"Video '{title}' processed, subtitled, and uploaded to S3 successfully as {output_video_type}!")
            finally:
                os.unlink(temp_filename)
        else:
            raise ValueError("Either debug mode or S3 configuration must be provided")
        
        return clip_filename, clip_url

    def create_and_save_clip(self, project_id, segment, clip_url):
        clip = Clip(project_id, 
                    segment['title'], 
                    segment['transcript'], 
                    clip_url,
                    score=segment['score'],
                    hook=segment['hook'],
                    flow=segment['flow'],
                    engagement=segment['engagement'],
                    trend=segment['trend'])
            
        # Insert clip into MongoDB
        clip_dict = clip.to_dict()
        self.db.clips.insert_one(clip_dict)
            
        return clip._id

    def adjust_bounding_box(self, x, y, w, h, frame_height, frame_width):
        # Target aspect ratio (9:16)
        target_aspect_ratio = 9 / 16
        
        # Desired vertical position range for the face (between 1/4 and 1/3 from the top)
        min_face_position = 1 / 4
        max_face_position = 1 / 3
        
        # Calculate the minimum height needed to fit the face
        min_height = h / min_face_position
        
        # Calculate the width needed to maintain aspect ratio
        width = min_height * target_aspect_ratio
        
        # If the calculated width is less than the frame width, increase both dimensions
        if width < frame_width:
            scale_factor = frame_width / width
            width = frame_width
            height = min_height * scale_factor
        else:
            height = min_height
        
        # Ensure we don't exceed the frame height
        if height > frame_height:
            height = frame_height
            width = height * target_aspect_ratio
        
        # Calculate the y-position to place the face between 1/4 and 1/3 from the top
        face_position = max(min_face_position, min(max_face_position, h / height))
        new_y = max(0, y - (height * face_position - h) / 2)
        
        # Center the face horizontally
        new_x = max(0, x + w / 2 - width / 2)
        
        # Adjust if exceeding frame boundaries
        if new_x + width > frame_width:
            new_x = frame_width - width
        if new_y + height > frame_height:
            new_y = frame_height - height
        
        # Ensure we don't go out of bounds
        new_x = max(0, int(new_x))
        new_y = max(0, int(new_y))
        new_w = min(int(width), frame_width - new_x)
        new_h = min(int(height), frame_height - new_y)

        return new_x, new_y, new_w, new_h

    def is_significant_change(self, box1, box2, threshold=0.4):
        x1, y1, w1, h1 = box1
        x2, y2, w2, h2 = box2
        return (abs(x1 - x2) > threshold * w1 or
                abs(y1 - y2) > threshold * h1 or
                abs(w1 - w2) > threshold * w1 or
                abs(h1 - h2) > threshold * h1)

    def transcribe_audio(self, audio_path):
        print("Transcribing audio...")
        
        with open(audio_path, "rb") as file:
            buffer_data = file.read()

        payload: FileSource = {
            "buffer": buffer_data,
        }

        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True
        )

        response = self.deepgram_client.listen.prerecorded.v("1").transcribe_file(payload, options)

        word_timings = []
        full_transcript = ''
        
        for word in response.results.channels[0].alternatives[0].words:
            word_timings.append({
                'start': word.start,
                'end': word.end,
                'word': word.word.strip().lower()
            })
            full_transcript += word.word + ' '
        
        full_transcript = full_transcript.strip()
        with open("transcript.txt", 'w') as file:
            file.write(full_transcript)
        
        print("Audio transcribed successfully!")
        return full_transcript, word_timings


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run the Lunaris App')
    parser.add_argument('-d', '--debug', action='store_true', help='Run in debug mode')
    args = parser.parse_args()

    video_path = "./downloads"

    # Initialize VideoProcessor
    processor = VideoProcessor(db=None)

    # Ensure directories exist
    os.makedirs(video_path, exist_ok=True)

    youtube_url = input("Enter youtube video url: ")
    video_quality = input("Enter video quality (high, medium, low): ")
    output_video_type = input("Enter output video type (portrait, landscape): ")
   

    # Download video and extract audio
    downloaded_video_path, downloaded_audio_path, _ = processor.download_video(youtube_url, video_path, video_quality)

    # Transcribe audio
    transcript, word_timings = processor.transcribe_audio(downloaded_audio_path)

    # Get interesting segments
    interesting_data = processor.get_interesting_segments(transcript, word_timings)
    
    # DEBUG: load from file
    # with open("interesting_segments.json", 'r') as f:
    #     interesting_data = json.load(f)
    # downloaded_video_path = "/Users/parassavnani/Desktop/dev/Lunaris/backend/downloads/No Priors Ep. 80 | With Andrej Karpathy from OpenAI and Tesla/No Priors Ep. 80 ｜ With Andrej Karpathy from OpenAI and Tesla.webm"
    # output_video_type = "landscape"

    # Crop video to portrait with faces
    processor.crop_and_add_subtitles(downloaded_video_path, interesting_data, output_video_type, debug=args.debug)