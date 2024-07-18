import moviepy.editor as mp_edit
import mediapipe as mp
import cv2

video_path = "/Users/parassavnani/Desktop/dev/Lunaris/backend/mike_chris.mp4"

mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)

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

def adjust_bounding_box(x, y, w, h, frame_height, frame_width, scale=2, square=False):
    
    if square:
        side_length = max(w, h)
        new_w = new_h = int(side_length * scale)
    else: # rectangle case
        new_w = int(w * scale)
        new_h = int(h * scale) #* 2)  # Remember to change
    
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

def is_significant_change(box1, box2, threshold=0.03):
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2
    return (abs(x1 - x2) > threshold * w1 or
            abs(y1 - y2) > threshold * h1 or
            abs(w1 - w2) > threshold * w1 or
            abs(h1 - h2) > threshold * h1)



def crop_to_portrait_with_faces():
   
    video = mp_edit.VideoFileClip(video_path)
    video_duration = video.duration
    
    prev_box1 = None
    prev_box2 = None
        
    def process_frame(get_frame, t):
        j = int(t * 1000)
        nonlocal prev_box1, prev_box2
        frame = get_frame(t)
        frame = frame.copy() if frame.flags['WRITEABLE'] == False else frame
        faces = detect_faces_and_draw_boxes(frame, face_detection)
        num_faces = len(faces)
        frame_height, frame_width, _ = frame.shape
        target_width = 1080
        target_height = 1920
        
        if num_faces == 1:
            face = faces[0]
            (x, y, w, h) = face
            new_box = adjust_bounding_box(x, y, w, h, frame_height, frame_width, scale=1.5, square=False)
            if prev_box1 is None or is_significant_change(prev_box1, new_box):
                prev_box1 = new_box
            x, y, w, h = prev_box1
            frame = cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 3)
        else:
            x, y, w, h = prev_box1
            frame = cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 3)

        return frame
        
    cropped_clip = video.fl(process_frame)
    cropped_clip.write_videofile("output.mp4", codec='libx264')
    print("video cropped successfully!")


crop_to_portrait_with_faces()