import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { YoutubeTranscript } from 'youtube-transcript';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YT_API_KEY
});

async function fetchTranscriptWithFallback(videoId: string) {
  // First try youtube-transcript
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    console.log('Transcript fetched with youtube-transcript');
    return transcript;
  } catch (error) {
    console.log('youtube-transcript failed, trying fallback method');
  }

  // Fallback: Try direct XML caption fetch with proxy
  try {
    const proxyList = JSON.parse(process.env.PROXY_LIST || '[]');
    const proxy = proxyList[Math.floor(Math.random() * proxyList.length)];
    const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.url}:${proxy.port}`;
    
    console.log('Using proxy:', proxy.url);
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    // Try auto-generated captions first
    const autoUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&kind=asr`;
    let response = await fetch(autoUrl, {
      agent: proxyAgent as any,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    console.log('Proxy request status:', response.status);
    
    // If no auto captions, try regular captions
    if (!response.ok) {
      const regularUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
      response = await fetch(regularUrl, {
        agent: proxyAgent as any,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      console.log('Proxy request status:', response.status);
    }

    const xml = await response.text();
    console.log('Raw caption XML length:', xml.length);

    // Parse XML to transcript format
    const transcriptItems = xml.match(/<text[^>]*>(.*?)<\/text>/g) || [];
    if (transcriptItems.length === 0) {
      throw new Error('No caption entries found');
    }

    console.log('Found caption entries:', transcriptItems.length);
    return transcriptItems.map((item: string) => {
      const startMatch = item.match(/start="([^"]*)"/) || ['', '0'];
      const durMatch = item.match(/dur="([^"]*)"/) || ['', '0'];
      const text = decodeHtmlEntities(item.replace(/<[^>]*>/g, '').trim());
      
      return {
        text,
        offset: parseFloat(startMatch[1]),
        duration: parseFloat(durMatch[1])
      };
    });
  } catch (error) {
    console.error('Direct caption fetch failed:', error);
    throw new Error('Failed to fetch transcript');
  }
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

    const formattedTranscript = transcript.map((item: any, index: number, array: any[]) => ({
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