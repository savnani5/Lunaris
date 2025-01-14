import moviepy.editor as mp_edit
import mediapipe as mp
import os
import glob
import subprocess
import json
import httpx
from anthropic import Anthropic
import cv2
import boto3
import numpy as np
from deepgram import (
    DeepgramClient,
    PrerecordedOptions,
    FileSource,
)
import requests
import threading
import resend
import time


from caption_styles import CaptionStyleFactory
from dotenv import find_dotenv, load_dotenv
from proxy_manager import ProxyManager

load_dotenv(find_dotenv())

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
DG_API_KEY = os.environ["DG_API_KEY"]

class VideoProcessor:
    def __init__(self):
        # Add thread locks for shared resources
        self._face_detection_lock = threading.Lock()
        self._anthropic_lock = threading.Lock()
        self._deepgram_lock = threading.Lock()
        
        # Initialize proxy manager with its own lock
        self.proxy_manager = ProxyManager()
        
        # Initialize S3 client
        self.s3_client = boto3.client('s3',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            region_name=os.environ.get('AWS_REGION')
        )
        
        # Initialize clients in a thread-safe way
        with self._face_detection_lock:
            self.face_detection = mp.solutions.face_detection.FaceDetection(
                model_selection=1, 
                min_detection_confidence=0.5
            )
        
        with self._anthropic_lock:
            self.anthropic_client = Anthropic()
            
        with self._deepgram_lock:
            self.deepgram_client = DeepgramClient(DG_API_KEY)

        resend.api_key = os.environ.get('RESEND_API_KEY')
        
        # Simplified timing estimates (seconds per minute of video)
        self.PROCESSING_ESTIMATE = {
            '360p': {
                'base_time': 90,    # Base processing time in seconds
                'per_minute': 25    # Additional seconds per minute of video
            },
            '480p': {
                'base_time': 90,
                'per_minute': 35
            },
            '720p': {
                'base_time': 90,
                'per_minute': 45
            },
            '1080p': {
                'base_time': 90,
                'per_minute': 55
            }
        }
        self.process_start_time = None
    
    def download_video(self, source, path, quality, start_time, end_time, project_type="auto", clips=None, update_status_with_estimate=None, clerk_user_id=None, project_id=None, video_title=None, processing_timeframe=None):
        if not os.path.exists(path):
            os.makedirs(path)

        quality = quality.replace('p', '')
        
        if isinstance(source, str):
            # Clean up YouTube URL if it contains playlist parameters
            if 'youtube.com' in source and '&list=' in source:
                source = source.split('&list=')[0]
                print(f"Cleaned YouTube URL: {source}")

            if source.startswith('s3://'):
                # Handle S3 source
                bucket = source.split('/')[2]
                print(f"Bucket: {bucket}")
                key = '/'.join(source.split('/')[3:])
                print(f"Key: {key}")
                video_title = os.path.splitext(os.path.basename(key))[0]
                print(f"Video title: {video_title}")
                local_path = os.path.join(path, video_title)
                print(f"Local path: {local_path}")
                os.makedirs(local_path, exist_ok=True)
                video_path = os.path.join(local_path, os.path.basename(key))
                print(f"Video path: {video_path}")
                try:
                    print(f"Downloading from S3: {bucket}/{key}")
                    self.s3_client.download_file(bucket, key, video_path)
                    
                    # Clean up S3 temp file after download
                    print(f"Cleaning up S3 temp file: {bucket}/{key}")
                    self.s3_client.delete_object(Bucket=bucket, Key=key)
                    
                    # Notify frontend about cleanup
                    cleanup_url = f"{os.environ.get('FRONTEND_URL')}/api/cleanup-s3"
                    requests.post(cleanup_url, json={
                        'bucket': bucket,
                        'key': key
                    })
                except Exception as e:
                    raise Exception(f"Failed to download from S3: {str(e)}")
                
            elif source.startswith(('http://', 'https://')):
                success = False
                max_retries = 3
                retry_count = 0
                
                while retry_count < max_retries and not success:
                    try:
                        proxy_url = self.proxy_manager.get_proxy_url()
                        print(f"Attempting download with proxy: {proxy_url}")
                        
                        # Test proxy connection before attempting download
                        try:
                            test_cmd = [
                                "curl", "-v", "-x", proxy_url, 
                                "https://ipv4.icanhazip.com", 
                                "--connect-timeout", "10"
                            ]
                            test_result = subprocess.run(
                                test_cmd,
                                capture_output=True,
                                text=True,
                                timeout=15
                            )
                            print(f"Proxy test result: {test_result.stdout}")
                            if test_result.returncode != 0:
                                raise Exception(f"Proxy test failed: {test_result.stderr}")
                        except Exception as e:
                            print(f"Proxy connection test failed: {str(e)}")
                            raise

                        # Get video title if not provided
                        if not video_title:
                            yt_dlp_cmd = ["yt-dlp", source, "--get-title", "--proxy", proxy_url]
                            video_title = subprocess.check_output(
                                yt_dlp_cmd, 
                                universal_newlines=True,
                                timeout=30
                            ).strip()
                        
                        path = os.path.join(path, video_title)
                        if not os.path.exists(path):
                            os.makedirs(path)
                        else:
                            for file in os.listdir(path):
                                file_path = os.path.join(path, file)
                                if os.path.isfile(file_path):
                                    os.remove(file_path)
                        
                        # Download command with progress
                        download_cmd = [
                            "yt-dlp",
                            source,
                            "-P",
                            path,
                            "-S",
                            f"res:{quality}",
                            "--output",
                            "%(title)s.%(ext)s",
                            "--proxy",
                            proxy_url,
                            "--progress",
                            "--newline",
                        ]
                        
                        process = subprocess.Popen(
                            download_cmd,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            universal_newlines=True,
                            bufsize=1
                        )

                        # Track overall download state
                        max_progress = 0
                        current_progress = 0
                        is_audio_phase = False
                        for line in process.stdout:
                            if '[download]' in line and '%' in line:
                                try:
                                    # Skip merger and destination lines
                                    if any(x in line for x in ['Destination:', 'Merging formats']):
                                        continue
                                    
                                    # Check if we've switched to audio download phase
                                    if 'audio' in line.lower() or (max_progress > 95 and float(line.split('%')[0].split()[-1]) < 20):
                                        is_audio_phase = True
                                        
                                    # Extract percentage from line
                                    percent_part = line.split('%')[0]
                                    percent_str = percent_part.split()[-1]
                                    percent = float(percent_str)
                                    
                                    # Calculate overall progress based on phase
                                    if is_audio_phase:
                                        # Map audio progress (0-100) to overall progress (10-15)
                                        overall_progress = 11 + int((percent * 5) / 100)
                                    else:
                                        # Map video progress (0-100) to overall progress (1-11)
                                        overall_progress = 1 + int((percent * 10) / 100)
                                    
                                    # Keep track of maximum progress
                                    if percent > max_progress and not is_audio_phase:
                                        max_progress = percent
                                    
                                    # Only update if progress has changed significantly (every 2%)
                                    if abs(percent - current_progress) >= 2:
                                        current_progress = percent
                                        # Ensure we never go backwards in progress
                                        overall_progress = max(overall_progress, int((max_progress * 10) / 100))
                                        
                                        update_status_with_estimate("downloading", overall_progress)
                                        print(f"Download progress: {percent:.1f}% (Overall: {overall_progress}/15)")
                                        
                                except (ValueError, IndexError) as e:
                                    print(f"Error parsing progress: {str(e)} in line: {line}")
                                    continue
                        process.wait()
                        if process.returncode == 0:
                            success = True
                        else:
                            raise Exception("Download process failed")
                    except Exception as e:
                        print(f"Download attempt {retry_count + 1} failed: {str(e)}")
                        print(f"Full error: {repr(e)}")
                        self.proxy_manager.mark_failure(proxy_url)
                        retry_count += 1
                        if retry_count < max_retries:
                            time.sleep(3)
                    
                if not success:
                    raise Exception("Failed to download video after maximum retries")
                    
                video_path = glob.glob(os.path.join(path, "*.*"))[0]
        
        # Process video based on project type
        if project_type == "auto":
            cut_video_path = self.cut_video(video_path, start_time, end_time, project_type)
            return video_path, cut_video_path, video_title
        else:  # manual
            cut_video_paths = []
            for clip in clips:
                start = clip.get('start', clip.get('startTime'))
                end = clip.get('end', clip.get('endTime'))
                cut_path = self.cut_video(video_path, start, end, project_type)
                cut_video_paths.append(cut_path)
            return video_path, cut_video_paths, video_title

    def cut_video(self, video_path, start_time, end_time, project_type):
        video_extension = os.path.splitext(video_path)[1]
        
        if project_type == "auto":
            # Cut video
            cut_video_path = video_path.replace(video_extension, f"_cut{video_extension}")
            subprocess.run(["ffmpeg", "-i", video_path, "-ss", str(start_time), "-to", str(end_time), "-c", "copy", cut_video_path])
            
            # Extract and cut audio
            cut_audio_path = cut_video_path.replace(video_extension, ".mp3")
            subprocess.run(["ffmpeg", "-i", cut_video_path, "-q:a", "0", "-map", "a", cut_audio_path])
            
            # Remove original file only for auto type
            os.remove(video_path)
            
            print("Video cut and audio extracted successfully!")
            return cut_video_path
        else:
            # For manual clips, create unique names
            clip_id = f"clip_{start_time:.2f}_{end_time:.2f}"
            cut_video_path = video_path.replace(video_extension, f"_{clip_id}{video_extension}")
            subprocess.run(["ffmpeg", "-i", video_path, "-ss", str(start_time), "-to", str(end_time), "-c", "copy", cut_video_path])
            
            # Extract and cut audio
            cut_audio_path = cut_video_path.replace(video_extension, ".mp3")
            subprocess.run(["ffmpeg", "-i", cut_video_path, "-q:a", "0", "-map", "a", cut_audio_path])
            
            print(f"Clip {clip_id} cut and audio extracted successfully!")
            return cut_video_path

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

    def get_interesting_segments(self, transcript_text, word_timings, clip_length, keywords=""):
        # Calculate video duration
        total_duration = word_timings[-1]['end'] - word_timings[0]['start']
        duration_minutes = total_duration / 60
        
        # For videos under 30 mins, process normally
        if duration_minutes <= 30:
            return self._process_transcript_chunk(
                transcript_text,
                word_timings,
                clip_length,
                keywords,
                duration_minutes
            )
        
        # Calculate number of splits needed (roughly 30 min chunks)
        num_splits = max(2, int(duration_minutes / 30))
        print(f"Splitting {duration_minutes:.1f} minute video into {num_splits} chunks")
        
        # Split transcript into roughly equal chunks by word count
        words = transcript_text.split()
        words_per_chunk = len(words) // num_splits
        overlap_words = 150  # Roughly 1 minute of speech
        
        all_segments = []
        
        # Process each chunk
        for i in range(num_splits):
            start_idx = max(0, i * words_per_chunk - overlap_words if i > 0 else 0)
            end_idx = min(len(words), (i + 1) * words_per_chunk + overlap_words if i < num_splits - 1 else len(words))
            
            chunk_transcript = ' '.join(words[start_idx:end_idx])
            chunk_duration = duration_minutes / num_splits + 2  # Add 2 minutes for overlap
            
            print(f"Processing chunk {i+1}/{num_splits} ({len(chunk_transcript.split())} words)")
            
            try:
                chunk_segments = self._process_transcript_chunk(
                    chunk_transcript,
                    word_timings,
                    clip_length,
                    keywords,
                    chunk_duration
                )
                all_segments.extend(chunk_segments)
                
            except Exception as e:
                print(f"Error processing chunk {i+1}: {str(e)}")
        
        # Sort segments by start time
        all_segments.sort(key=lambda x: x['start'])
        
        # Remove duplicate segments from overlap regions
        filtered_segments = []
        last_end = 0
        
        for segment in all_segments:
            # Skip if this segment overlaps significantly with the previous one
            if filtered_segments and segment['start'] < last_end:
                # Calculate overlap percentage
                overlap = (last_end - segment['start']) / (segment['end'] - segment['start'])
                if overlap > 0.6:  # Skip if more than 60% overlap
                    continue
            
            filtered_segments.append(segment)
            last_end = segment['end']
        
        print(f"Found {len(filtered_segments)} total segments after filtering")
        return filtered_segments

    def _process_transcript_chunk(self, transcript_text, word_timings, clip_length, keywords="", duration_minutes=0):
        """Process a single chunk of transcript - contains the original analysis logic"""
        # Calculate expectations based on duration
        if duration_minutes <= 4:  # Short videos (≤ 4 minutes)
            min_segments = 1
            target_segments = 4
        elif duration_minutes <= 10:  # Medium-short videos (4-10 minutes)
            min_segments = 3
            target_segments = 6
        elif duration_minutes <= 30:  # Medium videos (10-30 minutes)
            min_segments = 5
            target_segments = 12
        else:  # Longer chunks
            min_segments = 7
            target_segments = 15

        max_retries = 3
        for attempt in range(max_retries):
            try:
                prompt = f"""You are an expert content creator specializing in extracting engaging clips from podcasts. Analyze the following transcript and create compelling short-form content.

                Transcript:
                {transcript_text}

                Task:
                1. Extract engaging segments that meet these criteria:
                   - For this {duration_minutes:.1f}-minute section:
                     * MUST find at least {min_segments} segments
                     * AIM for {target_segments} segments if possible
                     * Prioritize segment quality but don't be overly strict
                   - Target length: {clip_length['min']} to {clip_length['max']} seconds
                   - Must be self-contained and coherent
                   - Must have clear hooks and conclusions
                   - Must have 4-5 relevant hashtags
                
                2. CRITICAL FORMATTING REQUIREMENTS:
                   - For each segment, provide TWO versions of the text:
                     a) 'text': Exact transcript text as provided (lowercase, no punctuation)
                     b) 'transcript': Properly formatted version with:
                        * Capitalized sentences
                        * Proper punctuation
                        * Periods at the end of sentences
                        * Natural paragraph breaks
                   
                   Example format:
                   text: "yeah so i think the most important thing is to focus on what matters and not get distracted by all the noise around you thats what really makes the difference"
                   
                   transcript: "Yeah, so I think the most important thing is to focus on what matters and not get distracted by all the noise around you. That's what really makes the difference."

                3. Prioritize segments that:
                   - Have attention-grabbing openings
                   - Tell complete, emotionally resonant stories
                   - Contain unique insights or perspectives
                   - Include personal experiences or transformative moments
                   - Discuss universal themes (success, growth, relationships, etc.)

                4. Score each segment (60-100) based on:
                   - Viral potential (70% weight)
                       * Hook strength
                       * Emotional impact
                       * Relatability
                       * Share-worthy insight
                   - Technical aspects (30% weight)
                       * Story completeness
                       * Length optimization

                5. CRITICAL REQUIREMENTS:
                   - You MUST return exactly the transcript text that matches your chosen segments
                   - The text must exist in the transcript exactly as provided
                   - You MUST find at least {min_segments} segments
                   - Try to find up to {target_segments} segments if possible
                   - Each segment must be a complete thought/story
                   - Distribute segments throughout the video (don't cluster them)

                6. If provided, prioritize (but don't limit to) segments containing these keywords: {keywords if keywords else 'No specific keywords'}.

                Important:
                - This is a {duration_minutes:.1f}-minute video requiring at least {min_segments} segments
                - For longer videos, accept more variety in segment quality
                - Return EXACT transcript text for each segment
                - Better to have more segments with varying quality than too few perfect ones
                
                Use the process_segments tool to return your analysis in the required format.
                """

                with self._anthropic_lock:
                    response = self.anthropic_client.messages.create(
                        model="claude-3-sonnet-20240229",
                        max_tokens=4096,
                        messages=[{
                            "role": "user",
                            "content": prompt
                        }],
                        tools=[{
                            "name": "process_segments",
                            "description": "Process and return segments from transcript",
                            "input_schema": {
                                "type": "object",
                                "properties": {
                                    "segments": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "title": {"type": "string", "description": "Catchy, relevant title"},
                                                "text": {"type": "string", "description": "Exact transcript text for matching"},
                                                "transcript": {"type": "string", "description": "Properly formatted transcript with punctuation and capitalization"},
                                                "score": {"type": "integer", "minimum": 60, "maximum": 100},
                                                "hook": {"type": "string", "enum": ["A+", "A", "A-", "B+", "B"]},
                                                "flow": {"type": "string", "enum": ["A+", "A", "A-", "B+", "B"]},
                                                "engagement": {"type": "string", "enum": ["A+", "A", "A-", "B+", "B"]},
                                                "trend": {"type": "string", "enum": ["A+", "A", "A-", "B+", "B"]},
                                                "hashtags": {
                                                    "type": "array",
                                                    "items": {"type": "string"},
                                                    "description": "4-5 relevant hashtags for the clip",
                                                    "minItems": 4,
                                                    "maxItems": 5
                                                }
                                            },
                                            "required": ["title", "text", "transcript", "score", "hook", "flow", "engagement", "trend", "hashtags"]
                                        }
                                    }
                                },
                                "required": ["segments"]
                            }
                        }],
                        tool_choice={"type": "tool", "name": "process_segments"}
                    )
                    
                    print("claude Response: ", response)
                    tool_response = response.content[0].input
                    segments = tool_response.get("segments", [])
                    
                    if not segments:
                        raise ValueError("No segments returned by Claude")

                    # Build the combined segment data
                    segment_data = []
                    for segment in segments:
                        # Access dictionary values
                        title = segment['title']
                        text = segment['text']
                        transcript = segment['transcript']
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
                            'score': segment['score'],
                            'hook': segment['hook'],
                            'flow': segment['flow'],
                            'engagement': segment['engagement'],
                            'trend': segment['trend'],
                            'hashtags': segment['hashtags'],
                        })

                   
                    print(f"Found {len(segment_data)} interesting segments!")
                    return segment_data
                    
            except Exception as e:
                if attempt < max_retries - 1:  # If we have retries left
                    print(f"Attempt {attempt + 1} failed: {str(e)}")
                    print(f"Retrying... ({attempt + 1}/{max_retries})")
                    time.sleep(2)  # Add a small delay between retries
                    continue
                else:
                    print(f"All {max_retries} attempts failed. Last error: {str(e)}")
                    raise  # Re-raise the last exception if all retries failed

    def detect_faces_and_pose(self, frame):
        with self._face_detection_lock:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            face_results = self.face_detection.process(rgb_frame)
            # pose_results = self.pose_detection.process(rgb_frame)
            
            face_bboxes = []
            # pose_detected = False
            
            if face_results.detections:
                for detection in face_results.detections:
                    bbox = detection.location_data.relative_bounding_box
                    x, y, w, h = bbox.xmin, bbox.ymin, bbox.width, bbox.height
                    x, y, w, h = int(x * frame.shape[1]), int(y * frame.shape[0]), int(w * frame.shape[1]), int(h * frame.shape[0])
                    face_bboxes.append((x, y, w, h))
            
            # if pose_results.pose_landmarks:
            #     pose_detected = True
            
            return face_bboxes #pose_detected

    def crop_and_add_subtitles(self, video_path, segments, output_video_type='portrait', caption_style='elon', 
                          output_folder='./subtitled_clips', s3_client=None, s3_bucket=None, 
                          user_id=None, project_id=None, debug=False, progress_callback=None, 
                          add_watermark=False, project_type=None):
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)
        
        video = mp_edit.VideoFileClip(video_path)
        
        for i, segment in enumerate(segments):
            # For manual clips, skip subclipping since the video is already cut
            
            clip = self.process_segment(video, segment, video.duration)
            if clip is None:
                continue
            
            processed_clip = self.process_clip(clip, output_video_type, add_watermark)
            
            if caption_style != "no_captions":
                caption_styler = CaptionStyleFactory.get_style(caption_style)
                subtitled_clip = caption_styler.add_subtitles(
                    processed_clip, 
                    segment['word_timings'], 
                    0 if project_type == "manual" else segment['start'],  # Start from 0 for manual clips
                    output_video_type
                )
            else:
                subtitled_clip = processed_clip
            
            _, clip_url = self.save_or_upload_clip(subtitled_clip, segment['title'], 
                                                 output_video_type, output_folder, 
                                                 s3_client, s3_bucket, user_id, 
                                                 project_id, debug)
            
            clip_data = {
                'project_id': project_id,
                'title': segment['title'],
                'transcript': segment['transcript'],
                's3_uri': clip_url,
                'score': segment.get('score'),
                'hook': segment.get('hook'),
                'flow': segment.get('flow'),
                'engagement': segment.get('engagement'),
                'trend': segment.get('trend'),
                'hashtags': segment.get('hashtags', [])
            }
            
            self.send_clip_data(clip_data)
            
            if progress_callback:
                progress_callback(i + 1)

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
            clip = clip.set_fps(clip.fps)
            return clip.resize((1920, 1080))

        # Constants
        FACE_DETECTION_THRESHOLD = 3
        NO_DETECTION_THRESHOLD = 10
        SMOOTHING_FACTOR = 0.8
        JITTER_THRESHOLD = 60

        clip = clip.set_fps(clip.fps)
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
            # Check if this is a new person (significant change)
            elif self.is_significant_change(last_valid_face, new_box, threshold=0.3):  # Increased threshold
                # Immediately center on new face without smoothing
                last_valid_face = new_box
            elif self.is_minor_movement(last_valid_face, new_box):
                # Ignore small movements
                pass
            else:
                last_valid_face = new_box
                # Apply smoothing only for moderate changes
                # last_valid_face = self.smooth_bounding_box(last_valid_face, new_box, smoothing_factor)

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

    def save_or_upload_clip(self, clip, title, output_video_type, output_folder, s3_client, s3_bucket, user_id, project_id, debug=False):
        # Sanitize the title by replacing problematic characters
        safe_title = title.replace('/', '-').replace('\\', '-').replace(':', '-')
        
        # Create the filename
        filename = f"{user_id}_{project_id}_{safe_title}_{output_video_type}.mp4"
        local_path = os.path.join(output_folder, filename)
        
        # Ensure the output directory exists
        os.makedirs(output_folder, exist_ok=True)
        
        try:
            clip.write_videofile(local_path)
            if debug:
                return local_path, f"file://{local_path}"
            
            try:
                # Upload to S3
                s3_key = f"{user_id}/{project_id}/{filename}"
                s3_client.upload_file(local_path, s3_bucket, s3_key)
                
                # Generate presigned URL (expires in 30 days)
                presigned_url = s3_client.generate_presigned_url('get_object',
                    Params={
                        'Bucket': s3_bucket,
                        'Key': s3_key
                    },
                    ExpiresIn= 3600 * 24 *30  # 30 days in seconds
                )
                print(f"Presigned URL: {presigned_url}")
                # Clean up local file
                os.remove(local_path)
                
                return s3_key, presigned_url
            except Exception as e:
                print(f"Failed to upload to S3: {str(e)}")
                raise
        except Exception as e:
            print(f"Failed to write video file: {str(e)}")
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
            
        # Center the face horizontally
        face_center_x = x + (w / 2)
        new_x = face_center_x - (width / 2)
        
        # Ensure the crop stays within frame bounds while maintaining centering
        if new_x < 0:
            new_x = 0
        elif new_x + width > frame_width:
            new_x = frame_width - width
            
        # Calculate the y-position to place the face between 1/4 and 1/3 from the top
        face_position = max(min_face_position, min(max_face_position, h / height))
        new_y = max(0, y - (height * face_position - h) / 2)
        
        # Adjust if exceeding frame boundaries
        if new_y + height > frame_height:
            new_y = frame_height - height
            
        # Ensure we don't go out of bounds
        new_x = max(0, int(new_x))
        new_y = max(0, int(new_y))
        new_w = min(int(width), frame_width - new_x)
        new_h = min(int(height), frame_height - new_y)

        return new_x, new_y, new_w, new_h

    def is_significant_change(self, box1, box2, threshold=0.3):  # Increased default threshold
        x1, y1, w1, h1 = box1
        x2, y2, w2, h2 = box2
        
        # Calculate centers
        center1_x = x1 + w1/2
        center2_x = x2 + w2/2
        
        # Check horizontal center shift
        center_shift = abs(center1_x - center2_x) / w1
        y_shift = abs(y1 - y2) / h1
        size_change = abs(w1 - w2) / w1
        
        # Return true if any change is significant
        return (center_shift > threshold or
                y_shift > threshold or
                size_change > threshold)

    def smooth_bounding_box(self, old_box, new_box, smoothing_factor):
        x1, y1, w1, h1 = old_box
        x2, y2, w2, h2 = new_box
        
        # Calculate centers
        old_center_x = x1 + w1/2
        new_center_x = x2 + w2/2
        
        # Smooth the center position
        smoothed_center_x = old_center_x * smoothing_factor + new_center_x * (1 - smoothing_factor)
        
        # Calculate new x position based on smoothed center
        smoothed_w = int(w1 * smoothing_factor + w2 * (1 - smoothing_factor))
        smoothed_x = int(smoothed_center_x - smoothed_w/2)
        
        # Smooth other dimensions
        smoothed_y = int(y1 * smoothing_factor + y2 * (1 - smoothing_factor))
        smoothed_h = int(h1 * smoothing_factor + h2 * (1 - smoothing_factor))
        
        return (smoothed_x, smoothed_y, smoothed_w, smoothed_h)

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
            response = self.deepgram_client.listen.prerecorded.v("1").transcribe_file(payload, options, timeout=httpx.Timeout(300.0, connect=10.0))

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

    def calculate_total_estimate(self, video_duration, elapsed_time=0, progress=0, stage="", quality="720p"):
        """Calculate remaining time based on progress percentage and elapsed time"""
        # Standardize quality format and default to 720p if invalid
        quality = quality.replace('p', '') + 'p'
        if quality not in self.PROCESSING_ESTIMATE:
            quality = '720p'
        
        # Calculate initial total estimate based on quality
        initial_estimate = int(self.PROCESSING_ESTIMATE[quality]['base_time'] + 
                             (self.PROCESSING_ESTIMATE[quality]['per_minute'] * (video_duration / 60)))
        
        # If progress hasn't started, return initial estimate
        if progress <= 0:
            return initial_estimate
            
        # Handle early stages (0-30%)
        if progress < 30:
            # Reduce estimate proportionally based on progress
            reduction_factor = progress / 30  # Will be between 0 and 1
            time_to_reduce = initial_estimate * 0.25  # Reduce up to 25% of initial estimate
            return int(initial_estimate - (time_to_reduce * reduction_factor))
        
        # Handle generating stage (30-90%)
        if stage == "generating" and 30 <= progress <= 90:
            # Calculate rate of progress (percentage per second)
            rate_of_progress = progress / elapsed_time if elapsed_time > 0 else 0
            
            if rate_of_progress > 0:
                # Estimate remaining time based on current rate
                remaining_percentage = 100 - progress
                remaining_estimate = remaining_percentage / rate_of_progress
                
                # Add a small buffer (10% of the estimate)
                remaining_estimate *= 1.1
                
                return int(remaining_estimate)
        
        # Return the initial estimate for other stages/progress
        return initial_estimate

    def process_video(self, video_link, project_id=None, clerk_user_id=None, 
                     user_email=None, video_title=None, processing_timeframe=None, 
                     video_quality="720p", video_type="portrait", video_duration=None, start_time=None, end_time=None, 
                     clip_length=None, keywords="", caption_style="elon", add_watermark=False,
                     update_status_callback=None, s3_client=None, s3_bucket=None, project_type="auto", clips=None):
        try:
            # Standardize clip format at the beginning of processing
            if clips and isinstance(clips, str):
                clips = json.loads(clips)
            
            self.process_start_time = time.time()
            
            def update_status_with_estimate(stage, progress):
                if update_status_callback:
                    # Calculate video duration based on standardized clip format
                    # video_duration = (end_time - start_time if project_type == "auto" 
                    #                 else sum(float(clip.get('duration', float(clip.get('end', 0)) - float(clip.get('start', 0))))
                    #                       for clip in (clips or [])))
                    
                    elapsed_time = time.time() - self.process_start_time
                    remaining_estimate = self.calculate_total_estimate(
                        video_duration, 
                        elapsed_time, 
                        progress, 
                        stage,
                        video_quality
                    )
                    
                    print(f"Stage: {stage}, Progress: {progress}%, Remaining: {remaining_estimate}s")
                    update_status_callback(
                        clerk_user_id, project_id, "processing", stage, progress,
                        video_title, processing_timeframe, remaining_estimate
                    )

            # Create safe directories
            os.makedirs('./downloads', exist_ok=True)
            os.makedirs('./subtitled_clips', exist_ok=True)

            if update_status_callback:
                update_status_with_estimate("downloading", 1)

            try:
                # Download and process video based on project type
                if project_type == "auto":
                    # Auto clip processing
                    og_video_path, downloaded_video_path, video_title = self.download_video(
                        video_link, "./downloads", video_quality, 
                        start_time, end_time, project_type, update_status_with_estimate=update_status_with_estimate
                    )
                    downloaded_audio_path = self.extract_audio(downloaded_video_path)
                    
                    if update_status_callback:
                        update_status_with_estimate("transcribing", 20)
                    
                    transcript, word_timings = self.transcribe_audio(downloaded_audio_path)
                    
                    if update_status_callback:
                        update_status_with_estimate("analyzing", 25)
                    
                    interesting_data = self.get_interesting_segments(transcript, word_timings, clip_length, keywords)
                    if not interesting_data:
                        print("No interesting segments found in the video")
                        if update_status_callback:
                            update_status_callback(clerk_user_id, project_id, "completed", 
                                                "No interesting segments found", 0,
                                                video_title, processing_timeframe)
                        return []
                    
                    segments_to_process = interesting_data
                    
                else:  # manual clip processing
                    downloaded_video_path, downloaded_video_paths, video_title = self.download_video(
                        video_link, "./downloads", video_quality, 
                        None, None, project_type, clips, update_status_with_estimate=update_status_with_estimate
                    )
                    
                    if update_status_callback:
                        update_status_with_estimate("transcribing", 20)
                   
                        
                    segments_to_process = self.process_manual_clips(
                        clips, 
                        downloaded_video_paths, 
                        update_status_callback,
                        clerk_user_id,
                        project_id,
                        video_title,
                        processing_timeframe
                    )

                # Process segments
                if update_status_callback:
                    update_status_with_estimate("generating", 30)
                
                total_segments = len(segments_to_process)
                print(f"Processing {total_segments} segments")

                def progress_callback(i):
                    if update_status_callback:
                        progress = 30 + int((i / total_segments) * 50)
                        print(f"Processing segment {i}/{total_segments} - Progress: {progress}%")
                        update_status_with_estimate("generating", progress)

              
                # Process all segments from the original video at once
                self.crop_and_add_subtitles(
                    downloaded_video_path,
                    segments_to_process,
                    output_video_type=video_type,
                    caption_style=caption_style,
                    output_folder='./subtitled_clips',
                    s3_client=s3_client,
                    s3_bucket=s3_bucket,
                    user_id=clerk_user_id,
                    project_id=project_id,
                    debug=False,
                    progress_callback=progress_callback,
                    add_watermark=add_watermark,
                    project_type=project_type
                )

                # Cleanup and completion
                if update_status_callback:
                    update_status_with_estimate("uploading", 95)

                self.cleanup_files(video_title)
                self.send_completion_email(user_email, video_title, project_id)

                if update_status_callback:
                    update_status_callback(clerk_user_id, project_id, "completed", "completed", 100,
                                        video_title, processing_timeframe)

            except Exception as e:
                print(f"Processing failed: {str(e)}")
                raise

        except Exception as e:
            print(f"Video processing failed: {str(e)}")
            if update_status_callback:
                update_status_callback(clerk_user_id, project_id, "failed", "failed", 0,
                                    video_title, processing_timeframe)
            raise e

    def cleanup_files(self, title):
        """Clean up downloaded files safely"""
        video_title_folder = os.path.join("./downloads", title)
        try:
            if os.path.exists(video_title_folder):
                for file in os.listdir(video_title_folder):
                    file_path = os.path.join(video_title_folder, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                os.rmdir(video_title_folder)
        except Exception as e:
            print(f"Cleanup warning: {str(e)}")

    def is_minor_movement(self, box1, box2, minor_threshold=0.30):
        """Check if the movement is too small to warrant adjustment"""
        x1, y1, w1, h1 = box1
        x2, y2, w2, h2 = box2
        
        # Calculate centers
        center1_x = x1 + w1/2
        center2_x = x2 + w2/2
        
        # Check if movement is minor
        center_shift = abs(center1_x - center2_x) / w1
        height_change = abs(h1 - h2) / h1
        y_shift = abs(y1 - y2) / h1
        
        return (center_shift < minor_threshold and 
                height_change < minor_threshold and 
                y_shift < minor_threshold)

    def send_completion_email(self, user_email, video_title, project_id):
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
            
    def get_metrics(self, transcript_text):
        """Get engagement metrics for a clip using Claude"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                prompt = f"""You are an expert content creator. Analyze this transcript and provide metrics.
                
                Transcript:
                {transcript_text}
                
                Task:
                Create engaging metrics for this clip including:
                - A catchy, relevant title
                - The transcript with proper punctuation and capitalization
                - Score (60-100) based on engagement and quality
                - Hook grade (A+, A, A-, B+, B)
                - Flow grade (A+, A, A-, B+, B)
                - Engagement grade (A+, A, A-, B+, B)
                - Trend relevance grade (A+, A, A-, B+, B)
                - Relevant hashtags for the clip (4-5)
                
                Use the process_metrics tool to return your analysis.
                """

                with self._anthropic_lock:
                    response = self.anthropic_client.messages.create(
                        model="claude-3-sonnet-20240229",
                        max_tokens=1000,
                        messages=[{"role": "user", "content": prompt}],
                        tools=[{
                            "name": "process_metrics",
                            "description": "Process and return metrics for the clip",
                            "input_schema": {
                                "type": "object",
                                "properties": {
                                    "title": {"type": "string", "description": "Catchy, relevant title"},
                                    "transcript": {"type": "string", "description": "Transcript with proper punctuation, capitalization and periods."},
                                    "score": {"type": "integer", "minimum": 60, "maximum": 100},
                                    "hook": {"type": "string", "enum": ["A+", "A", "A-", "B+", "B"]},
                                    "flow": {"type": "string", "enum": ["A+", "A", "A-", "B+", "B"]},
                                    "engagement": {"type": "string", "enum": ["A+", "A", "A-", "B+", "B"]},
                                    "trend": {"type": "string", "enum": ["A+", "A", "A-", "B+", "B"]},
                                    "hashtags": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "description": "4-5 relevant hashtags for the clip",
                                        "minItems": 4,
                                        "maxItems": 5
                                    }
                                },
                                "required": ["title", "text", "transcript", "score", "hook", "flow", "engagement", "trend", "hashtags"]
                            }
                        }],
                        tool_choice={"type": "tool", "name": "process_metrics"}
                    )
                    
                    result = response.content[0].input
                    # Validate the required fields are present
                    required_fields = ["title", "transcript", "score", "hook", "flow", "engagement", "trend"]
                    if not all(field in result for field in required_fields):
                        raise ValueError("Missing required fields in Claude response")
                    
                    return result
                    
            except Exception as e:
                if attempt < max_retries - 1:  # If we have retries left
                    print(f"Metrics attempt {attempt + 1} failed: {str(e)}")
                    print(f"Retrying metrics... ({attempt + 1}/{max_retries})")
                    time.sleep(2)  # Add a small delay between retries
                    continue
                else:
                    print(f"All {max_retries} metrics attempts failed. Last error: {str(e)}")
                    raise  # Re-raise the last exception if all retries failed

    def process_manual_clips(self, clips, downloaded_video_paths, update_status_callback=None, clerk_user_id=None, project_id=None, video_title=None, processing_timeframe=None):
        segments_to_process = []
        
        for i, (clip_path, clip_data) in enumerate(zip(downloaded_video_paths, clips)):
            # Get audio and transcript
            audio_path = self.extract_audio(clip_path)
            transcript, word_timings = self.transcribe_audio(audio_path)
            
            # Get metrics from Claude
            metrics = self.get_metrics(transcript)
            
            # Create segment data matching auto format
            segment = {
                'title': metrics['title'],
                'start': clip_data['start'],
                'end': clip_data['end'],
                'text': metrics['transcript'].lower(),
                'transcript': metrics['transcript'],    
                'video_path': clip_path,
                'word_timings': word_timings,
                'score': metrics['score'],
                'hook': metrics['hook'],
                'flow': metrics['flow'],
                'engagement': metrics['engagement'],
                'trend': metrics['trend'],
                'hashtags': metrics['hashtags'],
            }
            
            segments_to_process.append(segment)
            
            if update_status_callback:
                progress = 10 + int((i + 1) / len(clips) * 10)
                update_status_callback(
                    clerk_user_id=clerk_user_id,
                    project_id=project_id,
                    status="processing",
                    stage="transcribing",
                    progress=progress,
                    title=video_title,
                    processing_timeframe=processing_timeframe
                )
        
        return segments_to_process

if __name__ == "__main__":
   
    s3_client = boto3.client('s3',
                    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
                    region_name=os.environ.get('AWS_REGION'))
    s3_bucket = os.environ.get('S3_BUCKET_NAME')
    
    video_path = "./downloads"

    # # Initialize VideoProcessor
    processor = VideoProcessor()

    # Ensure directories exist
    os.makedirs(video_path, exist_ok=True)

    youtube_url = input("Enter youtube video url: ")
    video_quality = "low"
   

    # Download video and extract audio
    downloaded_video_path, downloaded_audio_path, _ = processor.download_video(youtube_url, video_path, video_quality, 0, 1000)

    # downloaded_video_path = "/Users/parassavnani/Desktop/dev/Lunaris/video_processing/downloads/The Hidden Art Of Reinventing Yourself - Matthew McConaughey (4K)/The Hidden Art Of Reinventing Yourself - Matthew McConaughey (4K)_cut.webm"
    # downloaded_audio_path = "/Users/parassavnani/Desktop/dev/Lunaris/video_processing/downloads/The Hidden Art Of Reinventing Yourself - Matthew McConaughey (4K)/The Hidden Art Of Reinventing Yourself - Matthew McConaughey (4K)_cut.mp3"
 
    # Transcribe audio
    # transcript, word_timings = processor.transcribe_audio(downloaded_audio_path)

    # # Get interesting segments
    # clip_length = {"min": 0, "max": 60}
    # interesting_data = processor.get_interesting_segments(transcript, word_timings, clip_length)

    # with open('interesting_segments.json', 'w') as json_file:
    #     json.dump(interesting_data, json_file, indent=4)

    
    # # DEBUG: load from file
    # with open("interesting_segments.json", 'r') as f:
    #     interesting_data = json.load(f)

    # output_video_type = "portrait" # 'landscape'
    caption_style = "iman"

    # # Crop video to portrait with faces
    # # processor.crop_and_add_subtitles(downloaded_video_path, interesting_data, output_video_type, s3_client=s3_client, s3_bucket=s3_bucket)
    processor.crop_and_add_subtitles(downloaded_video_path, interesting_data, output_video_type, caption_style=caption_style, debug=True) 