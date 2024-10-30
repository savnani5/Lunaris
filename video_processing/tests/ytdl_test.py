import subprocess
import os

# Create cache directory if it doesn't exist
cache_dir = "/efs/ytdl_cache"
# os.makedirs(cache_dir, exist_ok=True)

subprocess.run([
    "yt-dlp",
    "https://www.youtube.com/watch?v=nmubtItkCrQ",
    "-P",
    "tmp",
    "--username",
    "oauth",
    "--password",
    "",
    "--cache-dir",
    cache_dir
])
