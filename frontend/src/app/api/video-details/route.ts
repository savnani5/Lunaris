import { NextResponse } from 'next/server';
import { google } from 'googleapis';

import { Innertube } from 'youtubei.js';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YT_API_KEY
});


async function fetchTranscript(videoId: string) {
  try {
    // Parse proxy list from environment variable
    const proxyList = JSON.parse(process.env.PROXY_LIST || '[]');
    
    // Randomly select a proxy
    const proxy = proxyList[Math.floor(Math.random() * proxyList.length)];
    const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.url}:${proxy.port}`;

    const yt = await Innertube.create({
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const response = await fetch(input, {
          ...init,
          next: { revalidate: 0 },
          headers: {
            ...(init?.headers ? Object.fromEntries(new Headers(init.headers)) : {}),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          agent: new (require('https-proxy-agent').HttpsProxyAgent)(proxyUrl)
        } as RequestInit & { agent: any });
        
        if (!response.ok) {
          console.error('Proxy request failed:', response.status);
          // Fallback to direct request if proxy fails
          return fetch(input, init);
        }
        
        return response;
      }
    });

    const video = await yt.getBasicInfo(videoId);
    
    if (!video.captions) {
      console.log('No captions available');
      return null;
    }

    const captionTracks = video.captions.caption_tracks;
    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks found');
      return null;
    }

    // Get English auto-generated captions
    const track = captionTracks.find(t => t.language_code === 'en' && t.kind === 'asr');
    if (!track) {
      console.log('No English captions found');
      return null;
    }

    const response = await fetch(track.base_url);
    const xml = await response.text();
    
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
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  if (!match) throw new Error('Invalid YouTube URL');
  return match[1];
}