import { useState, useEffect } from 'react';

/**
 * A hook that takes an array of image URLs and returns an array of Blob URLs.
 * This obfuscates the original source URL from the DOM.
 */
export function useObfuscatedImages(imageUrls: string[] | undefined): string[] {
    // secure-key based on content to detect changes immediately
    const currentKey = JSON.stringify(imageUrls || []);

    const [state, setState] = useState<{ key: string; blobs: string[] }>({
        key: currentKey,
        blobs: []
    });

    useEffect(() => {
        if (!imageUrls || imageUrls.length === 0) {
            setState({ key: currentKey, blobs: [] });
            return;
        }

        let isMounted = true;

        const fetchImages = async () => {
            try {
                // If the key has already changed while we were waiting to start, abort early
                // (Though the effect cleanup handles this usually, it's good to be explicit)

                const blobs = await Promise.all(
                    imageUrls.map(async (url) => {
                        try {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            return URL.createObjectURL(blob);
                        } catch (error) {
                            console.error('Failed to obfuscate image:', url, error);
                            return url; // Fallback to original URL on failure
                        }
                    })
                );

                if (isMounted) {
                    setState({ key: currentKey, blobs });
                } else {
                    // Cleanup if unmounted before finishing
                    blobs.forEach(url => {
                        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                    });
                }
            } catch (error) {
                console.error('Error in useObfuscatedImages:', error);
                if (isMounted) setState({ key: currentKey, blobs: imageUrls }); // Fallback
            }
        };

        fetchImages();

        return () => {
            isMounted = false;
        };
    }, [currentKey]); // Depend on the stringified key to re-run when content changes

    // Cleanup effect when the specific blob URLs in state change
    useEffect(() => {
        return () => {
            state.blobs.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [state.blobs]);

    // Derived return value:
    // If the state key doesn't match the current prop key, it means we are in a "stale" render
    // and the effect hasn't updated the state yet. Return empty to prevent flash of old images.
    if (state.key !== currentKey) {
        return [];
    }

    return state.blobs;
}
