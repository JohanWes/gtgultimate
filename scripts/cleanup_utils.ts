import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

// --- Constants ---
export const CLEANUP_DATA_DIR = path.join('scripts', 'cleanup_data');
export const DB_NAME = 'guessthegame';
export const COLLECTION = 'games';

// --- MongoDB ---
export async function connectMongo(): Promise<MongoClient> {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is required (set in .env or .env.local)');
    const client = new MongoClient(uri);
    await client.connect();
    return client;
}

// --- IGDB Auth ---
let igdbToken: string | null = null;
let tokenExpiry = 0;

export async function getIgdbToken(): Promise<string> {
    if (igdbToken && Date.now() < tokenExpiry) return igdbToken;

    const clientId = process.env.IGDB_CLIENT_ID;
    const clientSecret = process.env.IGDB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are required');
    }

    const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' });
    const res = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: 'POST' });
    if (!res.ok) throw new Error(`IGDB auth failed: HTTP ${res.status} ${await res.text()}`);
    const data = await res.json();

    if (!data.access_token) throw new Error('No access token in IGDB response');
    igdbToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    return igdbToken!;
}

export async function igdbPost(endpoint: string, body: string, token: string): Promise<any[]> {
    const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
        method: 'POST',
        headers: {
            'Client-ID': process.env.IGDB_CLIENT_ID!,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain',
        },
        body,
    });
    if (!res.ok) throw new Error(`IGDB ${endpoint} failed: HTTP ${res.status} ${await res.text()}`);
    return (await res.json()) || [];
}

// --- Helpers ---
export function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function readJson<T>(filePath: string): Promise<T> {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
}
