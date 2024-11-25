import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI as string;
const options = {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 60000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  waitQueueTimeoutMS: 10000,
  family: 4,
  retryWrites: true,
  retryReads: true
};

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

declare global {
  var mongoClient: MongoClient | undefined;
}

export async function connectToDatabase() {
  if (global.mongoClient) {
    return {
      client: global.mongoClient,
      db: global.mongoClient.db(process.env.DB_NAME)
    };
  }

  try {
    const client = await MongoClient.connect(MONGODB_URI, options);
    global.mongoClient = client;

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
      process.on(signal, async () => {
        await client.close();
        process.exit(0);
      });
    });

    return {
      client,
      db: client.db(process.env.DB_NAME)
    };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}