// Fallback synopses for games without one in the DB. Loaded on demand so the ~1.3 MB JSON
// gets its own chunk instead of bloating the main bundle.
let synopsisPromise: Promise<Record<string, string>> | null = null;

export function loadSynopsis(): Promise<Record<string, string>> {
    synopsisPromise ??= import('../assets/synopsis.json')
        .then(m => m.default as Record<string, string>)
        .catch(err => {
            synopsisPromise = null; // allow a retry on the next mount
            throw err;
        });
    return synopsisPromise;
}
