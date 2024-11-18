from abc import ABC, abstractmethod
from moviepy.editor import TextClip, CompositeVideoClip
import random

class CaptionStyle(ABC):
    @abstractmethod
    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        pass

class ImanStyle(CaptionStyle):
    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        def make_textclip(txt, start_time, end_time, color='white', position=('center', 'center'), highlight=False):
            if not txt:  # Check if the text is empty or None
                return None
            
            fontsize = 80 if output_video_type == 'portrait' else 50
            stroke_width = 4
            
            if highlight:
                color = random.choice(['rgb(0, 255, 0)', 'rgb(255, 255, 0)'])  # Green and Yellow

            # Create multiple layers for maximum thickness
            # Layer 3 (Outermost black stroke)
            bg_clip_outer = TextClip(txt.upper(),
                                  fontsize=fontsize,
                                  font='Roboto-Black',
                                  color='black',
                                  stroke_color='black',
                                  stroke_width=stroke_width + 4,
                                  method='label',
                                  kerning=-2,
                                  size=(None, None))
            
            # Layer 2 (Middle black stroke)
            bg_clip = TextClip(txt.upper(),
                              fontsize=fontsize,
                              font='Roboto-Black',
                              color='black',
                              stroke_color='black',
                              stroke_width=stroke_width + 2,
                              method='label',
                              kerning=-2,
                              size=(None, None))
            
            # Layer 1 (Colored text with thin stroke)
            txt_clip = TextClip(txt.upper(), 
                               fontsize=fontsize, 
                               font='Roboto-Black',
                               color=color, 
                               stroke_color='black', 
                               stroke_width=stroke_width,
                               method='label',
                               kerning=-2,
                               size=(None, None))
            
            # Composite all layers
            txt_clip = CompositeVideoClip([bg_clip_outer, bg_clip, txt_clip])
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
                # Base white text
                txt_clip = make_textclip(chunk['word'], chunk['start'] - start_time, chunk['end'] - start_time, position=position)
                if txt_clip:
                    txt_clips.append(txt_clip)
                
                # Add highlighted version with 50% probability
                for word in chunk['words']:
                    if random.random() < 0.4:  # 40% chance to highlight
                        highlight_clip = make_textclip(
                            chunk['word'],
                            word['start'] - start_time,
                            word['end'] - start_time,
                            position=position,
                            highlight=True
                        )
                        if highlight_clip:
                            txt_clips.append(highlight_clip)
            else:  # portrait
                words = chunk['words']
                if len(words) == 1:
                    # Handle single word case
                    text = words[0]['word']
                    position = ('center', processed_clip.h * 0.75)
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
                    
                    position1 = ('center', processed_clip.h * 0.72)
                    position2 = ('center', processed_clip.h * 0.77)
                    
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

