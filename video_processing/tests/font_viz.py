import os
from moviepy.editor import TextClip, CompositeVideoClip
from tqdm import tqdm
import math

def visualize_fonts():
    # Read available fonts from the file
    with open('available_fonts.txt', 'r') as f:
        fonts = [line.strip() for line in f if line.strip()]

    # Create 'fonts' directory if it doesn't exist
    if not os.path.exists('fonts'):
        os.makedirs('fonts')

    # Calculate the number of images needed
    num_images = math.ceil(len(fonts) / 100)

    for img_num in tqdm(range(num_images), desc="Generating font images"):
        # Create a list to hold TextClips for this image
        clips = []
        
        for i in range(100):
            font_index = img_num * 100 + i
            if font_index >= len(fonts):
                break
            
            font = fonts[font_index]
            try:
                # Create a TextClip with the font name
                txt_clip = TextClip(txt=font, fontsize=20, font=font, color='yellow', bg_color='black', size=(250, 40))
                txt_clip = txt_clip.set_position((i % 10 * 250, i // 10 * 40))
                clips.append(txt_clip)
            except Exception as e:
                print(f"Error processing font {font}: {str(e)}")
        
        # Create a composite image with all TextClips
        composite = CompositeVideoClip(clips, size=(2500, 400))
        
        # Save the composite image
        composite.save_frame(f"fonts/font_visualization_{img_num + 1}.png")

if __name__ == "__main__":
    visualize_fonts()
