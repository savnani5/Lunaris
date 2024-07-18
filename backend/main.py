## Checkout make viral clips from podcast -> Automate that!
# If no faces -> detect a human body and use the bounding box of the human body
# Sliding change of frames -> smooth moving bbox


import moviepy.editor as mp_edit
import mediapipe as mp
import whisper
import os
import json
from openai import OpenAI
import cv2
from moviepy.editor import TextClip, CompositeVideoClip
from moviepy.editor import VideoFileClip, AudioFileClip
from pytube import YouTube
import re
from pytube.exceptions import RegexMatchError
import pytube.cipher

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]


def patched_get_throttling_function_name(js: str) -> str:
    """Extract the name of the function that computes the throttling parameter.

    :param str js:
        The contents of the base.js asset file.
    :rtype: str
    :returns:
        The name of the function used to compute the throttling parameter.
    """
    function_patterns = [
        r'a\.[a-zA-Z]\s*&&\s*\([a-z]\s*=\s*a\.get\("n"\)\)\s*&&.*?\|\|\s*([a-z]+)',
        r'\([a-z]\s*=\s*([a-zA-Z0-9$]+)(\[\d+\])\([a-z]\)',
    ]
    for pattern in function_patterns:
        regex = re.compile(pattern)
        function_match = regex.search(js)
        if function_match:
            if len(function_match.groups()) == 1:
                return function_match.group(1)
            idx = function_match.group(2)
            if idx:
                idx = idx.strip("[]")
                array = re.search(
                    r'var {nfunc}\s*=\s*(\[.+?\]);'.format(
                        nfunc=re.escape(function_match.group(1))),
                    js
                )
                if array:
                    array = array.group(1).strip("[]").split(",")
                    array = [x.strip() for x in array]
                    return array[int(idx)]

    raise RegexMatchError(
        caller="get_throttling_function_name", pattern="multiple"
    )

# Apply the patch
pytube.cipher.get_throttling_function_name = patched_get_throttling_function_name


def download_video(url, path, quality='high'):
    yt = YouTube(url)
    try:
        if quality == 'high':
            video_stream = yt.streams.filter(adaptive=True, file_extension='mp4', res="1080p").first()
        elif quality == 'medium':
            video_stream = yt.streams.filter(adaptive=True, file_extension='mp4', res="720p").first()
        elif quality == 'low':
            video_stream = yt.streams.filter(adaptive=True, file_extension='mp4', res="480p").first()
        else:
            video_stream = yt.streams.filter(adaptive=True, file_extension='mp4').order_by('resolution').first()
    except Exception as e:
        print(e)

    if video_stream is None:
        video_stream = yt.streams.filter(adaptive=True, file_extension='mp4').order_by('resolution').desc().first()
    
    audio_stream = yt.streams.filter(only_audio=True).first()
    
    audio_stream = yt.streams.filter(only_audio=True).first()
    
    # Download the video and audio streams
    video_file = video_stream.download(output_path=path, filename_prefix="video_")
    audio_file = audio_stream.download(output_path=path, filename_prefix="audio_")

    # Merge video and audio using moviepy
    video_clip = VideoFileClip(video_file)
    audio_clip = AudioFileClip(audio_file)
    
    final_clip = video_clip.set_audio(audio_clip)
    final_video_path = os.path.join(path, yt.title + ".mp4")
    final_clip.write_videofile(final_video_path, codec='libx264', audio_codec='aac')

    # Clean up temporary video file
    os.remove(video_file)

    print(f"{yt.title} downloaded successfully!")

    return final_video_path, audio_file, yt.title

def extract_audio(video_path, audio_path):
    video = mp_edit.VideoFileClip(video_path)
    video.audio.write_audiofile(audio_path)
    print("audio extracted successfully!")


