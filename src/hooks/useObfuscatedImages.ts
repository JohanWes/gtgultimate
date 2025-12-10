import { useState, useEffect, useRef } from 'react';

/**
 * A hook that takes an array of image URLs and returns an array of Blob URLs.
 * This obfuscates the original source URL from the DOM.
 * 
 * OPTIMIZATION: Loads images incrementally so the UI can display them as they arrive, 
 * rather than waiting for all of them to finish (which was causing LCP delays).
 */
export function useObfuscatedImages(imageUrls: string[] | undefined): (string | null)[] {
    // secure-key based on content to detect changes immediately
    const currentKey = JSON.stringify(imageUrls || []);

    // We need to keep track of mounted state to avoid setting state on unmounted components
    // and to handle cleanup correctly.
    const mountedRef = useRef(true);

    // Initialize with nulls so we can render loading states or partial content immediately
    const [blobs, setBlobs] = useState<(string | null)[]>(
        imageUrls ? new Array(imageUrls.length).fill(null) : []
    );

    // Track the current key in a ref so we can ignore stale async results
    const activeKeyRef = useRef(currentKey);

    useEffect(() => {
        mountedRef.current = true;
        activeKeyRef.current = currentKey;

        if (!imageUrls || imageUrls.length === 0) {
            setBlobs([]);
            return;
        }

        // Reset blobs slightly if the key changed (to clear old images), 
        // but try to keep the length consistent to avoid layout shift if possible
        setBlobs(new Array(imageUrls.length).fill(null));

        const fetchImage = async (url: string, index: number) => {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);

                // Only update if we are still mounted and this result is for the current set of images
                if (mountedRef.current && activeKeyRef.current === currentKey) {
                    setBlobs(prev => {
                        const next = [...prev];
                        // If there was a previous blob at this index (rare race condition), revoke it? 
                        // Actually, the cleanup effect handles the *previous render's* blobs. 
                        // For the same render cycle, we just overwrite.
                        next[index] = objectUrl;
                        return next;
                    });
                } else {
                    // Result came back too late or unmounted
                    URL.revokeObjectURL(objectUrl);
                }
            } catch (error) {
                console.error(`Failed to obfuscate image at index ${index}:`, url, error);
                // Fallback to original URL on failure
                if (mountedRef.current && activeKeyRef.current === currentKey) {
                    setBlobs(prev => {
                        const next = [...prev];
                        next[index] = url;
                        return next;
                    });
                }
            }
        };

        // Fire off all requests in parallel, but handle them individually
        imageUrls.forEach((url, index) => {
            fetchImage(url, index);
        });

        return () => {
            mountedRef.current = false;
        };
    }, [currentKey]); // Re-run when input URLs change

    // Cleanup effect: Revoke all created object URLs when the component unmounts 
    // or when the blobs state updates (to clean up replaced blobs).
    // Note: This is a bit tricky with incremental updates. We want to cleanup 
    // blobs that are *removed* from state.

    // Simpler approach for cleanup: Just track all blobs ever created by this hook instance
    // in a ref, and clean them up on unmount. 
    // However, react strict mode might double invoke. 

    // Let's stick to cleaning up what is currently in state when unmounting
    // or when the key changes.
    useEffect(() => {
        return () => {
            // We can't access the *latest* state here easily in the cleanup of the main effect 
            // without adding it to deps, which causes loops.
            // Instead, we trust that when `blobs` updates, the previous values might need cleanup?
            // No, standard `useEffect` cleanup runs before the *next* effect run.
        };
    }, []);

    // We need a separate effect to clean up blobs when they are replaced or unmounted.
    // It's safer to just track the previous blobs in a Ref for cleanup.
    const activeBlobsRef = useRef<(string | null)[]>([]);

    useEffect(() => {
        // Update ref whenever state changes so we know what to clean up later
        activeBlobsRef.current = blobs;
    }, [blobs]);

    useEffect(() => {
        return () => {
            // Cleanup all active blobs on unmount
            activeBlobsRef.current.forEach(url => {
                if (url && url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, []);

    return blobs;
}
