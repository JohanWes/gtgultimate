const API_BASE_URL = '/api';

export interface HighScore {
    name: string;
    score: number;
    date: string;
}

export const fetchHighScores = async (): Promise<HighScore[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/highscores`);
        if (!response.ok) {
            throw new Error('Failed to fetch highscores');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching highscores:', error);
        return [];
    }
};

export const submitHighScore = async (name: string, score: number): Promise<HighScore | null> => {
    try {
        const secret = import.meta.env.VITE_HIGHSCORE_SECRET;
        if (!secret) {
            console.error('Highscore secret not configured');
            // Allow submission without secret if not configured? Or fail?
            // For now, let's assume it should exist. If not, the server might fail if it enforces it.
        }

        // Generate signature if secret exists
        let signature = '';
        if (secret) {
            const { generateSignature } = await import('./hash');
            signature = await generateSignature(score, secret);
        }

        const response = await fetch(`${API_BASE_URL}/highscores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, score, signature }),
        });
        if (!response.ok) {
            throw new Error('Failed to submit highscore');
        }
        return await response.json();
    } catch (error) {
        console.error('Error submitting highscore:', error);
        return null;
    }
};

/**
 * Converts an original IGDB image URL to a proxied URL
 * Original: https://images.igdb.com/igdb/image/upload/t_720p/example.jpg
 * Proxy: /api/image-proxy?path=t_720p/example.jpg
 */
export const getProxyImageUrl = (originalUrl: string): string => {
    // If it's already a blob or local, return as is
    if (originalUrl.startsWith('blob:') || originalUrl.startsWith('/')) {
        return originalUrl;
    }

    try {
        const urlObj = new URL(originalUrl);
        if (urlObj.hostname.includes('igdb.com')) {
            // Extract the path after /upload/
            const parts = urlObj.pathname.split('/upload/');
            if (parts.length > 1) {
                return `${API_BASE_URL}/image-proxy?path=${parts[1]}`;
            }
        }
    } catch (e) {
        // invalid url, return original
    }
    return originalUrl;
};
