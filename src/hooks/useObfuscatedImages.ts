import { useState, useEffect, useRef } from 'react';
import { getProxyImageUrl } from '../utils/api';

/**
 * A hook that takes an array of image URLs and returns an array of Blob URLs.
 * It lazy loads images as they are revealed and uses the proxy to hide original URLs.
 */
export function useObfuscatedImages(imageUrls: string[] | undefined, revealedCount: number = 5): string[] {
    const [blobs, setBlobs] = useState<string[]>([]);
    const blobsRef = useRef<string[]>([]);
    const processingRef = useRef<Set<number>>(new Set());
    const activeSourceKeyRef = useRef<string>("");
    const isComponentMountedRef = useRef(true);

    // Reset when the game changes (imageUrls change completely)
    // We use a string key to detect changes in the source array
    const sourceKey = JSON.stringify(imageUrls || []);

    // Track component mount status
    useEffect(() => {
        isComponentMountedRef.current = true;
        return () => { isComponentMountedRef.current = false; };
    }, []);

    // Reset state on new source
    useEffect(() => {
        activeSourceKeyRef.current = sourceKey;

        // Cleanup old blobs
        blobsRef.current.forEach(url => {
            if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });

        // Init new state
        blobsRef.current = new Array(imageUrls?.length || 0).fill('');
        processingRef.current.clear();
        setBlobs([...blobsRef.current]);

        return () => {
            blobsRef.current.forEach(url => {
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, [sourceKey]);

    useEffect(() => {
        if (!imageUrls || imageUrls.length === 0) return;

        const endIdx = Math.min(revealedCount, imageUrls.length);
        const currentSourceKey = sourceKey;

        const fetchImage = async (index: number) => {
            processingRef.current.add(index);

            const originalUrl = imageUrls[index];
            const proxyUrl = getProxyImageUrl(originalUrl);
            let resultUrl = originalUrl;

            try {
                const response = await fetch(proxyUrl);
                if (!response.ok) {
                    throw new Error(`Proxy returned status: ${response.status}`);
                }
                const blob = await response.blob();
                resultUrl = URL.createObjectURL(blob);
            } catch (err) {
                console.error('Failed to load image via proxy:', originalUrl, err);
                resultUrl = originalUrl; // Fallback
            }

            // Only update if component is mounted AND we are still on the same source
            if (isComponentMountedRef.current && activeSourceKeyRef.current === currentSourceKey) {
                blobsRef.current[index] = resultUrl;
                setBlobs([...blobsRef.current]);
            }

            processingRef.current.delete(index);
        };

        for (let i = 0; i < endIdx; i++) {
            // Fetch if empty (not loaded) and not currently processing
            if (blobsRef.current[i] === '' && !processingRef.current.has(i)) {
                fetchImage(i);
            }
        }

    }, [sourceKey, revealedCount, imageUrls]);

    return blobs;
}


