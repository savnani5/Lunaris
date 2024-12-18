import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { YoutubeTranscript } from 'youtube-transcript';


// Initialize YouTube client with OAuth2
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YT_API_KEY
});

async function fetchTranscript(videoId: string) {
  try {
    console.log('Fetching transcript for video:', videoId);
    
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcriptItems || transcriptItems.length === 0) {
      console.log('No transcript found for video:', videoId);
      return null;
    }

    // Transform the transcript into our desired format
    const transcript = transcriptItems.map((item: any) => ({
      text: item.text,
      start: item.offset / 1000, // Convert to seconds
      duration: item.duration,
      end: (item.offset + item.duration) / 1000 // Convert to seconds
    }));

    return transcript;

  } catch (error) {
    console.error('Transcript fetch error:', error);
    return null;
  }
}

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    console.log('Processing URL:', url); // Debug log
    const videoId = extractVideoId(url);
    console.log('Extracted video ID:', videoId); // Debug log

    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: [videoId]
    });

    // Fetch transcript
    const transcript = await fetchTranscript(videoId);

    const video = response.data.items?.[0];

    if (!video) {
      console.error('Video not found in API response');
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const result = {
      title: video.snippet?.title,
      duration: video.contentDetails?.duration,
      thumbnails: video.snippet?.thumbnails,
      transcript: transcript
    };

    // console.log('Returning video details:', JSON.stringify(result, null, 2));
    console.log('Returning video details');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching video details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch video details', details: errorMessage }, { status: 500 });
  }
}

function extractVideoId(url: string): string {
  try {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v') || 
                    urlObj.pathname.split('/').pop() ||
                    url.split('youtu.be/').pop()?.split('?')[0];
                    
    if (!videoId || videoId.length !== 11) {
      throw new Error('Invalid YouTube video ID');
    }
    return videoId;
  } catch (error) {
    console.error('URL parsing error:', error);
    throw new Error('Invalid YouTube URL');
  }
}