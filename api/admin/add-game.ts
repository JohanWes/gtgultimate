
import clientPromise from '../_lib/mongodb.js';
import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function generateCropPositions(count: number) {
    return Array.from({ length: count }, () => ({
        x: Math.floor(Math.random() * 100),
        y: Math.floor(Math.random() * 100),
    }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Authentication
    const adminKey = req.headers['x-admin-key'];
    const envKey = process.env.ADMIN_KEY;

    if (!envKey) {
        return res.status(500).json({ error: 'Server misconfiguration: ADMIN_KEY not set' });
    }

    let authorized = false;
    if (adminKey && envKey) {
        try {
            const bufferA = Buffer.from(adminKey as string);
            const bufferB = Buffer.from(envKey);
            if (bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)) {
                authorized = true;
            }
        } catch { /* empty */ }
    }

    if (!authorized) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { gameData, selectedScreenshots } = req.body;
    if (!gameData || !selectedScreenshots || !Array.isArray(selectedScreenshots)) {
        return res.status(400).json({ error: 'Invalid data' });
    }

    if (selectedScreenshots.length !== 5) {
        return res.status(400).json({ error: 'Exactly 5 screenshots must be selected.' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('guessthegame');

        // Check availability (ID check)
        const existingGame = await db.collection('games').findOne({ id: gameData.id });
        if (existingGame) {
            return res.status(409).json({ error: 'Game already exists (ID match).' });
        }

        const cropPositions = generateCropPositions(5);

        const newGame = {
            id: gameData.id,
            name: gameData.name,
            year: gameData.year,
            platform: gameData.platform,
            genre: gameData.genre,
            synopsis: gameData.synopsis,
            rating: gameData.rating,
            screenshots: selectedScreenshots,
            cover: gameData.cover,
            cropPositions: cropPositions,
            redactedRegions: gameData.redactedRegions,
            createdAt: new Date()
        };

        await db.collection('games').insertOne(newGame);

        console.log(`Admin added new game: ${newGame.name}`);
        res.json({ success: true, game: newGame });

    } catch (err) {
        console.error('Error adding game:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
