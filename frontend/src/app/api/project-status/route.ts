import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const projectId = searchParams.get('projectId');

  if (!userId || !projectId) {
    return NextResponse.json({ error: 'User ID and Project ID are required' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('lunarisDB');

    const project = await db.collection('projects').findOne({
      _id: projectId as unknown as ObjectId,
      clerk_user_id: userId
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: project._id,
      status: project.status,
      title: project.title,
      processingTimeframe: project.processing_timeframe,
      stage: project.stage,
      progress: project.progress
    });
  } catch (error) {
    console.error('Error fetching project status:', error);
    return NextResponse.json({ error: 'Error fetching project status' }, { status: 500 });
  }
}
