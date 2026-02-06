import { useCallback, useEffect, useState } from 'react';

type FullscreenDocument = Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
};

function getFullscreenElement(doc: FullscreenDocument) {
    return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function useFullscreen() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const doc = document as FullscreenDocument;
        const handleFullscreenChange = () => {
            setIsFullscreen(!!getFullscreenElement(doc));
        };

        handleFullscreenChange();
        doc.addEventListener('fullscreenchange', handleFullscreenChange);
        doc.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);

        return () => {
            doc.removeEventListener('fullscreenchange', handleFullscreenChange);
            doc.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
        };
    }, []);

    const toggleFullscreen = useCallback(async () => {
        if (typeof document === 'undefined') return;

        const doc = document as FullscreenDocument;
        try {
            if (!getFullscreenElement(doc)) {
                const element = document.documentElement as FullscreenElement;
                if (element.requestFullscreen) {
                    await element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    await element.webkitRequestFullscreen();
                }
            } else if (doc.exitFullscreen) {
                await doc.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
                await doc.webkitExitFullscreen();
            }
        } catch (err) {
            console.error('Error toggling fullscreen:', err);
        }
    }, []);

    return {
        isFullscreen,
        toggleFullscreen
    };
}