# Function to clip video
def clip_video(video_path, segments, output_folder='./clips'):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    video = mp_edit.VideoFileClip(video_path)
    
    for i, segment in enumerate(segments):
        start = segment['start']
        end = segment['end']
        clip = video.subclip(start, end)
        clip.write_videofile(f"{output_folder}/clip_{i+1}.mp4")
    

def get_interesting_segments(transcript_text, word_timings, output_file='interesting_segments.json'):
    # Generate prompt for OpenAI
    prompt = f"""
    You are a content creator. Here is the transcript from a youtube video:
    {transcript_text}
    Combine these words into some chunks of few sentences that would make interesting short form content to hook the audience. You can choose cosecutive senctences arbitrarily and each chunk should be complete, i.e don't cut out mid sentence. Aim to keep each chunk above 100 words. Provide a relevant title for each combination. The output should be in JSON format like this:
    [
    {{
        "title": "Title 1",
        "text": "Transcript chunk 1"
    }},
    {{
        "title": "Title 2",
        "text": "Transcript chunk 2"
    }},
    ...
    ]
    Do not make things up, only use the given words to make chunks.
    Do not return aything else, apart from the JSON.
    """
    client = OpenAI()
    chat_completion = client.chat.completions.create(
        messages=[
        {
            "role": "user",
            "content": prompt,
        }
        ],
        model= "gpt-4o")
        #"gpt-3.5-turbo")

    segment_json = chat_completion.choices[0].message.content.strip()
    print(segment_json)

    def clean_llm_output(llm_output):
        # Remove triple backticks and language specifier if present
        llm_output = llm_output.strip().strip('```')
        if llm_output.startswith('json'):
            llm_output = llm_output[4:].strip()
        return llm_output

    # Parse the JSON output
    segment_json = clean_llm_output(segment_json)
    # with open('segments.json', 'w') as f:
    #     f.write(segment_json)
    
    segments = json.loads(segment_json)

    # Build the combined segment data
    segment_data = []

    for segment in segments:
        title = segment['title']
        text = segment['text']
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
            'word_timings': word_timings_in_segment
        })
    
    # Write the combined data to a JSON file
    with open(output_file, 'w') as json_file:
        json.dump(segment_data, json_file, indent=4)

    print("Interesting segments extracted and saved to", output_file)
    return segment_data


def detect_faces_and_draw_boxes(frame, face_detection):
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_detection.process(rgb_frame)
    if results.detections:
        face_bboxes = []
        for detection in results.detections:
            bbox = detection.location_data.relative_bounding_box
            x, y, w, h = bbox.xmin, bbox.ymin, bbox.width, bbox.height
            x, y, w, h = int(x * frame.shape[1]), int(y * frame.shape[0]), int(w * frame.shape[1]), int(h * frame.shape[0])
            face_bboxes.append((x, y, w, h))
        return face_bboxes
    return []


