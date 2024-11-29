import subprocess

# Download command with progress hook
download_cmd = [
    "yt-dlp",
    "https://www.youtube.com/watch?v=-Fy_ILtR3qw",
    "-P",
    "tmp",
    "--progress",
    "--newline",
]

# Create process with pipe for output
process = subprocess.Popen(
    download_cmd,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    universal_newlines=True,
    bufsize=1
)

# Track download progress
current_progress = 0
for line in process.stdout:
    print(f"Debug raw line: {line.strip()}")  # Keep debug output
    
    if '[download]' in line and '%' in line:
        try:
            # Skip merger and destination lines
            if any(x in line for x in ['Destination:', 'Merging formats']):
                continue
                
            # Extract percentage from line
            percent_part = line.split('%')[0]
            # Get the last number before '%'
            percent_str = percent_part.split()[-1]
            percent = float(percent_str)
            
            # Only update if progress has changed significantly (every 2%)
            if abs(percent - current_progress) >= 2:
                current_progress = percent
                # Convert download progress (0-100) to overall progress (0-15)
                overall_progress = int((percent * 15) / 100)
                print(f"Download progress: {percent:.1f}% (Overall: {overall_progress}%)")
        except (ValueError, IndexError) as e:
            # print(f"Error parsing line: {line.strip()}")
            # print(f"Error details: {str(e)}")
            continue

# Wait for process to complete
process.wait()
if process.returncode == 0:
    print("Download completed successfully!")
else:
    print("Download failed!")
