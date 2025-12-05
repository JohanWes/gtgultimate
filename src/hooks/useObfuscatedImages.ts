import { useState, useEffect } from 'react';

/**
 * A hook that takes an array of image URLs and returns an array of Blob URLs.
 * This obfuscates the original source URL from the DOM.
 */
export function useObfuscatedImages(imageUrls: string[] | undefined): string[] {
    const [blobUrls, setBlobUrls] = useState<string[]>([]);

    useEffect(() => {
        if (!imageUrls || imageUrls.length === 0) {
            setBlobUrls([]);
            return;
        }

        const fetchImages = async () => {
            // Create a map to keep track of this specific run to prevent race conditions
            let isMounted = true;

            try {
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
                    setBlobUrls(blobs);
                } else {
                    // Cleanup if unmounted before finishing
                    blobs.forEach(url => URL.revokeObjectURL(url));
                }
            } catch (error) {
                console.error('Error in useObfuscatedImages:', error);
                if (isMounted) setBlobUrls(imageUrls); // Fallback
            }

            return () => {
                isMounted = false;
            };
        };

        const cleanupPromise = fetchImages();

        return () => {
            // We can't synchronously cancel the fetch, but the cleanup logic inside fetchImages handle it.
            // However, we DO need to cleanup the *existing* blobUrls when the component unmounts or imageUrls change.
            // But we can't do it immediately here if we reuse the state for the new render.
            // Actually, the standard pattern for Blob URLs is to revoke them when you're done.
        };
    }, [imageUrls]);

    // Cleanup effect when the specific blob URLs in state change (e.g. from a previous render)
    useEffect(() => {
        return () => {
            blobUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [blobUrls]);

    return blobUrls;
}
