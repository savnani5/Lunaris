import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongodb';
import { DB_NAME } from "@/lib/constants";
import { createClip } from '@/lib/actions/clip.action';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const clips = await db.collection('clip').find({ project_id: projectId }).toArray();

    return NextResponse.json(clips);
  } catch (error) {
    console.error('Error fetching clips:', error); 
    return NextResponse.json({ error: 'Error fetching clips' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const clipData = await request.json();
  console.log('Received clip data:');

  if (!clipData.project_id || !clipData.title || !clipData.transcript || !clipData.s3_uri) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const newClip = await createClip(clipData);

    return NextResponse.json({ message: 'Clip created successfully', clip: newClip });
  } catch (error) {
    console.error('Error creating clip:', error);
    return NextResponse.json({ error: 'Error creating clip' }, { status: 500 });
  }
}
