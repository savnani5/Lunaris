import { NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const { bucket, key } = await request.json();
    
    // Double-check the key is in temp_uploads/
    if (!key.startsWith('temp_uploads/')) {
      throw new Error('Invalid key path');
    }

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    
    return NextResponse.json({ message: 'S3 object deleted successfully' });
  } catch (error) {
    console.error('Error deleting S3 object:', error);
    return NextResponse.json({ error: 'Failed to delete S3 object' }, { status: 500 });
  }
}