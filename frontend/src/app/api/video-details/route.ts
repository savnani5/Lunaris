import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Innertube } from 'youtubei.js/web';


async function fetchTranscript(videoId: string) {
  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YT_API_KEY
    });

    const yt = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false,
    });

    const [videoResponse, info] = await Promise.all([
      youtube.videos.list({
        part: ['snippet', 'contentDetails'],
        id: [videoId]
      }),
      yt.getInfo(videoId)
    ]);

    const transcriptData = await info.getTranscript();
    const transcript = transcriptData?.transcript?.content?.body?.initial_segments?.map((segment: any) => ({
      text: decodeHtmlEntities(segment.snippet.text),
      start: segment.start_ms / 1000,
      end: (segment.start_ms + segment.duration_ms) / 1000,
      duration: segment.duration_ms / 1000
    }));

    const video = videoResponse.data.items?.[0];
    if (!video) throw new Error('Video not found');

    return {
      title: video.snippet?.title,
      duration: video.contentDetails?.duration,
      thumbnails: video.snippet?.thumbnails,
      transcript: transcript
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
    console.error('Error fetching video details:', error);
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
      console.log('Successfully extracted video ID:', videoId);
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
}