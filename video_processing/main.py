import moviepy.editor as mp_edit
import mediapipe as mp
import os
import shutil
import glob
import subprocess
import json
from openai import OpenAI
import cv2
import numpy as np
from deepgram import (
    DeepgramClient,
    PrerecordedOptions,
    FileSource,
)
from pydantic import BaseModel
from typing import List
import requests
import threading
import resend

from caption_styles import CaptionStyleFactory
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
    def __init__(self):
        # Add thread locks for shared resources
        self._face_detection_lock = threading.Lock()
        self._openai_lock = threading.Lock()
        self._deepgram_lock = threading.Lock()
        
        # Initialize clients in a thread-safe way
        with self._face_detection_lock:
            self.face_detection = mp.solutions.face_detection.FaceDetection(
                model_selection=1, 
                min_detection_confidence=0.5
            )
        
        with self._openai_lock:
            self.openai_client = OpenAI()
            
        with self._deepgram_lock:
            self.deepgram_client = DeepgramClient(DG_API_KEY)

        resend.api_key = os.environ.get('RESEND_API_KEY')
    
    def download_video(self, source, path, quality, start_time, end_time):
        # Add directory check
        if not os.path.exists(path):
            os.makedirs(path)

        quality = quality.replace('p', '')
        
        if isinstance(source, str):  # It's a URL
            # video_title = subprocess.check_output(["yt-dlp", source, "--get-title", "--username", "oauth", "--password", "", "--cache-dir", "/efs/ytdl_cache"], universal_newlines=True).strip()
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
            
            # Update yt-dlp command to use EFS cache
            # subprocess.run([
            #     "yt-dlp", 
            #     source, 
            #     "-P", 
            #     path,
            #     "-S", 
            #     f"res:{quality}",
            #     "--output",
            #     "%(title)s.%(ext)s",
            #     "--username",
            #     "oauth",
            #     "--password",
            #     "",
            #     "--cache-dir",
            #     "/efs/ytdl_cache"
            # ])
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

    def get_interesting_segments(self, transcript_text, word_timings, clip_length, keywords="", output_file='interesting_segments.json'):
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

        Important requirements:
        - Ensure segments are non-overlapping. Each segment should cover a unique portion of the transcript.
        - Present the segments in sequential order as they appear in the transcript.
        - Ensure each segment is self-contained and engaging, with a good narrative flow.
        - Prioritize segments that will captivate and retain viewer attention.

        Provide a list of segments that meet these criteria, maintaining the original order from the transcript.
        """

        with self._openai_lock:
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

        print(f"Interesting segments extracted!")
        
        # ____________________
        # with open(output_file, 'w') as json_file:
        #     json.dump(segment_data, json_file, indent=4)
        # ____________________
        
        return segment_data

    def detect_faces_and_pose(self, frame):
        with self._face_detection_lock:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            face_results = self.face_detection.process(rgb_frame)
            # pose_results = self.pose_detection.process(rgb_frame)
            
            face_bboxes = []
            pose_detected = False
            
            if face_results.detections:
                for detection in face_results.detections:
                    bbox = detection.location_data.relative_bounding_box
                    x, y, w, h = bbox.xmin, bbox.ymin, bbox.width, bbox.height
                    x, y, w, h = int(x * frame.shape[1]), int(y * frame.shape[0]), int(w * frame.shape[1]), int(h * frame.shape[0])
                    face_bboxes.append((x, y, w, h))
            
            # if pose_results.pose_landmarks:
            #     pose_detected = True
            
            return face_bboxes #pose_detected

    def crop_and_add_subtitles(self, video_path, segments, output_video_type='portrait', caption_style='elon', output_folder='./subtitled_clips', s3_client=None, s3_bucket=None, user_id=None, project_id=None, debug=False, progress_callback=None, add_watermark=False):
        # Add directory check
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)
        
        video = mp_edit.VideoFileClip(video_path)
        video_duration = video.duration
        
        processed_clip_ids = []

        caption_styler = CaptionStyleFactory.get_style(caption_style)
        
        for i, segment in enumerate(segments):
            clip = self.process_segment(video, segment, video_duration)
            if clip is None:
                continue
            
            processed_clip = self.process_clip(clip, output_video_type, add_watermark)
            subtitled_clip = caption_styler.add_subtitles(processed_clip, segment['word_timings'], segment['start'], output_video_type)
            _, clip_url = self.save_or_upload_clip(subtitled_clip, segment['title'], output_video_type, output_folder, s3_client, s3_bucket, user_id, project_id, debug)
            clip_data = {
                'project_id': project_id,
                'title': segment['title'],
                'transcript': segment['transcript'],
                's3_uri': clip_url,
                'score': segment['score'],
                'hook': segment['hook'],
                'flow': segment['flow'],
                'engagement': segment['engagement'],
                'trend': segment['trend']
            }
            self.send_clip_data(clip_data)

            if progress_callback:
                progress_callback(i + 1)

        return processed_clip_ids

    def process_segment(self, video, segment, video_duration):
        start = segment['start']
        end = segment['end']

        if end > video_duration:
            end = video_duration
        if start >= end:
            return None
        
        return video.subclip(start, end)

    # Smooth transitions b/w modes required for the video
    def process_clip(self, clip, output_video_type, add_watermark=False):
        if output_video_type != 'portrait':
            return clip.resize((1920, 1080))

        # Constants
        FACE_DETECTION_THRESHOLD = 3
        NO_DETECTION_THRESHOLD = 10
        SMOOTHING_FACTOR = 0.8
        JITTER_THRESHOLD = 30

        frame_count = int(clip.duration * clip.fps)
        
        # First pass: Decide mode for each frame
        modes = []
        face_detection_counter = 0
        no_detection_counter = 0
        is_initial_phase = True

        for t in range(frame_count):
            frame = clip.get_frame(t / clip.fps)
            faces = self.detect_faces_and_pose(frame)

            if is_initial_phase:
                if len(faces) == 1:
                    face_detection_counter += 1
                    if face_detection_counter >= FACE_DETECTION_THRESHOLD:
                        is_initial_phase = False
                    modes.append('face')
                else:
                    no_detection_counter += 1
                    if no_detection_counter >= NO_DETECTION_THRESHOLD:
                        is_initial_phase = False
                    modes.append('full')
            else:
                if len(faces) == 1:
                    face_detection_counter += 1
                    no_detection_counter = 0
                else:
                    face_detection_counter = 0
                    no_detection_counter += 1

                if face_detection_counter >= FACE_DETECTION_THRESHOLD:
                    modes.append('face')
                elif no_detection_counter >= NO_DETECTION_THRESHOLD:
                    modes.append('full')
                else:
                    modes.append(modes[-1] if modes else 'full')

        # Second pass: Filter out jitter
        filtered_modes = []
        current_mode = modes[0]
        mode_duration = 0

        for mode in modes:
            if mode == current_mode:
                mode_duration += 1
            else:
                if mode_duration >= JITTER_THRESHOLD:
                    filtered_modes.extend([current_mode] * mode_duration)
                else:
                    filtered_modes.extend([filtered_modes[-1] if filtered_modes else current_mode] * mode_duration)
                current_mode = mode
                mode_duration = 1

        # Add the last mode
        if mode_duration >= JITTER_THRESHOLD:
            filtered_modes.extend([current_mode] * mode_duration)
        else:
            filtered_modes.extend([filtered_modes[-1] if filtered_modes else current_mode] * mode_duration)

        # Third pass: Generate frames
        last_valid_face = None
        gradient_colors = None

        # Load and prepare the watermark
        if add_watermark:
            target_height = frame.shape[0]  # Assuming 'frame' is your input image/video frame
            watermark = cv2.imread('/Users/parassavnani/Desktop/dev/Lunaris/backend/watermark.png', cv2.IMREAD_UNCHANGED)
            watermark_height = int(target_height * 0.05)  # 5% of frame height
            aspect_ratio = watermark.shape[1] / watermark.shape[0]
            watermark_width = int(watermark_height * aspect_ratio)
            watermark = cv2.resize(watermark, (watermark_width, watermark_height))

            # Separate the alpha channel and convert to float
            watermark_alpha = watermark[:, :, 3].astype(float) / 255.0
            watermark_alpha = np.expand_dims(watermark_alpha, axis=2)
            watermark_rgb = watermark[:, :, :3].astype(float) / 255.0

        def process_frame(get_frame, t):
            nonlocal last_valid_face, gradient_colors

            frame = get_frame(t)
            frame_index = int(t * clip.fps)
            
            # Ensure frame_index is within bounds
            if frame_index >= len(filtered_modes):
                print(f"Warning: frame_index {frame_index} exceeds filtered_modes length {len(filtered_modes)}. Using last known mode.")
                current_mode = filtered_modes[-1]  # Use the last known mode
            else:
                current_mode = filtered_modes[frame_index]

            frame_height, frame_width, _ = frame.shape
            target_width, target_height = (1080, 1920)

            faces = self.detect_faces_and_pose(frame)

            if current_mode == 'face':
                processed_frame, last_valid_face = self.process_face_frame(frame, faces, last_valid_face, frame_height, frame_width, target_width, target_height, SMOOTHING_FACTOR)
            else:  # 'full' mode
                processed_frame = self.create_landscape_frame(frame, target_width, target_height, gradient_colors)

            gradient_colors = self.update_gradient_colors(processed_frame)
            
            if add_watermark:
                processed_frame = self.add_watermark(processed_frame, watermark_rgb, watermark_alpha)
                     
            return processed_frame

        return clip.fl(process_frame)

    def process_face_frame(self, frame, faces, last_valid_face, frame_height, frame_width, target_width, target_height, smoothing_factor):
        if faces:
            face = faces[0]
            (x, y, w, h) = face
            new_box = self.adjust_bounding_box(x, y, w, h, frame_height, frame_width)
            
            if last_valid_face is None:
                last_valid_face = new_box
            elif self.is_significant_change(last_valid_face, new_box):
                # Apply smoothing
                last_valid_face = self.smooth_bounding_box(last_valid_face, new_box, smoothing_factor)

        if last_valid_face:
            x, y, w, h = last_valid_face
            face_crop = frame[y:y+h, x:x+w]
            return cv2.resize(face_crop, (target_width, target_height)), last_valid_face
        else:
            return self.create_landscape_frame(frame, target_width, target_height, None), None

    def blend_frames(self, frame1, frame2, alpha):
        return cv2.addWeighted(frame1, alpha, frame2, 1 - alpha, 0)

    def create_landscape_frame(self, frame, target_width, target_height, gradient_colors):
        aspect_ratio = frame.shape[1] / frame.shape[0]
        new_height = int(target_width / aspect_ratio)
        resized_frame = cv2.resize(frame, (target_width, new_height))
        
        processed_frame = np.zeros((target_height, target_width, 3), dtype=np.uint8)
        
        y_offset = (target_height - new_height) // 2
        processed_frame[y_offset:y_offset+new_height, :] = resized_frame
        
        if gradient_colors is None:
            gradient_colors = {
                'top': np.median(resized_frame[:10, :], axis=(0, 1)).astype(np.uint8),
                'bottom': np.median(resized_frame[-10:, :], axis=(0, 1)).astype(np.uint8)
            }
        
        for i in range(y_offset):
            alpha = i / y_offset
            processed_frame[i] = (1 - alpha) * gradient_colors['top'] + alpha * gradient_colors['top']
            processed_frame[target_height - i - 1] = (1 - alpha) * gradient_colors['bottom'] + alpha * gradient_colors['bottom']
        
        return processed_frame

    def update_gradient_colors(self, frame):
        return {
            'top': np.median(frame[:10, :], axis=(0, 1)).astype(np.uint8),
            'bottom': np.median(frame[-10:, :], axis=(0, 1)).astype(np.uint8)
        }

    def save_or_upload_clip(self, clip, title, video_type, output_folder, s3_client, s3_bucket, user_id, project_id, debug=False):
        if not debug and (s3_client is None or s3_bucket is None):
            raise ValueError("S3 configuration must be provided in production mode")
        
        # Generate a unique filename
        filename = f"{user_id}_{project_id}_{title}_{video_type}.mp4"
        local_path = os.path.join(output_folder, filename)
        
        # Save locally first
        clip.write_videofile(local_path)
        
        if debug:
            return local_path, f"file://{local_path}"
        
        try:
            # Upload to S3
            s3_key = f"{user_id}/{project_id}/{filename}"
            s3_client.upload_file(local_path, s3_bucket, s3_key)
            
            # Generate presigned URL (expires in 7 days)
            presigned_url = s3_client.generate_presigned_url('get_object',
                Params={
                    'Bucket': s3_bucket,
                    'Key': s3_key
                },
                ExpiresIn=604800  # 7 days in seconds
            )
            
            # Clean up local file
            os.remove(local_path)
            
            return s3_key, presigned_url
        except Exception as e:
            print(f"Failed to upload to S3: {str(e)}")
            raise

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

    def smooth_bounding_box(self, old_box, new_box, smoothing_factor):
        return tuple(int(old * smoothing_factor + new * (1 - smoothing_factor)) 
                     for old, new in zip(old_box, new_box))

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

        with self._deepgram_lock:
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
        # with open("transcript.txt", 'w') as file:
        #     file.write(full_transcript)
        
        print("Audio transcribed successfully!")
        return full_transcript, word_timings

    def send_clip_data(self, clip_data):
        try:
            response = requests.post(f"{os.environ.get('FRONTEND_URL')}/api/get-clips", json=clip_data)
            response.raise_for_status()
            print(f"Clip data sent successfully")
        except Exception as e:
            print(f"Failed to send clip data: {str(e)}")

    def add_watermark(self, frame, watermark_rgb, watermark_alpha):
        frame_height, frame_width = frame.shape[:2]
        watermark_height, watermark_width = watermark_rgb.shape[:2]

        # Calculate position (bottom-right corner with a small margin)
        margin = 10
        y = frame_height - watermark_height - margin
        x = frame_width - watermark_width - margin

        # Extract the region of interest (ROI) from the frame
        roi = frame[y:y+watermark_height, x:x+watermark_width].astype(float) / 255.0

        # Blend the watermark with the ROI
        blended = (1.0 - watermark_alpha) * roi + watermark_alpha * watermark_rgb

        # Put the blended image back into the frame
        frame[y:y+watermark_height, x:x+watermark_width] = (blended * 255).astype(np.uint8)

        return frame

    def process_video(self, video_link, video_path=None, project_id=None, clerk_user_id=None, 
                     user_email=None, video_title=None, processing_timeframe=None, 
                     video_quality="720p", video_type="portrait", start_time=0, end_time=60, 
                     clip_length=None, keywords="", caption_style="elon", add_watermark=False,
                     update_status_callback=None, s3_client=None, s3_bucket=None):
        try:
            
            if update_status_callback:
                update_status_callback(clerk_user_id, project_id, "processing", "downloading", 0, video_title, processing_timeframe)
            
            if video_link:
                downloaded_video_path, downloaded_audio_path, video_title = self.download_video(video_link, "./downloads", video_quality, start_time, end_time)
            else:
                downloaded_video_path = video_path
                downloaded_audio_path = self.extract_audio(video_path)

            if update_status_callback:
                update_status_callback(clerk_user_id, project_id, "processing", "transcribing", 10, video_title, processing_timeframe)
            
            transcript, word_timings = self.transcribe_audio(downloaded_audio_path)

            if update_status_callback:
                update_status_callback(clerk_user_id, project_id, "processing", "analyzing", 20, video_title, processing_timeframe)
            
            interesting_data = self.get_interesting_segments(transcript, word_timings, clip_length, keywords)

            if update_status_callback:
                update_status_callback(clerk_user_id, project_id, "processing", "generating", 40, video_title, processing_timeframe)
            
            total_segments = len(interesting_data)

            def progress_callback(i):
                if update_status_callback:
                    update_status_callback(clerk_user_id, project_id, "processing", "generating", 40 + int((i / total_segments) * 50), video_title, processing_timeframe)

            processed_clip_ids = self.crop_and_add_subtitles(
                downloaded_video_path,
                interesting_data,
                output_video_type=video_type,
                caption_style=caption_style,
                output_folder='./subtitled_clips',
                s3_client=s3_client,
                s3_bucket=s3_bucket,
                user_id=clerk_user_id,
                project_id=project_id,
                debug=False,  # Force production mode
                progress_callback=progress_callback,
                add_watermark=add_watermark
            )

            if update_status_callback:
                update_status_callback(clerk_user_id, project_id, "processing", "uploading", 95, video_title, processing_timeframe)

            # Clean up downloaded files
            video_title_folder = os.path.join("./downloads", video_title)
            if os.path.exists(video_title_folder):
                for file in os.listdir(video_title_folder):
                    file_path = os.path.join(video_title_folder, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                os.rmdir(video_title_folder)

            # Send email notification
            try:
                print(f"Sending completion email to {user_email}")
                email_params: resend.Emails.SendParams = {
                    "from": "Lunaris Clips <output@lunaris.media>",
                    "to": [user_email],
                    "subject": "Your clips are ready 🎬!",
                    "html": f"""
                    <p>Hey there 👋</p>
                    <p>The clips for your video "<b>{video_title}</b>" are ready!</p> 
                    <p>You can view your clips <a href="{os.environ.get('FRONTEND_URL')}/project/{project_id}/clips">here</a>.</p>
                    """
                }
                resend.Emails.send(email_params)
                print("Email sent successfully")
            except Exception as e:
                print(f"Email notification failed: {str(e)}")

            if update_status_callback:
                update_status_callback(
                    clerk_user_id, project_id, "completed", "completed", 100,
                    video_title, processing_timeframe
                )

            return processed_clip_ids

        except Exception as e:
            if update_status_callback:
                update_status_callback(
                    clerk_user_id, project_id, "failed", "failed", 0,
                    video_title, processing_timeframe
                )
            raise e


if __name__ == "__main__":#
   
    # video_path = "./downloads"

    # # Initialize VideoProcessor
    processor = VideoProcessor()

    # Ensure directories exist
    # os.makedirs(video_path, exist_ok=True)

    # youtube_url = input("Enter youtube video url: ")
    # video_quality = input("Enter video quality (high, medium, low): ")
    # output_video_type = input("Enter output video type (portrait, landscape): ")
   

    # Download video and extract audio
    # downloaded_video_path, downloaded_audio_path, _ = processor.download_video(youtube_url, video_path, video_quality, 0, 1000)

    downloaded_video_path = "/Users/parassavnani/Desktop/dev/Lunaris/backend/downloads/Jayalalitha - Tamil Nadu's Most Iconic Woman Ever/Jayalalitha - Tamil Nadu's Most Iconic Woman Ever_cut.webm"
    downloaded_audio_path = "/Users/parassavnani/Desktop/dev/Lunaris/backend/downloads/Jayalalitha - Tamil Nadu's Most Iconic Woman Ever/Jayalalitha - Tamil Nadu's Most Iconic Woman Ever_cut.mp3"
    
    # downloaded_video_path = "/Users/parassavnani/Desktop/dev/Lunaris/backend/downloads/The Theory That Angels and Demons Are Actually Aliens/The Theory That Angels and Demons Are Actually Aliens_cut.webm"
    # downloaded_audio_path = "/Users/parassavnani/Desktop/dev/Lunaris/backend/downloads/The Theory That Angels and Demons Are Actually Aliens/The Theory That Angels and Demons Are Actually Aliens_cut.mp3"
    
    # downloaded_video_path = "/Users/parassavnani/Desktop/dev/Lunaris/backend/downloads/Assassination of Julius Caesar | Gregory Aldrete and Lex Fridman/Assassination of Julius Caesar ｜ Gregory Aldrete and Lex Fridman_cut.webm"
    # downloaded_audio_path = "/Users/parassavnani/Desktop/dev/Lunaris/backend/downloads/Assassination of Julius Caesar | Gregory Aldrete and Lex Fridman/Assassination of Julius Caesar ｜ Gregory Aldrete and Lex Fridman_cut.mp3"

    # Transcribe audio
    # transcript, word_timings = processor.transcribe_audio(downloaded_audio_path)

    # # Get interesting segments
    # clip_length = {"min": 0, "max": 60}
    # interesting_data = processor.get_interesting_segments(transcript, word_timings, clip_length)

    # with open('interesting_segments.json', 'w') as json_file:
    #     json.dump(interesting_data, json_file, indent=4)

    
    # DEBUG: load from file
    with open("interesting_segments.json", 'r') as f:
        interesting_data = json.load(f)

    # output_video_type = "landscape"
    output_video_type = "portrait"

    # Crop video to portrait with faces
    processor.crop_and_add_subtitles(downloaded_video_path, interesting_data, output_video_type, debug=True)    