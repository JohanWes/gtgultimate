import {
    connectMongo, getIgdbToken, igdbPost,
    sleep, DB_NAME, COLLECTION,
} from './cleanup_utils.js';

// --- Config ---
const MIN_SCREENSHOTS = 5;
const MIN_SCREENSHOTS_REFRESH = 1; // relaxed threshold when refreshing incomplete entries
const PLAYABLE_SCREENSHOTS = 5;    // api/games.ts filters out games with <5 screenshots
const MIN_RATING_COUNT = 15;       // enough votes to indicate recognizability
const MIN_AGGREGATED_RATING = 82;  // quality gate — critic score lower bound
const MAX_AGGREGATED_RATING = 98;  // cap — filter out suspicious 100s
const BATCH_SIZE = 500;        // IGDB max per request
const IGDB_DELAY = 300;        // ms between IGDB requests
const LOOKBACK_MONTHS = 12;
const REFRESH_BATCH_SIZE = 100; // IGDB id-list queries cap at 500; use 100 to keep payloads small

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

function igdbGameToDoc(g: IgdbGame, minScreenshots = MIN_SCREENSHOTS, createdAt: Date = new Date()): GameDoc | null {
    const screenshots = g.screenshots || [];
    if (screenshots.length < minScreenshots) return null;

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
        createdAt,
    };
}

