import { NextResponse } from 'next/server';
import { google } from 'googleapis';

import { Innertube } from 'youtubei.js';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YT_API_KEY
});


async function fetchTranscript(videoId: string) {
  try {
    console.log('Creating Innertube instance...');
    const yt = await Innertube.create();
    
    console.log('Fetching video info for:', videoId);
    const video = await yt.getBasicInfo(videoId);
    
    console.log('Full video object:', JSON.stringify({
      captions: video.captions,
      basic_info: {
        title: video.basic_info?.title,
        id: video.basic_info?.id,
      }
    }, null, 2));

    if (!video.captions) {
      console.log('No captions object found in video response');
      return null;
    }

    const captionTracks = video.captions.getCaptionTracks();
    console.log('Caption tracks:', JSON.stringify(captionTracks, null, 2));

    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks found');
      return null;
    }

    // Get English auto-generated captions
    const track = captionTracks.find(t => t.language_code === 'en' && t.kind === 'asr');
    console.log('Selected track:', JSON.stringify(track, null, 2));

    if (!track) {
      console.log('No English auto-generated captions found');
      return null;
    }

    console.log('Fetching transcript from URL:', track.base_url);
    const response = await fetch(track.base_url);
    const xml = await response.text();
    console.log('Received XML length:', xml.length);

    // Parse XML to get transcript
    const captions = xml.match(/<text[^>]*>(.*?)<\/text>/g)?.map(caption => {
      const start = parseFloat(caption.match(/start="([^"]+)"/)?.[1] || '0');
      const dur = parseFloat(caption.match(/dur="([^"]+)"/)?.[1] || '0');
      const text = caption.replace(/<[^>]*>/g, '')
        .trim()
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      
      return {
        text,
        start,
        end: start + dur,
        duration: dur
      };
    }) || [];

    return captions;
  } catch (error) {
    console.error('Error fetching transcript:', error);
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
    const videoId = extractVideoId(url);
    // console.log('Extracted video ID:', videoId);

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
    // Handle different URL formats
    const urlObj = new URL(url);
    
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    
    if (urlObj.hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v');
      if (!videoId) throw new Error('No video ID found in URL');
      return videoId;
    }
    
    throw new Error('Not a YouTube URL');
  } catch (error) {
    console.error('URL parsing error:', url, error);
    throw new Error('Invalid YouTube URL');
  }
}