import { NextResponse } from 'next/server';
import { purgeConnections } from '@/lib/database/db.utils';

export async function POST() {
  try {
    await purgeConnections();
    return NextResponse.json({ message: 'Connections purged successfully' });
  } catch (error) {
    console.error('Error purging connections:', error);
    return NextResponse.json({ error: 'Failed to purge connections' }, { status: 500 });
  }
}
