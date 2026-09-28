
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Lock, Maximize2, Minimize2, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Game } from '../types';
import { getDifficultyZoomBonus } from '../utils/endlessUtils';
import { useObfuscatedImages, prefetchImages, isImageReady } from '../hooks/useObfuscatedImages';
import { useSettings } from '../hooks/useSettings';
import { buildTransition, motionDurations } from '../utils/motion';

interface ScreenshotViewerProps {
    screenshots: string[];
    revealedCount: number; // 1 to 5
    status: 'playing' | 'won' | 'lost';
    cropPositions: Array<{ x: number; y: number }>;
    doubleTroubleGame?: Game;
    currentLevelIndex?: number;
    zoomOutActive?: boolean;
    miniaturesInPicture?: boolean;
    isLoading?: boolean;
    redactedRegions?: Record<number, Array<{ x: number; y: number; width: number; height: number }>>;
    nextGame?: Game; // Preloaded once the current images are in
}

// In-play zoom per screenshot: 500/400/300/200/100% plus the difficulty bonus
const BASE_ZOOMS = [500, 400, 300, 200, 100];
const getPlayZoom = (index: number, levelIndex: number) => (BASE_ZOOMS[index] ?? 100) + getDifficultyZoomBonus(levelIndex);

// Proxy URL for one screenshot (server crops around position at the given zoom)
const buildProxyUrl = (url: string, position: { x: number; y: number } | undefined, zoom: number) => {
    const params = new URLSearchParams({
        url: url,
        x: (position?.x || 50).toString(),
        y: (position?.y || 50).toString(),
        zoom: zoom.toString()
    });
    return `/api/image-proxy?${params.toString()}`;
};