class JakeStyle(CaptionStyle):
    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        def make_textclip(txt, start_time, end_time, color='white', position=('center', 'center')):
            # Create text clip with extra spacing using spaces
            padded_text = f"  {txt.upper()}  "  # Add horizontal padding with spaces
            
            # Added stroke width for extra boldness
            stroke_width = 2
            
            # Create the clip with semi-transparent black background and padding
            txt_clip = TextClip(
                padded_text, 
                fontsize=50 if output_video_type == 'landscape' else 80,
                color=color,
                font='Roboto-Black',  # Changed to Roboto-Black
                bg_color='rgba(0,0,0,0.7)',
                method='label',
                size=(None, None),  # Allow the background to expand
                interline=1.5,
                kerning=-2,
                stroke_color='black',  # Added stroke
                stroke_width=stroke_width  # Added stroke width
            )
            
            # If text is too wide, reduce font size
            fontsize = 50 if output_video_type == 'landscape' else 80  # Reset fontsize
            while txt_clip.w > processed_clip.w * 0.9:
                fontsize -= 5
                txt_clip = TextClip(
                    padded_text,
                    fontsize=fontsize,
                    font='Roboto-Black',  # Changed to Roboto-Black
                    color=color,
                    bg_color='rgba(0,0,0,0.7)',  # Maintained opacity
                    method='label',
                    size=(None, None),
                    interline=1.5,
                    kerning=-2,
                    stroke_color='black',  # Maintained stroke
                    stroke_width=stroke_width  # Maintained stroke width
                )
            
            txt_clip = txt_clip.set_position(position).set_start(start_time).set_duration(end_time - start_time)
            return txt_clip

        def chunk_word_timings(word_timings, max_chars):
            chunks = []
            current_chunk = []
            current_chars = 0
            
            for word_timing in word_timings:
                word_len = len(word_timing['word']) + 1  # +1 for space
                if current_chars + word_len > max_chars and current_chunk:
                    chunks.append({
                        'words': current_chunk,
                        'start': current_chunk[0]['start'],
                        'end': current_chunk[-1]['end'],
                        'text': ' '.join(w['word'] for w in current_chunk)
                    })
                    current_chunk = []
                    current_chars = 0
                
                current_chunk.append(word_timing)
                current_chars += word_len
            
            if current_chunk:
                chunks.append({
                    'words': current_chunk,
                    'start': current_chunk[0]['start'],
                    'end': current_chunk[-1]['end'],
                    'text': ' '.join(w['word'] for w in current_chunk)
                })
            
            return chunks

        position = ('center', processed_clip.h * 0.75)
        txt_clips = []

        if output_video_type == 'landscape':
            # Use chunking for landscape mode
            max_chars = 30
            chunks = chunk_word_timings(word_timings, max_chars)
            
            for chunk in chunks:
                # Add the full line of text
                txt_clip = make_textclip(
                    chunk['text'],
                    chunk['start'] - start_time,
                    chunk['end'] - start_time,
                    color='yellow',
                    position=position
                )
                txt_clips.append(txt_clip)
        else:
            # Original single-word behavior for portrait
            txt_clips = [
                make_textclip(
                    wt['word'],
                    wt['start'] - start_time,
                    wt['end'] - start_time,
                    color='yellow',
                    position=position
                )
                for wt in word_timings
            ]
        
        return CompositeVideoClip([processed_clip] + txt_clips)

class SadiaStyle(CaptionStyle):
    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        def make_textclip(txt, start_time, end_time, color='white', position=('center', 'center'), highlight=False):
            if not txt:  # Check if text is empty or None
                return None
            
            fontsize = 80 if output_video_type == 'portrait' else 50
            stroke_width = 2  # Added for better visibility
            
            if highlight:
                # Highlighted word clip with bright purple color
                txt_clip = TextClip(
                    txt=txt.upper(),
                    fontsize=fontsize,
                    font='Roboto-Black',
                    color='rgb(255, 0, 255)',  # Changed to bright purple
                    bg_color='black',
                    method='label',
                    stroke_color='black',
                    stroke_width=stroke_width
                )
            else:
                # Base text clip
                txt_clip = TextClip(
                    txt=txt.upper(),
                    fontsize=fontsize,
                    font='Roboto-Black',
                    color='white',
                    method='label',
                    stroke_color='black',
                    stroke_width=stroke_width
                )
            
            txt_clip = txt_clip.set_position(position).set_start(start_time).set_duration(end_time - start_time)
            return txt_clip

        def get_word_positions(text, words, fontsize, video_width):
            positions = []
            
            # Updated font in all TextClip calls
            full_clip = TextClip(text.upper(), font='Roboto-Black', fontsize=fontsize)
            total_width = full_clip.w
            
            x_start = (video_width - total_width) / 2
            current_x = x_start
            current_text = ""
            
            for word in words:
                if current_text:
                    current_text += " "
                    prefix_clip = TextClip(current_text.upper(), font='Roboto-Black', fontsize=fontsize)
                    current_x = x_start + prefix_clip.w
                
                positions.append({
                    'word': word['word'],
                    'x': current_x,
                    'start': word['start'],
                    'end': word['end']
                })
                
                current_text += word['word']
            
            return positions

        # Update test clip font
        fontsize = 80 if output_video_type == 'portrait' else 50
        test_clip = TextClip("W", font='Roboto-Black', fontsize=fontsize)
        
        # Calculate max chars based on video dimensions
        fontsize = 80 if output_video_type == 'portrait' else 50
        test_clip = TextClip("W", font='Roboto-Black', fontsize=fontsize)
        char_width = test_clip.w
        max_width = processed_clip.w * 0.95
        
        # Reduce max chars for landscape mode
        if output_video_type == 'landscape':
            max_chars = 30  # Fixed value for landscape
        else:
            max_chars = int(max_width / (char_width * 0.7))  # Original calculation for portrait

        # Create chunks of text that fit on one line
        chunks = []
        current_chunk = []
        current_chars = 0
        
        for word in word_timings:
            word_len = len(word['word']) + 1  # +1 for space
            if current_chars + word_len > max_chars and current_chunk:
                chunks.append(current_chunk)
                current_chunk = []
                current_chars = 0
            current_chunk.append(word)
            current_chars += word_len
        
        if current_chunk:
            chunks.append(current_chunk)

        txt_clips = []
        y_position = processed_clip.h * (0.85 if output_video_type == 'landscape' else 0.75)

        for chunk in chunks:
            # Create the full text for this line
            full_text = ' '.join(word['word'] for word in chunk)
            
            # Create base text clip (white text)
            base_clip = make_textclip(
                full_text,
                chunk[0]['start'] - start_time,
                chunk[-1]['end'] - start_time,
                position=('center', y_position)
            )
            if base_clip:
                txt_clips.append(base_clip)
            
            # Get exact positions for each word
            word_positions = get_word_positions(full_text, chunk, fontsize, processed_clip.w)
            
            # Create highlighted clips for each word
            for pos in word_positions:
                highlight_clip = make_textclip(
                    pos['word'],
                    pos['start'] - start_time,
                    pos['end'] - start_time,
                    position=(pos['x'], y_position),
                    highlight=True
                )
                if highlight_clip:
                    txt_clips.append(highlight_clip)

        return CompositeVideoClip([processed_clip] + txt_clips)

    
