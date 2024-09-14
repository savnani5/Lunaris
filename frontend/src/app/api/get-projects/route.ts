import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('lunarisDB');
    const projects = await db.collection('projects').find({ clerk_user_id: userId }).toArray();

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error); 
    return NextResponse.json({ error: 'Error fetching projects' }, { status: 500 });
  }
}