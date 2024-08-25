from flask import Flask, request, jsonify, send_file, url_for, send_from_directory
from flask_cors import CORS
from threading import Thread
import random
import os
import json
import logging
from main import VideoProcessor

app = Flask(__name__)
CORS(app)

# Configure logging
# logging.basicConfig(level=logging.DEBUG)

processing_videos = {}

# Video path
video_path = "./downloads"
output_path = "./subtitled_portrait_clips"

# Configure Flask server name, application root, and preferred URL scheme
app.config.update(
    SERVER_NAME='127.0.0.1:5001',
    APPLICATION_ROOT='/',
    PREFERRED_URL_SCHEME='http'
)

# Initialize VideoProcessor
video_processor = VideoProcessor()

def process_video_thread(video_link, video_id, video_quality):
    with app.app_context():
        # Download video
        downloaded_video_path, downloaded_audio_path = video_processor.download_video(video_link, video_path, video_quality)
        
        # Transcribe audio
        transcript, word_timings = video_processor.transcribe_audio(downloaded_audio_path)
        
        # Get interesting segments
        interesting_data = video_processor.get_interesting_segments(transcript, word_timings)
        
        # Crop and add subtitles
        video_processor.crop_and_add_subtitles(downloaded_video_path, interesting_data, output_path)

        clips = []
        grades = ["A", "A+", "A-", "B", "B+"]
        for segment in interesting_data:
            clip_filename = segment["title"] + ".mp4"
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
        data['genre'],
        data['processingTimeframe'],
        data['keywords'])
    
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
    
    app.run(host='0.0.0.0', debug=False, port=5001)