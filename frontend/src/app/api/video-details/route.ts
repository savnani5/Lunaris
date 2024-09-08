'use server'
import { NextResponse } from 'next/server';
import { Innertube, UniversalCache } from 'youtubei.js';

// Define a realistic user agent
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const youtube = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false,
      enable_safety_mode: false,
      generate_session_locally: true,
      enable_session_cache: true,
      cache: new UniversalCache(false),
      fetch: (input: URL | RequestInfo, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        headers.set('User-Agent', USER_AGENT);
        return fetch(input, { ...init, headers });
      }
    });

    const videoId = extractVideoId(url);
    const info = await youtube.getBasicInfo(videoId);
    
    // console.log(info);
    return NextResponse.json({
      title: info.basic_info.title,
      duration: info.basic_info.duration,
      thumbnails: info.basic_info.thumbnail,
    });
  } catch (error) {
    console.error('Error fetching video details:', error);
    return NextResponse.json({ error: 'Failed to fetch video details' }, { status: 500 });
  }
}

function extractVideoId(url: string): string {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  if (!match) throw new Error('Invalid YouTube URL');
  return match[1];
}