class JREStyle(CaptionStyle):
    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        def make_textclip(txt, start_time, end_time, color='white', position=('center', 'center'), highlight=False):
            if not txt:  # Check if text is empty or None
                return None
            
            fontsize = 80 if output_video_type == 'portrait' else 50
            stroke_width = 2  # Added for better visibility
            
            if highlight:
                # Highlighted word clip
                txt_clip = TextClip(
                    txt=txt,
                    fontsize=fontsize,
                    font='Roboto-Black',  # Changed to Roboto-Black
                    color='rgb(0, 200, 0)',  # Kept the same green color
                    bg_color='black',
                    method='label',
                    stroke_color='black',
                    stroke_width=stroke_width
                )
            else:
                # Base text clip
                txt_clip = TextClip(
                    txt=txt,
                    fontsize=fontsize,
                    font='Roboto-Black',  # Changed to Roboto-Black
                    color='white',
                    method='label',
                    stroke_color='black',
                    stroke_width=stroke_width
                )
            
            txt_clip = txt_clip.set_position(position).set_start(start_time).set_duration(end_time - start_time)
            return txt_clip

        def get_word_positions(text, words, fontsize, video_width):
            positions = []
            
            # Updated font in all TextClip calls
            full_clip = TextClip(text, font='Roboto-Black', fontsize=fontsize)
            total_width = full_clip.w
            
            x_start = (video_width - total_width) / 2
            current_x = x_start
            current_text = ""
            
            for word in words:
                if current_text:
                    current_text += " "
                    prefix_clip = TextClip(current_text, font='Roboto-Black', fontsize=fontsize)
                    current_x = x_start + prefix_clip.w
                
                positions.append({
                    'word': word['word'],
                    'x': current_x,
                    'start': word['start'],
                    'end': word['end']
                })
                
                current_text += word['word']
            
            return positions

        # Calculate max chars based on video dimensions
        fontsize = 80 if output_video_type == 'portrait' else 50
        test_clip = TextClip("W", font='Roboto-Black', fontsize=fontsize)
        char_width = test_clip.w
        max_width = processed_clip.w * 0.95
        
        # Reduce max chars for landscape mode
        if output_video_type == 'landscape':
            max_chars = 35  # Fixed value for landscape
        else:
            max_chars = int(max_width / (char_width * 0.7))  # Original calculation for portrait

        # Create chunks of text that fit on one line
        chunks = []
        current_chunk = []
        current_chars = 0
        
        for word in word_timings:
            word_len = len(word['word']) + 1  # +1 for space
            if current_chars + word_len > max_chars and current_chunk:
                chunks.append(current_chunk)
                current_chunk = []
                current_chars = 0
            current_chunk.append(word)
            current_chars += word_len
        
        if current_chunk:
            chunks.append(current_chunk)

        txt_clips = []
        y_position = processed_clip.h * 0.75

        for chunk in chunks:
            # Create the full text for this line
            full_text = ' '.join(word['word'] for word in chunk)
            
            # Create base text clip (white text)
            base_clip = make_textclip(
                full_text,
                chunk[0]['start'] - start_time,
                chunk[-1]['end'] - start_time,
                position=('center', y_position)
            )
            if base_clip:
                txt_clips.append(base_clip)
            
            # Get exact positions for each word
            word_positions = get_word_positions(full_text, chunk, fontsize, processed_clip.w)
            
            # Create highlighted clips for each word
            for pos in word_positions:
                highlight_clip = make_textclip(
                    pos['word'],
                    pos['start'] - start_time,
                    pos['end'] - start_time,
                    position=(pos['x'], y_position),
                    highlight=True
                )
                if highlight_clip:
                    txt_clips.append(highlight_clip)

        return CompositeVideoClip([processed_clip] + txt_clips)

