import { NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js';

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const youtube = await Innertube.create({lang: 'en',
                                            location: 'US',
                                            enable_safety_mode: true});
    const videoId = extractVideoId(url);
    const info = await youtube.getBasicInfo(videoId);
    
    console.log(info);
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