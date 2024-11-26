import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const { fileName, fileType } = await request.json();
    
    // Generate unique file path
    const fileKey = `temp_uploads/${uuidv4()}/${fileName}`;
    
    // Create presigned URL with additional headers
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
    });
    
    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600 * 24,
      signableHeaders: new Set([
        'content-type',
        'x-amz-acl',
      ])
    });
    
    return NextResponse.json({
      uploadUrl,
      fileKey,
      bucket: process.env.S3_BUCKET_NAME
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
