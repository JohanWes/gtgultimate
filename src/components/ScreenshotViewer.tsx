
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Lock, Maximize2, Minimize2, ArrowRight } from 'lucide-react';
import type { Game } from '../types';
import { getDifficultyZoomBonus } from '../utils/endlessUtils';
import { useObfuscatedImages } from '../hooks/useObfuscatedImages';
import { useSettings } from '../hooks/useSettings';

interface ScreenshotViewerProps {
    screenshots: string[];
    revealedCount: number; // 1 to 5
    status: 'playing' | 'won' | 'lost';
    cropPositions: Array<{ x: number; y: number }>;
    doubleTroubleGame?: Game;
    currentLevelIndex?: number; // For difficulty scaling
    zoomOutActive?: boolean; // Whether Zoom Out lifeline is active
    miniaturesInPicture?: boolean;
}

export function ScreenshotViewer({ screenshots, revealedCount, status, cropPositions, doubleTroubleGame, currentLevelIndex = 0, zoomOutActive = false, miniaturesInPicture = false }: ScreenshotViewerProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showCropped, setShowCropped] = useState(false);
    const { settings, updateSetting, hasSeenLockTip, markLockTipSeen } = useSettings();
    const isOverlayLocked = settings.miniaturesLocked;
    const [showTip, setShowTip] = useState(false);

    // Obfuscate images to prevent inspecting source
    const obfuscatedScreenshots = useObfuscatedImages(screenshots);
    const obfuscatedDoubleTrouble = useObfuscatedImages(doubleTroubleGame?.screenshots);

    // Auto-select the newly revealed screenshot
    useEffect(() => {
        setSelectedIndex(revealedCount - 1);
    }, [revealedCount]);

    // Reset toggle when new game starts
    // Reset toggle when new game starts
    useEffect(() => {
        if (status === 'playing') {
            setShowCropped(false);
        }
    }, [status]);

    // Delay tip appearance
    useEffect(() => {
        if (!miniaturesInPicture || hasSeenLockTip || isOverlayLocked) {
            setShowTip(false);
            return;
        }

        const timer = setTimeout(() => {
            setShowTip(true);
        }, 10000);

        return () => clearTimeout(timer);
    }, [miniaturesInPicture, hasSeenLockTip, isOverlayLocked]);

    const getZoomScale = (index: number) => {
        // If Zoom Out lifeline is active, return 100% for all images
        if (zoomOutActive && status === 'playing') {
            return 100;
        }

        // If game is over and user wants to see cropped version
        if (status !== 'playing' && showCropped) {
            // Calculate difficulty bonus: +10% every 10 levels
            const difficultyBonus = getDifficultyZoomBonus(currentLevelIndex);

            // Use the same zoom levels as during gameplay
            switch (index) {
                case 0: return 500 + difficultyBonus;
                case 1: return 400 + difficultyBonus;
                case 2: return 300 + difficultyBonus;
                case 3: return 200 + difficultyBonus;
                default: return 100 + difficultyBonus;
            }
        }

        if (status !== 'playing') return 100; // 100% - full image

        // Calculate difficulty bonus: +10% every 10 levels
        const difficultyBonus = getDifficultyZoomBonus(currentLevelIndex);

        // Base zoom levels with difficulty scaling
        switch (index) {
            case 0: return 500 + difficultyBonus; // 500% -> 510% -> 520% etc.
            case 1: return 400 + difficultyBonus; // 400% -> 410% -> 420% etc.
            case 2: return 300 + difficultyBonus; // 300% -> 310% -> 320% etc.
            case 3: return 200 + difficultyBonus; // 200% -> 210% -> 220% etc.
            default: return 100 + difficultyBonus; // 100% -> 110% -> 120% etc.
        }
    };

    return (
        <div className="space-y-3">
            {/* Main Image Stage */}
            <div
                className="relative aspect-video w-full bg-black/50 rounded-xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer"
                onClick={() => {
                    if (miniaturesInPicture) {
                        updateSetting('miniaturesLocked', !isOverlayLocked);
                        if (!hasSeenLockTip) markLockTipSeen();
                    }
                }}
            >
                {/* Main Image Layer */}
                <div
                    role="img"
                    aria-label={`Screenshot ${selectedIndex + 1}`}
                    style={{
                        backgroundImage: obfuscatedScreenshots[selectedIndex] ? `url(${obfuscatedScreenshots[selectedIndex]})` : undefined,
                        backgroundPosition: `${cropPositions[selectedIndex]?.x || 50}% ${cropPositions[selectedIndex]?.y || 50}%`,
                        backgroundSize: `${getZoomScale(selectedIndex)}%`,
                        backgroundRepeat: 'no-repeat'
                    }}
                    className="absolute inset-0 w-full h-full transition-opacity duration-300"
                />

                {/* Double Trouble Overlay */}
                {doubleTroubleGame && obfuscatedDoubleTrouble[selectedIndex] && (
                    <div
                        role="img"
                        aria-label={`Double Trouble Screenshot ${selectedIndex + 1}`}
                        style={{
                            backgroundImage: `url(${obfuscatedDoubleTrouble[selectedIndex]})`,
                            backgroundPosition: `${doubleTroubleGame.cropPositions[selectedIndex]?.x || 50}% ${doubleTroubleGame.cropPositions[selectedIndex]?.y || 50}%`,
                            backgroundSize: `${getZoomScale(selectedIndex)}%`,
                            backgroundRepeat: 'no-repeat'
                        }}
                        className="absolute inset-0 w-full h-full opacity-50 pointer-events-none"
                    />
                )}

                {/* Toggle Button (only visible after game completion) */}
                {status !== 'playing' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowCropped(!showCropped);
                        }}
                        className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 backdrop-blur px-4 py-2 rounded-lg text-xs font-bold border border-white/20 hover:border-white/40 transition-all hover:scale-105 z-20 flex items-center gap-2"
                        title={showCropped ? "Show Full Image" : "Show Cropped Image"}
                    >
                        {showCropped ? (
                            <>
                                <Maximize2 size={14} />
                                Full Image
                            </>
                        ) : (
                            <>
                                <Minimize2 size={14} />
                                Cropped Image
                            </>
                        )}
                    </button>
                )}

                <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs font-medium border border-white/10 z-10">
                    Image {selectedIndex + 1} of 5
                </div>

                {/* Overlay Thumbnails (Miniatures in Picture Mode) */}
                {miniaturesInPicture && (
                    <div className={clsx(
                        "absolute bottom-0 left-0 right-0 p-4 flex justify-center gap-2 transition-transform duration-300 transform z-30 bg-gradient-to-t from-black/80 to-transparent pt-12",
                        isOverlayLocked ? "translate-y-0" : "translate-y-[80%] group-hover:translate-y-0"
                    )}>
                        {screenshots.map((_, idx) => {
                            const isRevealed = idx < revealedCount;
                            const isSelected = idx === selectedIndex;
                            const blobSrc = obfuscatedScreenshots[idx];

                            return (
                                <button
                                    key={`overlay-${idx}`}
                                    disabled={!isRevealed}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedIndex(idx);
                                    }}
                                    className={clsx(
                                        "relative w-40 aspect-video rounded-md overflow-hidden border transition-all duration-300 shadow-lg",
                                        isSelected ? "border-primary ring-2 ring-primary/50 scale-110 z-10" : "border-white/20 hover:border-white/50 hover:scale-105",
                                        !isRevealed && "cursor-not-allowed opacity-50 grayscale"
                                    )}
                                >
                                    {isRevealed ? (
                                        <div className="relative w-full h-full">
                                            <div
                                                style={{
                                                    backgroundImage: blobSrc ? `url(${blobSrc})` : undefined,
                                                    backgroundPosition: `${cropPositions[idx]?.x || 50}% ${cropPositions[idx]?.y || 50}%`,
                                                    backgroundSize: '150%', // Fixed zoom for thumbnails
                                                    backgroundRepeat: 'no-repeat'
                                                }}
                                                className="absolute inset-0 w-full h-full"
                                            />
                                            {doubleTroubleGame && obfuscatedDoubleTrouble[idx] && (
                                                <div
                                                    style={{
                                                        backgroundImage: `url(${obfuscatedDoubleTrouble[idx]})`,
                                                        backgroundPosition: `${doubleTroubleGame.cropPositions[idx]?.x || 50}% ${doubleTroubleGame.cropPositions[idx]?.y || 50}%`,
                                                        backgroundSize: '150%',
                                                        backgroundRepeat: 'no-repeat'
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-50"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-surface/80 flex items-center justify-center">
                                            <Lock size={10} className="text-white" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Click-to-Lock Tip */}
                {miniaturesInPicture && !hasSeenLockTip && !isOverlayLocked && showTip && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none animate-bounce">
                        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-xl font-bold text-sm border-2 border-white flex items-center gap-2">
                            <span>Click image to lock miniatures!</span>
                            <ArrowRight className="rotate-90" size={16} />
                        </div>
                    </div>
                )}
            </div>

            {/* Thumbnails (Standard Mode) */}
            {
                !miniaturesInPicture && (
                    <div className="grid grid-cols-5 gap-1.5">
                        {screenshots.map((_, idx) => {
                            const isRevealed = idx < revealedCount;
                            const isSelected = idx === selectedIndex;
                            const blobSrc = obfuscatedScreenshots[idx];

                            return (
                                <button
                                    key={idx}
                                    disabled={!isRevealed}
                                    onClick={() => setSelectedIndex(idx)}
                                    className={clsx(
                                        "relative aspect-video rounded-lg overflow-hidden border transition-all duration-300",
                                        isSelected ? "border-primary ring-2 ring-primary/50 scale-105 z-10" : "border-white/10 hover:border-white/30",
                                        !isRevealed && "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    {isRevealed ? (
                                        <div className="relative w-full h-full overflow-hidden">
                                            {/* Thumbnail Image */}
                                            <div
                                                style={{
                                                    backgroundImage: blobSrc ? `url(${blobSrc})` : undefined,
                                                    backgroundPosition: `${cropPositions[idx]?.x || 50}% ${cropPositions[idx]?.y || 50}%`,
                                                    backgroundSize: `${getZoomScale(idx)}%`,
                                                    backgroundRepeat: 'no-repeat'
                                                }}
                                                className="absolute inset-0 w-full h-full"
                                            />

                                            {/* Double Trouble Thumbnail Overlay */}
                                            {doubleTroubleGame && obfuscatedDoubleTrouble[idx] && (
                                                <div
                                                    style={{
                                                        backgroundImage: `url(${obfuscatedDoubleTrouble[idx]})`,
                                                        backgroundPosition: `${doubleTroubleGame.cropPositions[idx]?.x || 50}% ${doubleTroubleGame.cropPositions[idx]?.y || 50}%`,
                                                        backgroundSize: `${getZoomScale(idx)}%`,
                                                        backgroundRepeat: 'no-repeat'
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-50"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-surface flex items-center justify-center">
                                            <Lock size={16} className="text-muted" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )
            }
        </div >
    );
}