class ElonStyle(CaptionStyle):
    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        def make_textclip(txt, start_time, end_time, position=('center', 'center')):
            if not txt:  # Check if text is empty
                return None
                
            # Smaller font size
            fontsize = 50 if output_video_type == 'landscape' else 80
            stroke_width = 3  # Added stroke width for extra boldness
            
            # Create text clip with extra spacing using spaces
            padded_text = f"  {txt.upper()}  "  # Add horizontal padding with spaces
            
            # Layer 3 (Outermost white background)
            bg_clip_outer = TextClip(
                padded_text,
                fontsize=fontsize,
                font='Roboto-Black',  # Changed to Roboto-Black
                color='white',
                bg_color='white',
                stroke_color='white',
                stroke_width=stroke_width + 2,
                method='label',
                size=(None, None),
                interline=1.5,
                kerning=-2
            )
            
            # Layer 2 (Middle white background)
            bg_clip = TextClip(
                padded_text,
                fontsize=fontsize,
                font='Roboto-Black',  # Changed to Roboto-Black
                color='white',
                bg_color='white',
                stroke_color='white',
                stroke_width=stroke_width + 1,
                method='label',
                size=(None, None),
                interline=1.5,
                kerning=-2
            )
            
            # Layer 1 (Black text with stroke)
            txt_clip = TextClip(
                padded_text,
                fontsize=fontsize,
                font='Roboto-Black',  # Changed to Roboto-Black
                color='black',
                bg_color='white',
                stroke_color='black',
                stroke_width=stroke_width,
                method='label',
                size=(None, None),
                interline=1.5,
                kerning=-2
            )
            
            # Composite all layers
            final_clip = CompositeVideoClip([bg_clip_outer, bg_clip, txt_clip])
            
            # If text is too wide, reduce font size
            while final_clip.w > processed_clip.w * 0.9:
                fontsize -= 5
                # Recreate all layers with smaller font
                bg_clip_outer = TextClip(
                    padded_text,
                    fontsize=fontsize,
                    font='Roboto-Black',
                    color='white',
                    bg_color='white',
                    stroke_color='white',
                    stroke_width=stroke_width + 2,
                    method='label',
                    size=(None, None),
                    interline=1.5,
                    kerning=-2
                )
                bg_clip = TextClip(
                    padded_text,
                    fontsize=fontsize,
                    font='Roboto-Black',
                    color='white',
                    bg_color='white',
                    stroke_color='white',
                    stroke_width=stroke_width + 1,
                    method='label',
                    size=(None, None),
                    interline=1.5,
                    kerning=-2
                )
                txt_clip = TextClip(
                    padded_text,
                    fontsize=fontsize,
                    font='Roboto-Black',
                    color='black',
                    bg_color='white',
                    stroke_color='black',
                    stroke_width=stroke_width,
                    method='label',
                    size=(None, None),
                    interline=1.5,
                    kerning=-2
                )
                final_clip = CompositeVideoClip([bg_clip_outer, bg_clip, txt_clip])
            
            final_clip = final_clip.set_position(position).set_start(start_time).set_duration(end_time - start_time)
            return final_clip

        def calculate_max_chars():
            if output_video_type == 'landscape':
                return 30  # Fixed value for landscape
            else:
                # Create a test clip with a single character to measure width
                test_char = TextClip(
                    "W",  # Use W as it's typically one of the widest characters
                    fontsize=100,
                    font='Arial-Bold'
                )
                char_width = test_char.w
                
                # Calculate how many characters can fit with 90% of video width
                available_width = processed_clip.w * 0.9
                max_chars = int(available_width / (char_width * 0.8))  # 0.8 to account for spacing
                
                # Ensure reasonable limits
                return min(max(max_chars, 15), 40)  # Min 15, Max 40 characters

        def chunk_word_timings(word_timings, max_chars):
            chunked_timings = []
            current_chunk = []
            current_chars = 0
            
            for word_timing in word_timings:
                word = word_timing['word']
                word_len = len(word) + 1  # +1 for space
                
                # Start new chunk if adding this word would exceed max_chars
                if current_chars + word_len > max_chars and current_chunk:
                    start_time = current_chunk[0]['start']
                    end_time = current_chunk[-1]['end']
                    text = ' '.join(wt['word'] for wt in current_chunk)
                    chunked_timings.append({
                        'start': start_time,
                        'end': end_time,
                        'text': text
                    })
                    current_chunk = []
                    current_chars = 0
                
                # Handle words that are longer than max_chars
                if word_len > max_chars:
                    if current_chunk:  # First add any pending chunk
                        start_time = current_chunk[0]['start']
                        end_time = current_chunk[-1]['end']
                        text = ' '.join(wt['word'] for wt in current_chunk)
                        chunked_timings.append({
                            'start': start_time,
                            'end': end_time,
                            'text': text
                        })
                        current_chunk = []
                    # Add long word as its own chunk
                    chunked_timings.append({
                        'start': word_timing['start'],
                        'end': word_timing['end'],
                        'text': word
                    })
                    continue
                
                current_chunk.append(word_timing)
                current_chars += word_len
            
            # Add remaining chunk if any
            if current_chunk:
                start_time = current_chunk[0]['start']
                end_time = current_chunk[-1]['end']
                text = ' '.join(wt['word'] for wt in current_chunk)
                chunked_timings.append({
                    'start': start_time,
                    'end': end_time,
                    'text': text
                })
            
            return chunked_timings

        # Calculate max chars based on video width
        max_chars = calculate_max_chars()
        chunked_timings = chunk_word_timings(word_timings, max_chars)
        
        position = ('center', processed_clip.h * (0.85 if output_video_type == 'landscape' else 0.75))
        txt_clips = [
            make_textclip(
                chunk['text'],
                chunk['start'] - start_time,
                chunk['end'] - start_time,
                position=position
            )
            for chunk in chunked_timings
        ]
        
        # Filter out None clips
        txt_clips = [clip for clip in txt_clips if clip is not None]
        
        return CompositeVideoClip([processed_clip] + txt_clips)
    
    