// --- Incomplete-entry detection ---
// An existing DB entry is "incomplete" if its screenshots field is missing,
// not an array, or has fewer than the playable minimum of valid string URLs.
// The production games API (api/games.ts) silently drops such entries, so they
// are effectively invisible to players — safe candidates for a refresh.
function isEntryIncomplete(g: { screenshots?: unknown }): boolean {
    const shots = g.screenshots;
    if (!Array.isArray(shots)) return true;
    if (shots.length < PLAYABLE_SCREENSHOTS) return true;
    if (!shots.every(s => typeof s === 'string' && s.length > 0)) return true;
    return false;
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

        // Build dedup sets from existing games (also detect incomplete entries
        // eligible for a refresh, e.g. Pokopia which shipped without screenshots).
        const existing = await col.find(
            {},
            { projection: { _id: 0, id: 1, name: 1, screenshots: 1, createdAt: 1 } }
        ).toArray();
        const existingIds = new Set(existing.map(g => g.id));
        const existingNamesRaw = new Set(existing.map(g => (g.name as string).toLowerCase()));
        const existingNamesNorm = new Set(existing.map(g => normalizeName(g.name as string)));

        // Incomplete entries: missing/<5 screenshots → invisible in the app, safe to refresh.
        const incompleteIds = new Set<number>();
        const createdAtById = new Map<number, Date>();
        for (const g of existing) {
            if (isEntryIncomplete(g)) incompleteIds.add(g.id);
            if (g.createdAt instanceof Date) createdAtById.set(g.id, g.createdAt);
        }

        console.log(`Existing games: ${existingIds.size} IDs, ${existingNamesRaw.size} unique names`);
        console.log(`Incomplete entries (refresh candidates): ${incompleteIds.size}`);

        // Calculate lookback window
        const now = Math.floor(Date.now() / 1000);
        const lookbackDate = now - (LOOKBACK_MONTHS * 30 * 24 * 3600);
        const lookbackReadable = new Date(lookbackDate * 1000).toISOString().split('T')[0];
        console.log(`\nLookback window: ${lookbackReadable} to now`);
        console.log(`Filters: aggregated_rating ${MIN_AGGREGATED_RATING}-${MAX_AGGREGATED_RATING}, screenshots >= ${MIN_SCREENSHOTS}\n`);

        const token = await getIgdbToken();
        const candidates: GameDoc[] = [];
        const refreshes: GameDoc[] = [];
        const refreshedIds = new Set<number>();
        const skippedReasons: Record<string, number> = {
            category: 0, dupeId: 0, dupeName: 0, dupeNorm: 0,
            dlcName: 0, screenshots: 0, yearRange: 0,
            refreshScreenshots: 0, refreshYearRange: 0,
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
            let batchRefreshed = 0;
            for (const g of results) {
                // Refresh path takes priority: if this IGDB game's id matches an
                // existing incomplete DB entry, refresh it instead of skipping as
                // a dupe. Bypass category/DLC/name filters since the entry is
                // already curated and present in the DB.
                if (incompleteIds.has(g.id) && !refreshedIds.has(g.id)) {
                    const doc = igdbGameToDoc(
                        g,
                        MIN_SCREENSHOTS_REFRESH,
                        createdAtById.get(g.id) ?? new Date(),
                    );
                    if (!doc) {
                        if ((g.screenshots || []).length < MIN_SCREENSHOTS_REFRESH) skippedReasons.refreshScreenshots++;
                        else skippedReasons.refreshYearRange++;
                        console.log(`  Refresh skip: ${g.name} (id ${g.id}) — ${
                            (g.screenshots || []).length < MIN_SCREENSHOTS_REFRESH
                                ? `only ${(g.screenshots || []).length} screenshots`
                                : 'year out of range'
                        }`);
                        continue;
                    }
                    refreshes.push(doc);
                    refreshedIds.add(g.id);
                    if (doc.screenshots.length < PLAYABLE_SCREENSHOTS) {
                        console.log(`  Refresh WARN: ${g.name} (id ${g.id}) refreshed with only ${doc.screenshots.length} screenshots — still unplayable until IGDB has >= ${PLAYABLE_SCREENSHOTS}`);
                    }
                    batchRefreshed++;
                    continue;
                }

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

            console.log(`  Offset ${offset}: ${results.length} results, ${batchAdded} new, ${batchRefreshed} refreshed (total new: ${candidates.length}, refreshed: ${refreshes.length})`);

            offset += BATCH_SIZE;
            await sleep(IGDB_DELAY);
        }

        // --- Targeted refresh pass for incomplete entries not surfaced by the
        // lookback query (e.g. older games or titles outside the rating window).
        // Fetches each remaining incomplete id directly from IGDB.
        const remainingIncomplete = [...incompleteIds].filter(id => !refreshedIds.has(id));
        if (remainingIncomplete.length > 0) {
            console.log(`\nRefreshing ${remainingIncomplete.length} incomplete entries by id (not covered by lookback)...`);
            for (let i = 0; i < remainingIncomplete.length; i += REFRESH_BATCH_SIZE) {
                const slice = remainingIncomplete.slice(i, i + REFRESH_BATCH_SIZE);
                const idList = slice.join(',');
                const query = `
                    fields id, name, first_release_date, platforms.name, genres.name, summary,
                           aggregated_rating, rating, rating_count, screenshots.url, cover.url,
                           category, version_parent, parent_game;
                    where id = (${idList});
                    limit ${REFRESH_BATCH_SIZE};
                `;
                let results: IgdbGame[];
                try {
                    results = await igdbPost('games', query, token);
                } catch (err: any) {
                    console.error(`  IGDB error refreshing ids [${slice[0]}..${slice[slice.length - 1]}]:`, err.response?.data || err.message);
                    continue;
                }
                let batchRefreshed = 0;
                for (const g of results) {
                    const doc = igdbGameToDoc(
                        g,
                        MIN_SCREENSHOTS_REFRESH,
                        createdAtById.get(g.id) ?? new Date(),
                    );
                    if (!doc) {
                        if ((g.screenshots || []).length < MIN_SCREENSHOTS_REFRESH) skippedReasons.refreshScreenshots++;
                        else skippedReasons.refreshYearRange++;
                        console.log(`  Refresh skip: ${g.name} (id ${g.id}) — ${
                            (g.screenshots || []).length < MIN_SCREENSHOTS_REFRESH
                                ? `only ${(g.screenshots || []).length} screenshots`
                                : 'year out of range'
                        }`);
                        continue;
                    }
                    refreshes.push(doc);
                    refreshedIds.add(g.id);
                    if (doc.screenshots.length < PLAYABLE_SCREENSHOTS) {
                        console.log(`  Refresh WARN: ${g.name} (id ${g.id}) refreshed with only ${doc.screenshots.length} screenshots — still unplayable until IGDB has >= ${PLAYABLE_SCREENSHOTS}`);
                    }
                    batchRefreshed++;
                }
                console.log(`  ids ${slice[0]}..${slice[slice.length - 1]}: ${results.length} results, ${batchRefreshed} refreshed`);
                await sleep(IGDB_DELAY);
            }
        }

        console.log(`\nFound ${candidates.length} new games to add, ${refreshes.length} incomplete entries to refresh`);

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

        // Show refresh candidates
        if (refreshes.length > 0) {
            console.log('\n=== Incomplete entries to refresh (replace by id) ===');
            for (let i = 0; i < refreshes.length; i++) {
                const g = refreshes[i];
                const playable = g.screenshots.length >= PLAYABLE_SCREENSHOTS ? 'playable' : `WARN only ${g.screenshots.length} screenshots`;
                console.log(`  ${String(i + 1).padStart(3)}. ${g.name} (id ${g.id}, ${g.year}) — ${g.screenshots.length} screenshots — ${playable}`);
            }
        }

        if (dryRun) {
            console.log('\n=== DRY RUN — no changes made. Pass --confirm to insert/refresh. ===');
            return;
        }

        if (candidates.length === 0 && refreshes.length === 0) {
            console.log('\nNo new games to insert and no entries to refresh.');
            return;
        }

        // Insert new games into MongoDB
        if (candidates.length > 0) {
            console.log(`\nInserting ${candidates.length} new games into MongoDB...`);
            const result = await col.insertMany(candidates);
            console.log(`Inserted: ${result.insertedCount} games`);
        }

        // Refresh incomplete entries via id-keyed replaceOne (upsert safety net)
        if (refreshes.length > 0) {
            console.log(`\nRefreshing ${refreshes.length} incomplete entries (replaceOne by id)...`);
            const bulkOps = refreshes.map(doc => ({
                replaceOne: {
                    filter: { id: doc.id },
                    replacement: doc,
                    upsert: true,
                },
            }));
            const refreshResult = await col.bulkWrite(bulkOps);
            console.log(`Refreshed: ${refreshResult.modifiedCount} replaced, ${refreshResult.upsertedCount} upserted`);
        }

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
