from flask import Flask, request, jsonify, send_file, url_for, send_from_directory
from flask_cors import CORS
from threading import Thread
import time
import random
import os
import whisper
import json
import mediapipe as mp
import logging
from main import download_video, get_interesting_segments, crop_to_portrait_with_faces, add_subtitles

app = Flask(__name__)
CORS(app)

# Configure logging
# logging.basicConfig(level=logging.DEBUG)

processing_videos = {}

# Initialize Whisper
model = whisper.load_model("base")

# Initialize Mediapipe face detection
mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)

# Video path
video_path = "./downloads"
output_path = "./subtitled_portrait_clips"

# Configure Flask server name, application root, and preferred URL scheme
app.config.update(
    SERVER_NAME='127.0.0.1:5001',
    APPLICATION_ROOT='/',
    PREFERRED_URL_SCHEME='http'
)

def process_video_thread(video_link, video_id, quality):
    with app.app_context():
      
        # time.sleep(10)
        downloaded_video_path, downloaded_audio_path, video_name = download_video(video_link, video_path, quality)
        print("Transcribing audio...")
        result = model.transcribe(downloaded_audio_path, word_timestamps=True)
        segments = result["segments"]
        word_timings = []
        transcript = ''
        for segment in segments:
            words = segment['words']
            for word in words:
                word_timings.append({
                    'start': word['start'],
                    'end': word['end'],
                    'word': word['word'].strip().lower()
                })
                transcript += word['word']
    
        transcript = transcript.strip()
        with open("transcript.txt", 'w') as file:
            file.write(transcript)
        
        print("Audio transcribed successfully!")
        
        interesting_data = get_interesting_segments(transcript, word_timings)
        
        with open("interesting_segments.json", 'w') as f:
            json.dump(interesting_data, f)

        crop_to_portrait_with_faces(downloaded_video_path, interesting_data, face_detection)
        add_subtitles(interesting_data)

        # with open("interesting_segments.json", 'r') as f:
        #     interesting_data = json.load(f)

        clips = []
        grades = ["A", "A+", "A-", "B", "B+"]
        for segment in interesting_data:
            clip_filename = segment["title"] + ".mp4"
            clip_path = os.path.join(output_path, clip_filename)
            clips.append({
                "video_url": url_for('send_clip', filename=clip_filename, _external=True),
                "metadata": {
                    "title": segment["title"],
                    "score": random.randint(70, 100),
                    "hook": random.choice(grades),
                    "flow": random.choice(grades),
                    "engagement": random.choice(grades),
                    "trend": random.choice(grades),
                    "description": segment["text"]
                }
            })

        processing_videos[video_id]['status'] = 'completed'
        processing_videos[video_id]['clips'] = clips
        app.logger.info(f'Successfully processed video: {video_link}')


@app.route('/api/process-video', methods=['POST'])
def process_video():
    data = request.get_json()
    if 'link' not in data:
        app.logger.error('No video link provided in the request.')
        return jsonify({'error': 'No video link provided'}), 400

    video_link = data['link']
    
    print(data['clipLength'],
        # data['addCaption'],
        data['genre'],
        data['processingTimeframe'],
        data['keywords'])
    
    # time.sleep(20)
    app.logger.info(f'Received video link: {video_link}')
    
    video_id = str(len(processing_videos) + 1)
    processing_videos[video_id] = {'status': 'processing'}

    thread = Thread(target=process_video_thread, args=(video_link, video_id, data['videoQuality']))
    thread.start()
    
    return jsonify({'message': 'Video processing started', 'video_id': video_id}), 202

@app.route('/api/video-status/<video_id>', methods=['GET'])
def video_status(video_id):
    if video_id not in processing_videos:
        return jsonify({'error': 'Invalid video ID'}), 404

    return jsonify(processing_videos[video_id])

@app.route('/api/get-video/<video_id>', methods=['GET'])
def get_video(video_id):
    if video_id not in processing_videos or processing_videos[video_id]['status'] != 'completed':
        return jsonify({'error': 'Video not available'}), 404

    return jsonify({'clips': processing_videos[video_id]['clips']})

@app.route('/subtitled_portrait_clips/<filename>', methods=['GET'])
def send_clip(filename):
    return send_from_directory('subtitled_portrait_clips', filename)


if __name__ == '__main__':
    if not os.path.exists('./downloads'):
        os.makedirs('./downloads')
    if not os.path.exists(output_path):
        os.makedirs(output_path)
    
    app.run(debug=False, port=5001)
