# Use an official Python runtime as a parent image
FROM python:3.12-slim

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

# Expose port 5001 for the Lunaris Flask app
EXPOSE 5001

# Define environment variable
ENV FLASK_ENV=production

# Run app.py when the container launches
CMD ["python", "app.py"]
