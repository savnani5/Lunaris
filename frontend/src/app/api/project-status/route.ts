import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongodb';
import { ObjectId } from 'mongodb';
import { updateUserCredits } from '@/lib/actions/user.actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const projectId = searchParams.get('projectId');

  if (!userId || !projectId) {
    return NextResponse.json({ error: 'User ID and Project ID are required' }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
  
    // Use db directly, not client.db()
    const project = await db.collection('project').findOne({ _id: new ObjectId(projectId), clerk_user_id: userId });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: project.status,
      progress: project.progress,
      stage: project.stage,
      title: project.title,
      processing_timeframe: project.processing_timeframe
    });
  } catch (error) {
    console.error('Error fetching project status:', error);
    return NextResponse.json({ error: 'Error fetching project status' }, { status: 500 });
  }
}

export const POST = async (request: Request) => {
  try {
    const { userId, projectId, status, progress, stage, title, processing_timeframe } = await request.json();
    console.log(`Updating project status: ${projectId}`);

    if (!userId || !projectId || !status) {
      return NextResponse.json({ error: 'User ID, Project ID, and status are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const project = await db.collection('project').findOne({ _id: new ObjectId(projectId), clerk_user_id: userId });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const result = await db.collection('project').updateOne(
      { _id: new ObjectId(projectId), clerk_user_id: userId },
      { $set: { status, progress, stage, title, processing_timeframe } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If the project status is changing to 'failed', refund the credits
    if (status === 'failed' && project.status !== 'failed') {
      await updateUserCredits(userId, project.required_credits);
    }

    return NextResponse.json({ message: 'Project status updated successfully' });
  } catch (error) {
    console.error('Error updating project status:', error);
    return NextResponse.json(
      { error: `Error updating project status: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
};