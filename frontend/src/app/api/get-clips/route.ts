import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongodb';
import { createClip } from '@/lib/actions/clip.action';

// Create a connection promise outside the handler
let dbConnection: Promise<{ db: any }>;

async function getDbConnection() {
  if (!dbConnection) {
    dbConnection = connectToDatabase();
  }
  return dbConnection;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const { db } = await getDbConnection();
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
