import {
    connectMongo, getIgdbToken, igdbPost,
    sleep, DB_NAME, COLLECTION,
} from './cleanup_utils.js';

// --- Config ---
const MIN_SCREENSHOTS = 5;
const MIN_RATING_COUNT = 15;       // enough votes to indicate recognizability
const MIN_AGGREGATED_RATING = 82;  // quality gate — critic score lower bound
const MAX_AGGREGATED_RATING = 98;  // cap — filter out suspicious 100s
const BATCH_SIZE = 500;        // IGDB max per request
const IGDB_DELAY = 300;        // ms between IGDB requests
const LOOKBACK_MONTHS = 12;

interface IgdbGame {
    id: number;
    name: string;
    first_release_date?: number;
    platforms?: { name: string }[];
    genres?: { name: string }[];
    summary?: string;
    aggregated_rating?: number;
    rating?: number;
    rating_count?: number;
    screenshots?: { url: string }[];
    cover?: { url: string };
    category?: number;
    version_parent?: number;
    parent_game?: number;
}

interface GameDoc {
    id: number;
    name: string;
    year: number;
    platform: string;
    genre: string;
    rating: number;
    screenshots: string[];
    cover: string | null;
    cropPositions: { x: number; y: number }[];
    synopsis: string;
    createdAt: Date;
}

// --- Roman numeral / digit normalization for duplicate detection ---
const ROMAN_MAP: [string, number][] = [
    ['XVIII', 18], ['XVII', 17], ['XVI', 16], ['XIII', 13], ['XIV', 14],
    ['XV', 15], ['XII', 12], ['XI', 11], ['VIII', 8], ['VII', 7],
    ['VI', 6], ['IV', 4], ['IX', 9], ['III', 3], ['II', 2], ['I', 1],
    ['X', 10],
];

function normalizeName(name: string): string {
    let n = name.toLowerCase().trim();
    n = n.replace(/['']/g, "'").replace(/[:\-–—]/g, ' ').replace(/[.!?,]/g, '');
    for (const [roman, digit] of ROMAN_MAP) {
        const regex = new RegExp(`\\b${roman.toLowerCase()}\\b`, 'gi');
        n = n.replace(regex, String(digit));
    }
    n = n.replace(/\s+/g, ' ').trim();
    return n;
}

// --- DLC/expansion name patterns ---
const DLC_PATTERNS = [
    /\bDLC\b/i,
    /\bexpansion\b/i,
    /\bseason pass\b/i,
    /\badd[\s-]?on\b/i,
    /\bsupplement(ary)?\b/i,
    /\bbonus content\b/i,
    /\bdigital deluxe\b/i,
    /\bdeluxe edition\b/i,
    /\bgold edition\b/i,
    /\bultimate edition\b/i,
    /\bcomplete edition\b/i,
    /\bgoty edition\b/i,
    /\bgame of the year edition\b/i,
    /\blegendary edition\b/i,
    /\bdefinitive edition\b/i,
    /\bpremium edition\b/i,
    /\bcollector'?s edition\b/i,
    /\bspecial edition\b/i,
    /\banniversary edition\b/i,
    /\b\+ all dlc\b/i,
];

function looksLikeDlcOrEdition(name: string): boolean {
    return DLC_PATTERNS.some(p => p.test(name));
}

function generateCropPositions(): { x: number; y: number }[] {
    return Array.from({ length: 5 }, () => ({
        x: Math.floor(Math.random() * 101),
        y: Math.floor(Math.random() * 101),
    }));
}

function igdbGameToDoc(g: IgdbGame): GameDoc | null {
    const screenshots = g.screenshots || [];
    if (screenshots.length < MIN_SCREENSHOTS) return null;

    const year = g.first_release_date
        ? new Date(g.first_release_date * 1000).getFullYear()
        : 0;

    if (year < 2000) return null;

    const selected = screenshots
        .slice(0, 5)
        .map(s => s.url.replace('t_thumb', 't_720p').replace('//', 'https://'));

    const cover = g.cover
        ? g.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
        : null;

    return {
        id: g.id,
        name: g.name,
        year,
        platform: g.platforms?.[0]?.name || 'Unknown',
        genre: g.genres?.[0]?.name || 'Unknown',
        rating: Math.round(g.aggregated_rating || g.rating || 0),
        screenshots: selected,
        cover,
        cropPositions: generateCropPositions(),
        synopsis: g.summary || '',
        createdAt: new Date(),
    };
}

