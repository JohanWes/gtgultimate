import { useState, useEffect, useEffectEvent } from 'react';

/**
 * Turns proxy image URLs into Blob URLs so the original source URL is not in the DOM.
 *
 * All fetches go through a small module-level cache (proxy URL -> blob URL), shared by every
 * hook instance and by prefetchImages(). The cache owns blob URL revocation (on eviction).
 */

const MAX_CACHE_ENTRIES = 40;
const cache = new Map<string, Promise<string>>();
// Resolved entries, for synchronous lookup during render (instant swaps for cached images)
const ready = new Map<string, string>();

function loadImage(url: string, priority: RequestPriority = 'auto'): Promise<string> {
    const hit = cache.get(url);
    if (hit) {
        // Bump to most recently used
        cache.delete(url);
        cache.set(url, hit);
        return hit;
    }

    const promise: Promise<string> = fetch(url, { priority })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.blob();
        })
        .then(blob => {
            const objectUrl = URL.createObjectURL(blob);
            if (cache.get(url) === promise) ready.set(url, objectUrl);
            return objectUrl;
        })
        .catch(error => {
            console.error('Failed to obfuscate image:', url, error);
            if (cache.get(url) === promise) cache.delete(url); // allow a retry later
            return url; // Fallback to the proxy URL itself
        });

    cache.set(url, promise);
    while (cache.size > MAX_CACHE_ENTRIES) {
        const [oldestUrl, oldest] = cache.entries().next().value!;
        cache.delete(oldestUrl);
        ready.delete(oldestUrl);
        oldest.then(objectUrl => {
            if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
        });
    }
    return promise;
}

/** Warm the cache for images that will likely be shown soon. */
export function prefetchImages(urls: string[]) {
    urls.forEach(url => loadImage(url, 'low'));
}

export function isImageReady(url: string) {
    return ready.has(url);
}

/**
 * Returns one entry per input URL. When the URL list changes, each slot keeps showing its
 * previous blob until the replacement resolves (no blank frames on reveal / toggles).
 */
export function useObfuscatedImages(imageUrls: string[] | undefined, highPriorityIndex = 0): (string | null)[] {
    // Proxy URLs are query-encoded, so they never contain newlines
    const key = (imageUrls ?? []).join('\n');
    const [blobs, setBlobs] = useState<(string | null)[]>([]);

    // Drop stale blobs when the list is cleared (e.g. Double Trouble ends), so they don't flash later
    const [prevKey, setPrevKey] = useState(key);
    if (key !== prevKey) {
        setPrevKey(key);
        if (!key) setBlobs([]);
    }

    const getHighPriorityIndex = useEffectEvent(() => highPriorityIndex);

    useEffect(() => {
        if (!key) return;
        let active = true; // Ignore results that resolve after the URL list has changed again
        const highIndex = getHighPriorityIndex();

        key.split('\n').forEach((url, index) => {
            loadImage(url, index === highIndex ? 'high' : 'auto').then(objectUrl => {
                if (!active) return;
                setBlobs(prev => {
                    if (prev[index] === objectUrl) return prev;
                    const next = [...prev];
                    next[index] = objectUrl;
                    return next;
                });
            });
        });

        return () => {
            active = false;
        };
    }, [key]);

    if (!imageUrls) return [];
    return imageUrls.map((url, index) => ready.get(url) ?? blobs[index] ?? null);
}
