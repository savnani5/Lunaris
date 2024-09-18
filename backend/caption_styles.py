from abc import ABC, abstractmethod
from moviepy.editor import TextClip, CompositeVideoClip
import random

class CaptionStyle(ABC):
    @abstractmethod
    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        pass

class ElonStyle(CaptionStyle):
    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        def make_textclip(txt, start_time, end_time, color='white', position=('center', 'center'), highlight=False):
            if not txt:  # Check if the text is empty or None
                return None
            
            fontsize = 80 if output_video_type == 'portrait' else 50
            stroke_width = 4
            
            if highlight:
                color = random.choice(['rgb(255, 255, 0)', 'rgb(0, 200, 0)'])

            txt_clip = TextClip(txt.upper(), fontsize=fontsize, font='Arial-Black', color=color, 
                                stroke_color='black', stroke_width=stroke_width, method='label', kerning=-3)
            
            txt_clip = txt_clip.set_position(position).set_start(start_time).set_duration(end_time - start_time)
            return txt_clip

        def chunk_word_timings(word_timings, max_chars):
            chunked_timings = []
            current_chunk = []
            current_chars = 0
            
            for word_timing in word_timings:
                word = word_timing['word']
                if current_chars + len(word) > max_chars and current_chunk:
                    start_time = current_chunk[0]['start']
                    end_time = current_chunk[-1]['end']
                    text = ' '.join(wt['word'] for wt in current_chunk)
                    chunked_timings.append({
                        'start': start_time,
                        'end': end_time,
                        'word': text,
                        'words': current_chunk
                    })
                    current_chunk = []
                    current_chars = 0
                
                current_chunk.append(word_timing)
                current_chars += len(word) + 1 
            
            if current_chunk:
                start_time = current_chunk[0]['start']
                end_time = current_chunk[-1]['end']
                text = ' '.join(wt['word'] for wt in current_chunk)
                chunked_timings.append({
                    'start': start_time,
                    'end': end_time,
                    'word': text,
                    'words': current_chunk
                })
            
            return chunked_timings

        max_chars = 30 if output_video_type == 'landscape' else 20  # Reduced from 40 to 20 for portrait
        chunked_timings = chunk_word_timings(word_timings, max_chars)
        
        txt_clips = []
        for chunk in chunked_timings:
            if output_video_type == 'landscape':
                position = ('center', processed_clip.h * 0.85)
                txt_clip = make_textclip(chunk['word'], chunk['start'] - start_time, chunk['end'] - start_time, position=position)
                if txt_clip:
                    txt_clips.append(txt_clip)
            else:  # portrait
                words = chunk['words']
                if len(words) == 1:
                    # Handle single word case
                    text = words[0]['word']
                    position = ('center', processed_clip.h * 0.85)
                    txt_clip = make_textclip(text, chunk['start'] - start_time, chunk['end'] - start_time, position=position)
                    if txt_clip:
                        txt_clips.append(txt_clip)
                    
                    # Add highlighted word
                    highlight_clip = make_textclip(text, words[0]['start'] - start_time, words[0]['end'] - start_time, position=position, highlight=True)
                    if highlight_clip:
                        txt_clips.append(highlight_clip)
                else:
                    # Handle multiple words case
                    mid = len(words) // 2
                    line1 = ' '.join(w['word'] for w in words[:mid])
                    line2 = ' '.join(w['word'] for w in words[mid:])
                    
                    position1 = ('center', processed_clip.h * 0.82)
                    position2 = ('center', processed_clip.h * 0.87)
                    
                    txt_clip1 = make_textclip(line1, chunk['start'] - start_time, chunk['end'] - start_time, position=position1)
                    txt_clip2 = make_textclip(line2, chunk['start'] - start_time, chunk['end'] - start_time, position=position2)
                    if txt_clip1:
                        txt_clips.append(txt_clip1)
                    if txt_clip2:
                        txt_clips.append(txt_clip2)
                    
                    # Add highlighted words
                    for i, word in enumerate(words):
                        if i < mid:
                            text = line1
                            position = position1
                        else:
                            text = line2
                            position = position2
                        
                        highlight_clip = make_textclip(text, word['start'] - start_time, word['end'] - start_time, position=position, highlight=True)
                        if highlight_clip:
                            txt_clips.append(highlight_clip)
        
        return CompositeVideoClip([processed_clip] + txt_clips)

class BigBangStyle(CaptionStyle):
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

# Add more style classes here...

class CaptionStyleFactory:
    @staticmethod
    def get_style(style_name):
        if style_name == "elon":
            return ElonStyle()
        elif style_name == "big_bang":
            return BigBangStyle()
        # Add more style conditions here...
        else:
            raise ValueError(f"Unknown caption style: {style_name}")

# ###
#     def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
#         def make_textclip(txt, start_time, end_time, color='white', position=('center', 'center'), highlight=False):
#             if not txt:  # Check if the text is empty or None
#                 return None
            