async function main() {
    const dryRun = !process.argv.includes('--confirm');
    if (dryRun) {
        console.log('=== DRY RUN (pass --confirm to actually insert) ===\n');
    }

    const client = await connectMongo();
    try {
        const col = client.db(DB_NAME).collection(COLLECTION);
        const currentCount = await col.countDocuments();
        console.log(`Current DB count: ${currentCount}`);

        // Build dedup sets from existing games
        const existing = await col.find({}, { projection: { _id: 0, id: 1, name: 1 } }).toArray();
        const existingIds = new Set(existing.map(g => g.id));
        const existingNamesRaw = new Set(existing.map(g => (g.name as string).toLowerCase()));
        const existingNamesNorm = new Set(existing.map(g => normalizeName(g.name as string)));

        console.log(`Existing games: ${existingIds.size} IDs, ${existingNamesRaw.size} unique names`);

        // Calculate lookback window
        const now = Math.floor(Date.now() / 1000);
        const lookbackDate = now - (LOOKBACK_MONTHS * 30 * 24 * 3600);
        const lookbackReadable = new Date(lookbackDate * 1000).toISOString().split('T')[0];
        console.log(`\nLookback window: ${lookbackReadable} to now`);
        console.log(`Filters: aggregated_rating ${MIN_AGGREGATED_RATING}-${MAX_AGGREGATED_RATING}, screenshots >= ${MIN_SCREENSHOTS}\n`);

        const token = await getIgdbToken();
        const candidates: GameDoc[] = [];
        const skippedReasons: Record<string, number> = {
            category: 0, dupeId: 0, dupeName: 0, dupeNorm: 0,
            dlcName: 0, screenshots: 0, yearRange: 0,
        };

        console.log('Querying IGDB for recent popular games...');

        let offset = 0;
        let emptyBatches = 0;

        while (true) {
            const query = `
                fields id, name, first_release_date, platforms.name, genres.name, summary,
                       aggregated_rating, rating, rating_count, screenshots.url, cover.url,
                       category, version_parent, parent_game;
                where first_release_date >= ${lookbackDate}
                    & aggregated_rating >= ${MIN_AGGREGATED_RATING}
                    & aggregated_rating <= ${MAX_AGGREGATED_RATING}
                    & rating_count >= ${MIN_RATING_COUNT}
                    & screenshots != null
                    & version_parent = null
                    & parent_game = null;
                sort rating_count desc;
                limit ${BATCH_SIZE};
                offset ${offset};
            `;

            let results: IgdbGame[];
            try {
                results = await igdbPost('games', query, token);
            } catch (err: any) {
                console.error(`  IGDB error at offset ${offset}:`, err.response?.data || err.message);
                break;
            }

            if (results.length === 0) {
                emptyBatches++;
                if (emptyBatches >= 2) break;
                offset += BATCH_SIZE;
                await sleep(IGDB_DELAY);
                continue;
            }
            emptyBatches = 0;

            let batchAdded = 0;
            for (const g of results) {
                // Category filter: 0=main, 8=remake, 9=remaster
                const cat = g.category;
                if (cat !== undefined && cat !== 0 && cat !== 8 && cat !== 9) {
                    skippedReasons.category++;
                    continue;
                }

                if (looksLikeDlcOrEdition(g.name)) {
                    skippedReasons.dlcName++;
                    continue;
                }

                if (existingIds.has(g.id)) {
                    skippedReasons.dupeId++;
                    continue;
                }

                const lowerName = g.name.toLowerCase();
                if (existingNamesRaw.has(lowerName)) {
                    skippedReasons.dupeName++;
                    continue;
                }

                const normName = normalizeName(g.name);
                if (existingNamesNorm.has(normName)) {
                    skippedReasons.dupeNorm++;
                    continue;
                }

                const doc = igdbGameToDoc(g);
                if (!doc) {
                    if ((g.screenshots || []).length < MIN_SCREENSHOTS) skippedReasons.screenshots++;
                    else skippedReasons.yearRange++;
                    continue;
                }

                candidates.push(doc);
                existingIds.add(g.id);
                existingNamesRaw.add(lowerName);
                existingNamesNorm.add(normName);
                batchAdded++;
            }

            console.log(`  Offset ${offset}: ${results.length} results, ${batchAdded} new candidates (total: ${candidates.length})`);

            offset += BATCH_SIZE;
            await sleep(IGDB_DELAY);
        }

        console.log(`\nFound ${candidates.length} new games to add`);

        // Skip reasons
        console.log('\n=== Skip reasons ===');
        for (const [reason, count] of Object.entries(skippedReasons)) {
            if (count > 0) console.log(`  ${reason}: ${count}`);
        }

        // Show all candidates
        if (candidates.length > 0) {
            console.log('\n=== Games to add ===');
            for (let i = 0; i < candidates.length; i++) {
                const g = candidates[i];
                console.log(`  ${String(i + 1).padStart(3)}. ${g.name} (${g.year}) — ${g.platform} — ${g.genre} — rating: ${g.rating}`);
            }

            // Year distribution
            const yearDist: Record<number, number> = {};
            for (const g of candidates) {
                yearDist[g.year] = (yearDist[g.year] || 0) + 1;
            }
            console.log('\n=== Year distribution ===');
            for (const y of Object.keys(yearDist).sort()) {
                console.log(`  ${y}: ${yearDist[Number(y)]}`);
            }
        }

        if (dryRun) {
            console.log('\n=== DRY RUN — no changes made. Pass --confirm to insert. ===');
            return;
        }

        if (candidates.length === 0) {
            console.log('\nNo new games to insert.');
            return;
        }

        // Insert into MongoDB
        console.log(`\nInserting ${candidates.length} games into MongoDB...`);
        const result = await col.insertMany(candidates);
        console.log(`Inserted: ${result.insertedCount} games`);

        const finalCount = await col.countDocuments();
        console.log(`Final DB count: ${finalCount}`);

    } finally {
        await client.close();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