export function ScreenshotViewer({ screenshots, revealedCount, status, cropPositions, doubleTroubleGame, currentLevelIndex = 0, zoomOutActive = false, miniaturesInPicture = false, isLoading = false, redactedRegions, nextGame }: ScreenshotViewerProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showCropped, setShowCropped] = useState(false);
    const { settings, updateSetting, hasSeenLockTip, markLockTipSeen } = useSettings();
    const isOverlayLocked = settings.miniaturesLocked;
    const [showTip, setShowTip] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    const getZoomScale = (index: number) => {
        // If Zoom Out lifeline is active, return 100% for all images
        if (zoomOutActive && status === 'playing') return 100;
        if (status === 'playing') return getPlayZoom(index, currentLevelIndex);
        // Game over: cropped view uses the gameplay zoom, except the 5th image which shows the full view
        if (showCropped && index < 4) return getPlayZoom(index, currentLevelIndex);
        return 100; // 100% - full image
    };

    // Generate effective URLs using the proxy
    const effectiveScreenshots = screenshots.map((url, idx) => buildProxyUrl(url, cropPositions[idx], getZoomScale(idx)));
    const effectiveDoubleTrouble = doubleTroubleGame
        ? doubleTroubleGame.screenshots.map((url, idx) => buildProxyUrl(url, doubleTroubleGame.cropPositions[idx], getZoomScale(idx)))
        : undefined;

    // Obfuscate images to prevent inspecting source
    const obfuscatedScreenshots = useObfuscatedImages(effectiveScreenshots, selectedIndex);
    const obfuscatedDoubleTrouble = useObfuscatedImages(effectiveDoubleTrouble);
    const levelTransitionKey = `${screenshots[0] ?? 'none'}:${currentLevelIndex}`;

    // Once the current images are in, warm the cache with this level's full-size reveal
    // and the next level's cropped screenshots, so neither shows a loading gap.
    const currentReady = !isLoading && effectiveScreenshots.length > 0 && effectiveScreenshots.every(isImageReady);
    const prefetchKey = currentReady
        ? [
            ...screenshots.map((url, idx) => buildProxyUrl(url, cropPositions[idx], 100)),
            ...(nextGame?.screenshots ?? []).map((url, idx) => buildProxyUrl(url, nextGame?.cropPositions?.[idx], getPlayZoom(idx, currentLevelIndex + 1)))
        ].join('\n')
        : '';
    useEffect(() => {
        if (prefetchKey) prefetchImages(prefetchKey.split('\n'));
    }, [prefetchKey]);

    // Auto-select the newly revealed screenshot
    useEffect(() => {
        setSelectedIndex(revealedCount - 1);
    }, [revealedCount]);

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

    // Helper to calculate redaction styles 
    const getRedactionStyle = (region: { x: number, y: number, width: number, height: number }, index: number, positions: Array<{ x: number, y: number }>) => {
        const zoom = getZoomScale(index);

        // If zoom is <= 100, we simply render percentage based on full image
        if (zoom <= 100) {
            return {
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`
            };
        }

        // If zoomed, we need to project coordinates
        // Logic must match Proxy cropping logic
        const zoomFactor = zoom / 100;
        const visiblePortion = 100 / zoomFactor;

        const centerX = positions[index]?.x || 50;
        const centerY = positions[index]?.y || 50;

        const viewLeft = centerX - (visiblePortion / 2);
        const viewTop = centerY - (visiblePortion / 2);

        return {
            left: `${(region.x - viewLeft) * zoomFactor}%`,
            top: `${(region.y - viewTop) * zoomFactor}%`,
            width: `${region.width * zoomFactor}%`,
            height: `${region.height * zoomFactor}%`
        };
    };

    return (
        <div className="space-y-3">
            {/* Main Image Stage */}
            <div
                className="relative aspect-video w-full bg-black/50 rounded-none sm:rounded-xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer"
                onClick={() => {
                    if (miniaturesInPicture) {
                        updateSetting('miniaturesLocked', !isOverlayLocked);
                        if (!hasSeenLockTip) markLockTipSeen();
                    }
                }}
            >
                {/* Main Image Layer */}
                {isLoading ? (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-surface/50">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <span className="text-muted font-bold tracking-wider">Loading games…</span>
                    </div>
                ) : (
                    <>
                        <motion.div
                            key={levelTransitionKey}
                            initial={{ opacity: shouldReduceMotion ? 1 : 0.6, scale: shouldReduceMotion ? 1 : 1.01, y: shouldReduceMotion ? 0 : 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={buildTransition(motionDurations.fast, !!shouldReduceMotion)}
                            className="absolute inset-0 w-full h-full"
                        >
                            <div
                                role="img"
                                aria-label={`Screenshot ${selectedIndex + 1}`}
                                style={{
                                    backgroundImage: obfuscatedScreenshots[selectedIndex] ? `url(${obfuscatedScreenshots[selectedIndex]})` : undefined,
                                    backgroundPosition: getZoomScale(selectedIndex) > 100 ? 'center' : `${cropPositions[selectedIndex]?.x || 50}% ${cropPositions[selectedIndex]?.y || 50}%`,
                                    backgroundSize: getZoomScale(selectedIndex) > 100 ? 'cover' : `${getZoomScale(selectedIndex)}%`,
                                    backgroundRepeat: 'no-repeat'
                                }}
                                className="absolute inset-0 w-full h-full transition-opacity duration-300"
                            />
                            {!obfuscatedScreenshots[selectedIndex] && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
                                </div>
                            )}

                            {/* Redaction Overlay - Only for main image */}
                            {redactedRegions && redactedRegions[selectedIndex] && redactedRegions[selectedIndex].map((region, idx) => (
                                <div
                                    key={`redaction-${idx}`}
                                    className="absolute bg-black pointer-events-none z-10"
                                    style={getRedactionStyle(region, selectedIndex, cropPositions)}
                                />
                            ))}
                        </motion.div>
                    </>
                )}

                {/* Double Trouble Overlay */}
                {doubleTroubleGame && obfuscatedDoubleTrouble[selectedIndex] && (
                    <div
                        role="img"
                        aria-label={`Double Trouble Screenshot ${selectedIndex + 1}`}
                        style={{
                            backgroundImage: `url(${obfuscatedDoubleTrouble[selectedIndex]})`,
                            backgroundPosition: getZoomScale(selectedIndex) > 100 ? 'center' : `${doubleTroubleGame.cropPositions[selectedIndex]?.x || 50}% ${doubleTroubleGame.cropPositions[selectedIndex]?.y || 50}%`,
                            backgroundSize: getZoomScale(selectedIndex) > 100 ? 'cover' : `${getZoomScale(selectedIndex)}%`,
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
                        className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 backdrop-blur px-4 py-2 rounded-lg text-xs font-bold border border-white/20 hover:border-white/40 ui-pressable ui-focus-ring z-20 flex items-center gap-2"
                        title={showCropped ? "Show full image" : "Show cropped image"}
                    >
                        {showCropped ? (
                            <>
                                <Maximize2 size={14} />
                                Full image
                            </>
                        ) : (
                            <>
                                <Minimize2 size={14} />
                                Cropped image
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
                        "absolute bottom-0 left-0 right-0 p-4 flex justify-center gap-2 transition-transform duration-300 transform z-30 overflow-x-auto no-scrollbar",
                        isOverlayLocked ? "translate-y-0" : "translate-y-full group-hover:translate-y-0"
                    )}>
                        {screenshots.map((_, idx) => {
                            const isRevealed = idx < revealedCount;
                            const isSelected = idx === selectedIndex;
                            const blobSrc = obfuscatedScreenshots[idx];

                            return (
                                <button
                                    key={`overlay-${idx}`}
                                    disabled={!isRevealed}
                                    aria-label={isRevealed ? `Show screenshot ${idx + 1}` : `Screenshot ${idx + 1}, locked`}
                                    aria-pressed={isSelected}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedIndex(idx);
                                    }}
                                    className={clsx(
                                        "relative w-20 sm:w-40 aspect-video rounded-md overflow-hidden border transition-all duration-300 flex-shrink-0",
                                        isSelected ? "border-primary ring-2 ring-primary/50 scale-110 z-10" : "border-white/20 hover:border-white/50 hover:scale-105",
                                        !isRevealed && "cursor-not-allowed opacity-50 grayscale"
                                    )}
                                >
                                    {isLoading ? (
                                        <div className="w-full h-full bg-white/5 animate-pulse" />
                                    ) : isRevealed ? (
                                        <div className="relative w-full h-full text-left">
                                            <div
                                                style={{
                                                    backgroundImage: blobSrc ? `url(${blobSrc})` : undefined,
                                                    backgroundPosition: getZoomScale(idx) > 100 ? 'center' : `${cropPositions[idx]?.x || 50}% ${cropPositions[idx]?.y || 50}%`,
                                                    backgroundSize: getZoomScale(idx) > 100 ? 'cover' : `${getZoomScale(idx)}%`, // Dynamic zoom
                                                    backgroundRepeat: 'no-repeat'
                                                }}
                                                className="absolute inset-0 w-full h-full"
                                            />
                                            {/* Redaction on thumbnails */}
                                            {redactedRegions && redactedRegions[idx] && redactedRegions[idx].map((region, rIdx) => (
                                                <div
                                                    key={`thumb-redaction-${rIdx}`}
                                                    className="absolute bg-black pointer-events-none"
                                                    style={getRedactionStyle(region, idx, cropPositions)}
                                                />
                                            ))}

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
                                        <div className="w-full h-full bg-surface/80 flex items-center justify-center">
                                            <Lock size={10} className="text-muted" aria-hidden="true" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Click-to-Lock Tip */}
                {miniaturesInPicture && !hasSeenLockTip && !isOverlayLocked && showTip && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none animate-in fade-in zoom-in duration-300">
                        <div className="bg-primary text-onPrimary px-4 py-2 rounded-full shadow-xl font-bold text-sm flex items-center gap-2">
                            <span>Click the image to pin the thumbnails</span>
                            <ArrowRight className="rotate-90" size={16} />
                        </div>
                    </div>
                )}
            </div>

            {/* Thumbnails (Standard Mode) */}
            {
                !miniaturesInPicture && (
                    <div className="grid grid-cols-5 gap-1.5 px-4 sm:px-0">
                        {screenshots.map((_, idx) => {
                            const isRevealed = idx < revealedCount;
                            const isSelected = idx === selectedIndex;
                            const blobSrc = obfuscatedScreenshots[idx];

                            return (
                                <button
                                    key={idx}
                                    disabled={!isRevealed}
                                    onClick={() => setSelectedIndex(idx)}
                                    aria-label={isRevealed ? `Show screenshot ${idx + 1}` : `Screenshot ${idx + 1}, locked`}
                                    aria-pressed={isSelected}
                                    className={clsx(
                                        "relative aspect-video rounded-lg overflow-hidden border transition-all duration-300",
                                        isSelected ? "border-primary ring-2 ring-primary/50 z-10" : "border-white/10 hover:border-white/30",
                                        "ui-focus-ring",
                                        !isRevealed && "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    {isLoading ? (
                                        <div className="w-full h-full bg-white/5 animate-pulse" />
                                    ) : isRevealed ? (
                                        <div className="relative w-full h-full overflow-hidden text-left">
                                            {/* Thumbnail Image */}
                                            <div
                                                style={{
                                                    backgroundImage: blobSrc ? `url(${blobSrc})` : undefined,
                                                    backgroundPosition: getZoomScale(idx) > 100 ? 'center' : `${cropPositions[idx]?.x || 50}% ${cropPositions[idx]?.y || 50}%`,
                                                    backgroundSize: getZoomScale(idx) > 100 ? 'cover' : `${getZoomScale(idx)}%`,
                                                    backgroundRepeat: 'no-repeat'
                                                }}
                                                className="absolute inset-0 w-full h-full"
                                            />
                                            {/* Redaction on thumbnails */}
                                            {redactedRegions && redactedRegions[idx] && redactedRegions[idx].map((region, rIdx) => (
                                                <div
                                                    key={`thumb-redaction-${rIdx}`}
                                                    className="absolute bg-black pointer-events-none"
                                                    style={getRedactionStyle(region, idx, cropPositions)}
                                                />
                                            ))}

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
                                            <Lock size={16} className="text-muted" aria-hidden="true" />
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
