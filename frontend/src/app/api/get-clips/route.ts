import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('lunarisDB');
    const clips = await db.collection('clips').find({ project_id: projectId }).toArray();

    return NextResponse.json(clips);
  } catch (error) {
    console.error('Error fetching clips:', error); 
    return NextResponse.json({ error: 'Error fetching clips' }, { status: 500 });
  }
}
