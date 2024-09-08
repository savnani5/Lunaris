import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(url);
    const duration = parseInt(info.videoDetails.lengthSeconds);
    const thumbnails = info.videoDetails.thumbnails;
    const title = info.videoDetails.title;

    return NextResponse.json({
      title,
      duration,
      thumbnails,
    });
  } catch (error) {
    console.error('Error fetching video details:', error);
    return NextResponse.json({ error: 'Failed to fetch video details' }, { status: 500 });
  }
}