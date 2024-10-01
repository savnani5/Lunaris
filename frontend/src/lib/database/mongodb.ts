import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI as string;

interface MongoConnection {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

let cached: MongoConnection = (global as any).mongoConnection;

if (!cached) {
  cached = (global as any).mongoConnection = {
    client: null,
    promise: null
  };
}

export async function connectToDatabase(): Promise<MongoClient> {
  if (cached.client) return cached.client;

  if (!MONGODB_URI) throw new Error('Missing MONGODB_URI');

  cached.promise = cached.promise || 
    new MongoClient(MONGODB_URI).connect();

  cached.client = await cached.promise;

  return cached.client;
}

export default connectToDatabase;
