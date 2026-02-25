import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import axios from 'axios';
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

    const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: { client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' },
    });

    if (!res.data.access_token) throw new Error('No access token in IGDB response');
    igdbToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000;
    return igdbToken!;
}

export async function igdbPost(endpoint: string, body: string, token: string): Promise<any[]> {
    const res = await axios.post(`https://api.igdb.com/v4/${endpoint}`, body, {
        headers: {
            'Client-ID': process.env.IGDB_CLIENT_ID!,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain',
        },
    });
    return res.data || [];
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
