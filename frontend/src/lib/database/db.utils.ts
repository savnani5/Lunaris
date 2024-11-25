import { connectToDatabase } from './mongodb';
import { Db, MongoClient } from 'mongodb';

interface DbConnection {
  db: Db;
  lastUsed: number;
  activeQueries: number;
}

let dbConnection: DbConnection | null = null;
let dbConnectionPromise: Promise<DbConnection> | null = null;
const CONNECTION_TIMEOUT = 60000; // 1 minute
const MAX_QUERIES_PER_CONNECTION = 100;

export async function getDbConnection() {
  const now = Date.now();

  // If we have an active connection, it's not timed out, and not overloaded
  if (dbConnection && 
      (now - dbConnection.lastUsed) < CONNECTION_TIMEOUT && 
      dbConnection.activeQueries < MAX_QUERIES_PER_CONNECTION) {
    dbConnection.lastUsed = now;
    dbConnection.activeQueries++;
    return dbConnection;
  }

  // If we have a pending connection promise, return it
  if (dbConnectionPromise) {
    return dbConnectionPromise;
  }

  // Create new connection promise
  dbConnectionPromise = (async () => {
    const { db } = await connectToDatabase();
    const connection = {
      db,
      lastUsed: now,
      activeQueries: 1
    };
    dbConnection = connection;
    return connection;
  })();

  try {
    const connection = await dbConnectionPromise;
    return connection;
  } finally {
    dbConnectionPromise = null;
  }
}

export async function releaseConnection(connection: DbConnection) {
  if (connection.activeQueries > 0) {
    connection.activeQueries--;
  }
}

export async function purgeConnections() {
  if (global.mongoClient) {
    await global.mongoClient.close(true);
    global.mongoClient = undefined;
  }
  dbConnection = null;
  dbConnectionPromise = null;
  console.log('All database connections purged');
}