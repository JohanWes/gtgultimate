const API_BASE_URL = '/api';

export interface HighScore {
    name: string;
    score: number;
    date: string;
    runId?: string;
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

export const submitHighScore = async (name: string, score: number, runId?: string): Promise<HighScore | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/highscores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, score, runId }),
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

export const getProxyImageUrl = (url: string): string => {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
};
