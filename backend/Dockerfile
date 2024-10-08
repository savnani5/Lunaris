# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    imagemagick

# Update ImageMagick policy to allow required operations
RUN sed -i 's/<policy domain="path" rights="none" pattern="@\*"/<!-- <policy domain="path" rights="none" pattern="@*" -->/g' /etc/ImageMagick-6/policy.xml && \
sed -i 's/<policy domain="coder" rights="none" pattern="PDF"/<!-- <policy domain="coder" rights="none" pattern="PDF" -->/g' /etc/ImageMagick-6/policy.xml

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install custom yt-dlp library
# RUN python3 -m pip install -U https://github.com/coletdjnz/yt-dlp-youtube-oauth2/archive/refs/heads/master.zip

# Expose port 5001 for the Lunaris Flask app
EXPOSE 8080

# Define environment variable
ENV FLASK_ENV=production

# Run app.py when the container launches
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "4", "wsgi:application"]
