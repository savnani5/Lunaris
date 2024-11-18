import subprocess

# Create cache directory if it doesn't exist
cache_dir = "/efs/ytdl_cache"
# os.makedirs(cache_dir, exist_ok=True)

subprocess.run([
    "yt-dlp",
    "https://www.youtube.com/watch?v=PRE9nDs5r6U",
    "-P",
    "tmp",
    "--proxy",
    ""
])

# subprocess.run([
#     "yt-dlp",
#     "https://www.youtube.com/watch?v=PRE9nDs5r6U",
#     "-P",
#     "tmp",
#     "--username",
#     "oauth",
#     "--password",
#     "",
#     "--cache-dir",
#     cache_dir
# ])