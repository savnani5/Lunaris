# Use a smaller base image
FROM python:3.11-slim-bullseye

# Install system dependencies and clean up in a single RUN command
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    imagemagick \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i 's/<policy domain="path" rights="none" pattern="@\*"/<!-- <policy domain="path" rights="none" pattern="@*" -->/g' /etc/ImageMagick-6/policy.xml \
    && sed -i 's/<policy domain="coder" rights="none" pattern="PDF"/<!-- <policy domain="coder" rights="none" pattern="PDF" -->/g' /etc/ImageMagick-6/policy.xml

# Set the working directory
WORKDIR /app

# Copy only the requirements file first
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port and set environment variable
EXPOSE 5001
ENV FLASK_ENV=production

# Run the application
CMD ["python", "app.py"]
