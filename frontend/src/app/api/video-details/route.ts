import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Innertube } from 'youtubei.js/web';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YT_API_KEY
});

async function fetchTranscriptWithFallback(videoId: string) {
  const youtube = await Innertube.create({
    lang: 'en',
    location: 'US',
    retrieve_player: false,
  });

  const info = await youtube.getInfo(videoId);
  const transcriptData = await info.getTranscript();
  return transcriptData?.transcript?.content?.body?.initial_segments?.map((segment) => ({
    text: segment.snippet.text,
    offset: Number(segment.start_ms) / 1000,
    duration: (Number(segment.end_ms) - Number(segment.start_ms)) / 1000
  }));
}

async function fetchTranscript(videoId: string) {
  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YT_API_KEY
    });

    const [videoResponse, transcript] = await Promise.all([
      youtube.videos.list({
        part: ['snippet', 'contentDetails'],
        id: [videoId]
      }),
      fetchTranscriptWithFallback(videoId)
    ]);

    const video = videoResponse.data.items?.[0];
    if (!video) throw new Error('Video not found');

    const formattedTranscript = (transcript ?? []).map((item: any, index: number, array: any[]) => ({
      text: item.text,
      start: item.offset,
      end: (index < array.length - 1) 
        ? array[index + 1].offset 
        : (item.offset + item.duration),
      duration: item.duration
    }));

    return {
      title: video.snippet?.title,
      duration: video.contentDetails?.duration,
      thumbnails: video.snippet?.thumbnails,
      transcript: formattedTranscript
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const videoId = extractVideoId(url);
    // console.log('Extracted video ID:', videoId);

    const result = await fetchTranscript(videoId);

    // console.log('Returning video details:', JSON.stringify(result, null, 2));
    console.log('Returning video details');

    return NextResponse.json(result);
  } catch (error) {
    // console.error('Error fetching video details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch video details', details: errorMessage }, { status: 500 });
  }
}

function extractVideoId(url: string): string {
  try {
    console.log('Attempting to extract video ID from URL:', url);
    
    if (!url || typeof url !== 'string') {
      console.error('Invalid URL input:', url);
      throw new Error('URL must be a non-empty string');
    }

    // Remove any leading/trailing whitespace and @ symbol
    url = url.trim().replace(/^@/, '');
    console.log('Cleaned URL:', url);

    // Simple regex to extract video ID
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    
    if (videoIdMatch && videoIdMatch[1]) {
      const videoId = videoIdMatch[1];
      // console.log('Successfully extracted video ID:', videoId);
      return videoId;
    }

    console.error('No valid video ID pattern found in URL');
    throw new Error('No video ID found in URL');
  } catch (error) {
    console.error('URL parsing error:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Invalid YouTube URL');
  }
}