# Function to crop the video to a portrait aspect ratio with two faces
def crop_to_portrait_with_faces(video_path, segments, face_detection, output_folder='./portrait_clips'):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    video = mp_edit.VideoFileClip(video_path)
    video_duration = video.duration
    
    prev_box1 = None
    prev_box2 = None

    for i, segment in enumerate(segments):
        start = segment['start']
        end = segment['end']
        title = segment['title']
        if end > video_duration:
            end = video_duration
        if start >= end:
            continue
        clip = video.subclip(start, end)
        
        # img_path = '/Users/parassavnani/Desktop/dev/procut/imgs'
        def process_frame(get_frame, t):
            j = int(t * 1000)
            nonlocal prev_box1, prev_box2
            frame = get_frame(t)
            faces = detect_faces_and_draw_boxes(frame, face_detection)
            num_faces = len(faces)
            frame_height, frame_width, _ = frame.shape
            target_width = 1080
            target_height = 1920
            
            if num_faces == 1:
                face = faces[0]
                (x, y, w, h) = face
                new_box = adjust_bounding_box(x, y, w, h, frame_height, frame_width, scale=2, square=False)
                if prev_box1 is None or is_significant_change(prev_box1, new_box):
                    prev_box1 = new_box
                x, y, w, h = prev_box1
                face_crop = frame[y:y+h, x:x+w]
                portrait_frame = cv2.resize(face_crop, (target_width, target_height))
               
            # elif num_faces >= 2:
            #     face1 = faces[0]
            #     face2 = faces[1]
                
            #     (x1, y1, w1, h1) = face1
            #     (x2, y2, w2, h2) = face2

            #     new_box1 = adjust_bounding_box(x1, y1, w1, h1, frame_height, frame_width, scale=2, square=True)
            #     new_box2 = adjust_bounding_box(x2, y2, w2, h2, frame_height, frame_width, scale=2, square=True)

            #     if prev_box1 is None or is_significant_change(prev_box1, new_box1):
            #         prev_box1 = new_box1
            #     if prev_box2 is None or is_significant_change(prev_box2, new_box2):
            #         prev_box2 = new_box2

            #     x1, y1, w1, h1 = prev_box1
            #     x2, y2, w2, h2 = prev_box2

            #     face1_crop = frame[y1:y1+h1, x1:x1+w1]
            #     face2_crop = frame[y2:y2+h2, x2:x2+w2]

            #     face1_crop = cv2.resize(face1_crop, (target_width, target_height // 2))
            #     face2_crop = cv2.resize(face2_crop, (target_width, target_height // 2))

            #     portrait_frame = np.zeros((target_height, target_width, 3), dtype=np.uint8)

            #     portrait_frame[0:face1_crop.shape[0], :] = face1_crop
            #     portrait_frame[target_height // 2:target_height, :] = face2_crop

            else:
                # TODO: If no faces -> detect a human body and use the bounding box of the human body

                # If no faces are detected, use the previous bounding boxes if they exist
                if prev_box1 is not None:
                    x, y, w, h = prev_box1
                    face_crop = frame[y:y+h, x:x+w]
                    portrait_frame = cv2.resize(face_crop, (target_width, target_height))
                    
                else:
                    # Default to center crop if no previous bounding box exists
                    center_x, center_y = frame_width // 2, frame_height // 2
                    default_w, default_h = target_width, target_height
                    default_x = max(0, center_x - default_w // 2)
                    default_y = max(0, center_y - default_h // 2)
                    default_crop = frame[default_y:default_y+default_h, default_x:default_x+default_w]
                    portrait_frame = cv2.resize(default_crop, (target_width, target_height))
                
            # cv2.imshow("annotated_frame", annotated_frame)
            # cv2.imshow("portrait_frame", portrait_frame)
            # cv2.imwrite(f"{img_path}/portrait_{j}.jpg", portrait_frame)
            # cv2.waitKey(0)
            # cv2.destroyAllWindows()
            return portrait_frame
        
        cropped_clip = clip.fl(process_frame)
        cropped_clip.write_videofile(f"{output_folder}/{title}.mp4", codec='libx264')
        print("video cropped successfully!")

def adjust_bounding_box(x, y, w, h, frame_height, frame_width, scale=2, square=False):
    
    if square:
        side_length = max(w, h)
        new_w = new_h = int(side_length * scale)
    else: # rectangle case
        new_w = int(w * scale)
        new_h = int(h * scale * 2)
    
    new_x = max(0, x - (new_w - w) // 2)
    new_y = max(0, y - (new_h - h) // 2)
    if new_x == 0:
        new_w = new_w - ((new_w - w)//2 - x)

    if new_y == 0:
        new_h = new_h - ((new_h - h)//2 - y)
    
    if new_x + new_w > frame_width:
        new_w = frame_width - new_x
    
    if new_y + new_h > frame_height:
        new_h = frame_height - new_y
    return new_x, new_y, new_w, new_h

def is_significant_change(box1, box2, threshold=0.2):
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2
    return (abs(x1 - x2) > threshold * w1 or
            abs(y1 - y2) > threshold * h1 or
            abs(w1 - w2) > threshold * w1 or
            abs(h1 - h2) > threshold * h1)


def add_subtitles(segments, num_faces=1, portrait_clips_folder='./portrait_clips', output_folder='./subtitled_portrait_clips'):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    for i, segment in enumerate(segments):
        text = segment['text']
        title = segment['title']
        segment_start = segment['start']
        word_timings = segment['word_timings']

        portrait_clip_path = os.path.join(portrait_clips_folder, f'{title}.mp4')
        if not os.path.exists(portrait_clip_path):
            print(f"Portrait clip {portrait_clip_path} not found.")
            continue
        
        video = mp_edit.VideoFileClip(portrait_clip_path)

        def make_textclip(txt, start_time, end_time, color='white', position=('center', 'center')):
            txt_clip = TextClip(txt.upper(), fontsize=100, color=color, font='Arial-Bold', bg_color='black')
            txt_clip = txt_clip.set_position(position).set_start(start_time).set_duration(end_time - start_time)
            return txt_clip

        def group_words(word_timings):
            grouped_words = []
            current_phrase = []
            current_start = word_timings[0]['start']
            for i, wt in enumerate(word_timings):
                current_phrase.append(wt['word'])
                if i < len(word_timings) - 1:
                    next_word_start = word_timings[i + 1]['start']
                    if next_word_start - wt['end'] > 0.5:  # Threshold to start a new phrase (0.5 seconds gap)
                        grouped_words.append({
                            'phrase': ' '.join(current_phrase),
                            'start': current_start,
                            'end': wt['end']
                        })
                        current_phrase = []
                        current_start = next_word_start
            if current_phrase:
                grouped_words.append({
                    'phrase': ' '.join(current_phrase),
                    'start': current_start,
                    'end': word_timings[-1]['end']
                })
            return grouped_words

        def annotate(clip, word_timings):
            if num_faces == 1:
                position = ('center', video.h * 0.75)  # 75% from top
            else:
                position = ('center', video.h * 0.5)  # 50% from top
            txt_clips = [make_textclip(wt['word'], wt['start'] - segment_start, wt['end'] - segment_start, color='yellow', position=position)
                         for wt in word_timings]
            
            result = CompositeVideoClip([clip] + txt_clips)
            return result

        grouped_word_timings = group_words(word_timings)
        annotated_segment = annotate(video, grouped_word_timings)
        annotated_segment.write_videofile(f"{output_folder}/{title}.mp4", codec='libx264')
        print("subtitles added successfully!")



if __name__=="__main__":
    # wp = "/Users/parassavnani/Desktop/dev/lunaris/backend/"
    video_path = "./raw_videos"
    audio_path = "./raw_audio"

    # Ensure directories exist
    os.makedirs(video_path, exist_ok=True)
    os.makedirs(audio_path, exist_ok=True)

    youtube_url = input("Enter youtube video url: ")
    video_quality = input("Enter video quality (high, medium, low): ")

    downloaded_video_path, downloaded_audio_path, video_name = download_video(youtube_url, video_path, video_quality)

    # Initialize whisper
    model = whisper.load_model("base")
    print("Transcribing audio...")
    result = model.transcribe(downloaded_audio_path, word_timestamps=True)
    # print(result["text"])
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
    
    print("audio transcribed successfully!")
    # # print("--"*50)
    interesting_data = get_interesting_segments(transcript, word_timings)
    
    # if not returned
    with open("interesting_segments.json", 'r') as f:
        interesting_data = json.load(f)

    # print(interesting_data)
    
    # Initialize Mediapipe face detection
    mp_face_detection = mp.solutions.face_detection
    face_detection = mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)

    crop_to_portrait_with_faces(downloaded_video_path, interesting_data)
    add_subtitles(interesting_data)
   