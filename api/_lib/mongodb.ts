import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 30000,
};

// Cache on the global object so the connection survives module reloads in development (HMR).
const cache = globalThis as unknown as { _mongoClientPromise?: Promise<MongoClient> | null };

export async function getClient(): Promise<MongoClient> {
    // Reset on failure so a warm instance retries instead of reusing a rejected promise.
    cache._mongoClientPromise ??= new MongoClient(uri, options).connect().catch((err) => {
        cache._mongoClientPromise = null;
        throw err;
    });
    return cache._mongoClientPromise;
}