class ChrisStyle(CaptionStyle):
    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        def make_textclip(txt, start_time, end_time, position=('center', 'center')):
            if not txt:  # Check if text is empty
                return None
                
            fontsize = 50 if output_video_type == 'landscape' else 80
            stroke_width = 2
            
            # Create multiple layers for maximum thickness and shadow effect
            # Layer 3 (Outermost black stroke)
            bg_clip_outer = TextClip(
                txt.upper(),
                fontsize=fontsize,
                font='Roboto-Black',
                color='black',
                stroke_color='black',
                stroke_width=stroke_width + 4,
                method='label',
                kerning=-2,
                size=(None, None)
            )
            
            # Layer 2 (Middle black stroke)
            bg_clip = TextClip(
                txt.upper(),
                fontsize=fontsize,
                font='Roboto-Black',
                color='black',
                stroke_color='black',
                stroke_width=stroke_width + 2,
                method='label',
                kerning=-2,
                size=(None, None)
            )
            
            # Layer 1 (White text with thin stroke)
            txt_clip = TextClip(
                txt.upper(), 
                fontsize=fontsize,
                font='Roboto-Black',
                color='white',
                stroke_color='black',
                stroke_width=stroke_width,
                method='label',
                kerning=-2,
                size=(None, None)
            )
            
            # Composite all layers
            final_clip = CompositeVideoClip([bg_clip_outer, bg_clip, txt_clip])
            
            # If text is too wide, reduce font size
            while final_clip.w > processed_clip.w * 0.9:
                fontsize -= 5
                # Recreate all layers with smaller font
                bg_clip_outer = TextClip(
                    txt.upper(),
                    fontsize=fontsize,
                    font='Roboto-Black',
                    color='black',
                    stroke_color='black',
                    stroke_width=stroke_width + 4,
                    method='label',
                    kerning=-2,
                    size=(None, None)
                )
                
                bg_clip = TextClip(
                    txt.upper(),
                    fontsize=fontsize,
                    font='Roboto-Black',
                    color='black',
                    stroke_color='black',
                    stroke_width=stroke_width + 2,
                    method='label',
                    kerning=-2,
                    size=(None, None)
                )
                
                txt_clip = TextClip(
                    txt.upper(),
                    fontsize=fontsize,
                    font='Roboto-Black',
                    color='white',
                    stroke_color='black',
                    stroke_width=stroke_width,
                    method='label',
                    kerning=-2,
                    size=(None, None)
                )
                final_clip = CompositeVideoClip([bg_clip_outer, bg_clip, txt_clip])
            
            final_clip = final_clip.set_position(position).set_start(start_time).set_duration(end_time - start_time)
            return final_clip

        def calculate_max_chars():
            if output_video_type == 'landscape':
                return 30  # Fixed value for landscape
            else:
                # Create a test clip with a single character to measure width
                test_char = TextClip(
                    "W",  # Use W as it's typically one of the widest characters
                    fontsize=100,
                    font='Roboto-Black'
                )
                char_width = test_char.w
                
                # Calculate how many characters can fit with 90% of video width
                available_width = processed_clip.w * 0.9
                max_chars = int(available_width / (char_width * 0.8))
                
                # Ensure reasonable limits
                return min(max(max_chars, 15), 40)  # Min 15, Max 40 characters

        def chunk_word_timings(word_timings, max_chars):
            chunked_timings = []
            current_chunk = []
            current_chars = 0
            
            for word_timing in word_timings:
                word = word_timing['word']
                word_len = len(word) + 1  # +1 for space
                
                # Start new chunk if adding this word would exceed max_chars
                if current_chars + word_len > max_chars and current_chunk:
                    start_time = current_chunk[0]['start']
                    end_time = current_chunk[-1]['end']
                    text = ' '.join(wt['word'] for wt in current_chunk)
                    chunked_timings.append({
                        'start': start_time,
                        'end': end_time,
                        'text': text
                    })
                    current_chunk = []
                    current_chars = 0
                
                # Handle words that are longer than max_chars
                if word_len > max_chars:
                    if current_chunk:  # First add any pending chunk
                        start_time = current_chunk[0]['start']
                        end_time = current_chunk[-1]['end']
                        text = ' '.join(wt['word'] for wt in current_chunk)
                        chunked_timings.append({
                            'start': start_time,
                            'end': end_time,
                            'text': text
                        })
                        current_chunk = []
                    # Add long word as its own chunk
                    chunked_timings.append({
                        'start': word_timing['start'],
                        'end': word_timing['end'],
                        'text': word
                    })
                    continue
                
                current_chunk.append(word_timing)
                current_chars += word_len
            
            # Add remaining chunk if any
            if current_chunk:
                start_time = current_chunk[0]['start']
                end_time = current_chunk[-1]['end']
                text = ' '.join(wt['word'] for wt in current_chunk)
                chunked_timings.append({
                    'start': start_time,
                    'end': end_time,
                    'text': text
                })
            
            return chunked_timings

        # Calculate max chars based on video width
        max_chars = calculate_max_chars()
        chunked_timings = chunk_word_timings(word_timings, max_chars)
        
        position = ('center', processed_clip.h * (0.85 if output_video_type == 'landscape' else 0.75))
        txt_clips = [
            make_textclip(
                chunk['text'],
                chunk['start'] - start_time,
                chunk['end'] - start_time,
                position=position
            )
            for chunk in chunked_timings
        ]
        
        # Filter out None clips
        txt_clips = [clip for clip in txt_clips if clip is not None]
        
        return CompositeVideoClip([processed_clip] + txt_clips)
    
