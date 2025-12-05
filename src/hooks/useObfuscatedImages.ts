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

        let isMounted = true;

        const fetchImages = async () => {
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
        };

        fetchImages();

        return () => {
            isMounted = false;
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