#             fontsize = 80 if output_video_type == 'portrait' else 50
#             stroke_width = 4
            
#             if highlight:
#                 color = random.choice(['rgb(255, 255, 0)', 'rgb(0, 200, 0)'])

#             txt_clip = TextClip(txt.upper(), fontsize=fontsize, font='Arial-Black', color=color, 
#                                 stroke_color='black', stroke_width=stroke_width, method='label', kerning=-3)
            
#             txt_clip = txt_clip.set_position(position).set_start(start_time).set_duration(end_time - start_time)
#             return txt_clip

#         def chunk_word_timings(word_timings, max_chars):
#             chunked_timings = []
#             current_chunk = []
#             current_chars = 0
            
#             for word_timing in word_timings:
#                 word = word_timing['word']
#                 if current_chars + len(word) > max_chars and current_chunk:
#                     start_time = current_chunk[0]['start']
#                     end_time = current_chunk[-1]['end']
#                     text = ' '.join(wt['word'] for wt in current_chunk)
#                     chunked_timings.append({
#                         'start': start_time,
#                         'end': end_time,
#                         'word': text,
#                         'words': current_chunk
#                     })
#                     current_chunk = []
#                     current_chars = 0
                
#                 current_chunk.append(word_timing)
#                 current_chars += len(word) + 1 
            
#             if current_chunk:
#                 start_time = current_chunk[0]['start']
#                 end_time = current_chunk[-1]['end']
#                 text = ' '.join(wt['word'] for wt in current_chunk)
#                 chunked_timings.append({
#                     'start': start_time,
#                     'end': end_time,
#                     'word': text,
#                     'words': current_chunk
#                 })
            
#             return chunked_timings

#         max_chars = 30 if output_video_type == 'landscape' else 20  # Reduced from 40 to 20 for portrait
#         chunked_timings = chunk_word_timings(word_timings, max_chars)
        
#         txt_clips = []
#         for chunk in chunked_timings:
#             if output_video_type == 'landscape':
#                 position = ('center', processed_clip.h * 0.85)
#                 txt_clip = make_textclip(chunk['word'], chunk['start'] - start_time, chunk['end'] - start_time, position=position)
#                 if txt_clip:
#                     txt_clips.append(txt_clip)
#             else:  # portrait
#                 words = chunk['words']
#                 if len(words) == 1:
#                     # Handle single word case
#                     text = words[0]['word']
#                     position = ('center', processed_clip.h * 0.85)
#                     txt_clip = make_textclip(text, chunk['start'] - start_time, chunk['end'] - start_time, position=position)
#                     if txt_clip:
#                         txt_clips.append(txt_clip)
                    
#                     # Add highlighted word
#                     highlight_clip = make_textclip(text, words[0]['start'] - start_time, words[0]['end'] - start_time, position=position, highlight=True)
#                     if highlight_clip:
#                         txt_clips.append(highlight_clip)
#                 else:
#                     # Handle multiple words case
#                     mid = len(words) // 2
#                     line1 = ' '.join(w['word'] for w in words[:mid])
#                     line2 = ' '.join(w['word'] for w in words[mid:])
                    
#                     position1 = ('center', processed_clip.h * 0.82)
#                     position2 = ('center', processed_clip.h * 0.87)
                    
#                     txt_clip1 = make_textclip(line1, chunk['start'] - start_time, chunk['end'] - start_time, position=position1)
#                     txt_clip2 = make_textclip(line2, chunk['start'] - start_time, chunk['end'] - start_time, position=position2)
#                     if txt_clip1:
#                         txt_clips.append(txt_clip1)
#                     if txt_clip2:
#                         txt_clips.append(txt_clip2)
                    
#                     # Add highlighted words
#                     for i, word in enumerate(words):
#                         if i < mid:
#                             text = line1
#                             position = position1
#                         else:
#                             text = line2
#                             position = position2
                        
#                         highlight_clip = make_textclip(text, word['start'] - start_time, word['end'] - start_time, position=position, highlight=True)
#                         if highlight_clip:
#                             txt_clips.append(highlight_clip)
        
#         return CompositeVideoClip([processed_clip] + txt_clips)

#     def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
#         def make_textclip(txt, start_time, end_time, color='white', position=('center', 'center')):
#             txt_clip = TextClip(txt.upper(), fontsize=50 if output_video_type == 'landscape' else 100, 
#                                 color=color, font='Arial-Bold', bg_color='black')
#             txt_clip = txt_clip.set_position(position).set_start(start_time).set_duration(end_time - start_time)
#             return txt_clip

#         position = ('center', processed_clip.h * (0.85 if output_video_type == 'landscape' else 0.85))
#         txt_clips = [make_textclip(wt['word'], wt['start'] - start_time, wt['end'] - start_time, color='yellow', position=position)
#                      for wt in word_timings]
        
#         return CompositeVideoClip([processed_clip] + txt_clips)