class MattStyle(CaptionStyle):
    def add_subtitles(self, processed_clip, word_timings, start_time, output_video_type):
        def make_textclip(txt, start_time, end_time, color='white', position=('center', 'center'), highlight=False):
            if not txt:  # Check if the text is empty or None
                return None
            
            fontsize = 50 if output_video_type == 'landscape' else 80
            stroke_width = 4
            
            if highlight:
                color = 'rgb(255, 0, 0)'

            # Create multiple layers for maximum thickness
            # Layer 3 (Outermost black stroke)
            bg_clip_outer = TextClip(txt.upper(),
                                  fontsize=fontsize,
                                  font='Roboto-Black',
                                  color='black',
                                  stroke_color='black',
                                  stroke_width=stroke_width + 4,
                                  method='label',
                                  kerning=-2,
                                  size=(None, None))
            
            # Layer 2 (Middle black stroke)
            bg_clip = TextClip(txt.upper(),
                              fontsize=fontsize,
                              font='Roboto-Black',
                              color='black',
                              stroke_color='black',
                              stroke_width=stroke_width + 2,
                              method='label',
                              kerning=-2,
                              size=(None, None))
            
            # Layer 1 (Colored text with thin stroke)
            txt_clip = TextClip(txt.upper(), 
                               fontsize=fontsize, 
                               font='Roboto-Black',
                               color=color, 
                               stroke_color='black', 
                               stroke_width=stroke_width,
                               method='label',
                               kerning=-2,
                               size=(None, None))
            
            # Composite all layers
            txt_clip = CompositeVideoClip([bg_clip_outer, bg_clip, txt_clip])
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
                # Base white text
                txt_clip = make_textclip(chunk['word'], chunk['start'] - start_time, chunk['end'] - start_time, position=position)
                if txt_clip:
                    txt_clips.append(txt_clip)
                
                # Add highlighted version with 50% probability
                for word in chunk['words']:
                    if random.random() < 0.4:  # 40% chance to highlight
                        highlight_clip = make_textclip(
                            chunk['word'],
                            word['start'] - start_time,
                            word['end'] - start_time,
                            position=position,
                            highlight=True
                        )
                        if highlight_clip:
                            txt_clips.append(highlight_clip)
            else:  # portrait
                words = chunk['words']
                if len(words) == 1:
                    # Handle single word case
                    text = words[0]['word']
                    position = ('center', processed_clip.h * 0.75)
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
                    
                    position1 = ('center', processed_clip.h * 0.72)
                    position2 = ('center', processed_clip.h * 0.77)
                    
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
    
class CaptionStyleFactory:
    @staticmethod
    def get_style(style_name):
        if style_name == "jre":
            return JREStyle()
        elif style_name == "sadia":
            return SadiaStyle()
        elif style_name == "iman":
            return ImanStyle()
        elif style_name == "jake":
            return JakeStyle()
        elif style_name == "elon":
            return ElonStyle()
        elif style_name == "chris":
            return ChrisStyle()
        elif style_name == "matt":
            return MattStyle()
        else:
            raise ValueError(f"Unknown caption style: {style_name}")