import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: { clipId: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const clip = await db.collection('clip').findOne({ 
      _id: new ObjectId(params.clipId)  // Convert string ID to ObjectId
    });

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    return NextResponse.json(clip);
  } catch (error) {
    console.error('Error fetching clip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
