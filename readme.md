# Lunaris: AI-Powered Video Clip Generator

Lunaris is an innovative platform that uses AI to generate viral video clips from long-form content. This repository contains both the frontend and backend components of the application.

## Getting Started

To get started with Lunaris, clone the repository:

```
git clone https://github.com/savnani5/Lunaris.git
cd Lunaris
```

## Table of Contents

- [Frontend](#frontend)
  - [Prerequisites](#frontend-prerequisites)
  - [Installation](#frontend-installation)
  - [Environment Setup](#frontend-environment-setup)
  - [Running the Frontend](#running-the-frontend)
- [Backend](#backend)
  - [Prerequisites](#backend-prerequisites)
  - [Installation](#backend-installation)
  - [Environment Setup](#backend-environment-setup)
  - [Running the Backend](#running-the-backend)
  - [Docker Setup](#docker-setup)
  - [Conda Environment Setup](#conda-environment-setup)

## Frontend

### Frontend Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Frontend Installation

1. Navigate to the frontend directory:
   ```
   cd Lunaris/frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Frontend Environment Setup

1. Create a `.env.local` file in the `frontend` directory:
   ```
   touch .env.local
   ```

2. Add the following environment variables to `.env.local`:
   ```
   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

   # MongoDB
   MONGODB_URI=your_mongodb_uri

   # Backend URL
   NEXT_PUBLIC_BACKEND_URL=backend_url

   # YouTube API Key
   YT_API_KEY=your_youtube_api_key
   ```

   Replace the placeholders with your actual credentials and settings.

### Running the Frontend

1. Start the development server:
   ```
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

## Backend

### Backend Prerequisites

- Python 3.11 or later
- pip
- FFmpeg
- ImageMagick

### Backend Installation

1. Navigate to the backend directory:
   ```
   cd Lunaris/backend
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

### Backend Environment Setup

1. Create a `.env` file in the `backend` directory:
   ```
   touch .env
   ```

2. Add the following environment variables to `.env`:
   ```
   FLASK_ENV=development
   MONGODB_URI=your_mongodb_uri
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   S3_BUCKET_NAME=your_s3_bucket_name
   OPENAI_API_KEY=your_openai_api_key
   DG_API_KEY=your_deepgram_api_key
   ```

   Replace the placeholders with your actual credentials and settings.

### Running the Backend

1. Start the Flask development server:
   ```
   python app.py
   ```

   The server will start on `http://localhost:5001`

### Docker Setup

To run the backend using Docker:

1. Build the Docker image:
   ```
   docker build -t lunaris-backend .
   ```

2. Run the Docker container:
   ```
   docker run -p 8080:8080 --env-file .env lunaris-backend
   ```

   The server will be accessible at `http://localhost:8080`

### Conda Environment Setup

To set up a Conda environment for the backend:

1. Create a new Conda environment:
   ```
   conda create -n lunaris python=3.11
   ```

2. Activate the environment:
   ```
   conda activate lunaris
   ```

3. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Install system dependencies:
   
   FFmpeg and ImageMagick are system-level dependencies. The installation method depends on your operating system:

   - On Ubuntu/Debian:
     ```
     sudo apt-get update
     sudo apt-get install ffmpeg imagemagick
     ```

   - On macOS (using Homebrew):
     ```
     brew install ffmpeg imagemagick
     ```

   - On Windows:
     Download and install FFmpeg from https://ffmpeg.org/download.html
     Download and install ImageMagick from https://imagemagick.org/script/download.php

   Alternatively, if you prefer using Conda for these dependencies:
   ```
   conda install -c conda-forge ffmpeg imagemagick
   ```
   Note: Using Conda for system packages may not always be ideal for production environments.

5. Run the backend server:
   ```
   python app.py
   ```

## Additional Information

- The frontend is built with Next.js and uses Tailwind CSS for styling.
- The backend uses Flask and integrates with various AI services for video processing.
- Make sure to set up the necessary cloud services (MongoDB, AWS S3, OpenAI, Deepgram) before running the application.
- For production deployment, consider using a process manager like PM2 for the backend and a production-ready server for the frontend.

## Contributing

Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
