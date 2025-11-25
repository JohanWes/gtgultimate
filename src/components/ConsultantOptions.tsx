import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type { Game, ConsultantOption, ConsultantOptionsHandle } from '../types';
import { clsx } from 'clsx';
import confetti from 'canvas-confetti';

interface ConsultantOptionsProps {
    options: ConsultantOption[];
    correctGameId: number;
    onGuess: (game: Game) => void;
}

export const ConsultantOptions = forwardRef<ConsultantOptionsHandle, ConsultantOptionsProps>(
    ({ options, correctGameId, onGuess }, ref) => {
        const [selectedId, setSelectedId] = useState<number | string | null>(null);
        const [revealResult, setRevealResult] = useState<boolean>(false);
        // const [showSparkles, setShowSparkles] = useState<boolean>(false); // Removed old state

        // Refs for audio to avoid re-creating them
        const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});

        useImperativeHandle(ref, () => ({
            stopSounds: () => {
                for (const audio of Object.values(audioRef.current)) {
                    audio.pause();
                    audio.currentTime = 0;
                }
            }
        }));

        useEffect(() => {
            // Preload sounds if possible
            const soundMap: Record<string, string> = {
                'correct': 'correct-answer.mp3',
                'wrong': 'wrong-answer.mp3'
            };

            Object.entries(soundMap).forEach(([key, filename]) => {
                audioRef.current[key] = new Audio(`/sounds/${filename}`);
                audioRef.current[key].volume = 0.2;
            });
        }, []);

        const playSound = (type: 'correct' | 'wrong') => {
            try {
                const audio = audioRef.current[type];
                if (audio) {
                    audio.currentTime = 0;
                    audio.play().catch(() => {
                        // Ignore errors if file doesn't exist or interaction policy blocks it
                        console.log(`Could not play sound: ${type}`);
                    });
                }
            } catch (e) {
                console.error("Audio play error", e);
            }
        };

        const handleSelect = (option: ConsultantOption, e: React.MouseEvent<HTMLButtonElement>) => {
            if (selectedId) return; // Prevent multiple selections

            setSelectedId(option.id);

            // Capture button position for the effect
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (rect.left + rect.width / 2) / window.innerWidth;
            const y = (rect.top + rect.height / 2) / window.innerHeight;

            // 3 second delay before reveal
            setTimeout(() => {
                setRevealResult(true);

                const isCorrect = option.id === correctGameId;
                if (isCorrect) {
                    // Trigger grand confetti explosion
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { x, y },
                        colors: ['#FFD700', '#FFA500', '#FFFFFF'], // Gold, Orange, White
                        shapes: ['star', 'circle'],
                        scalar: 0.8, // Slightly smaller particles for "sparkle" look
                        gravity: 0.8,
                        ticks: 200,
                        zIndex: 1000,
                    });

                    // Add a second smaller burst for extra effect
                    setTimeout(() => {
                        confetti({
                            particleCount: 50,
                            spread: 100,
                            origin: { x, y },
                            colors: ['#FFD700', '#FFFFFF'],
                            shapes: ['star'],
                            scalar: 0.6,
                            startVelocity: 25,
                            gravity: 1,
                            ticks: 100,
                            zIndex: 1000,
                        });
                    }, 200);
                }
                playSound(isCorrect ? 'correct' : 'wrong');

                // Small delay after reveal before actually triggering the game logic
                // so the user can see the result color
                setTimeout(() => {
                    if ('isBait' in option) {
                        // It's a bait option. Create a dummy game object to register a wrong guess.
                        const baitGame = {
                            id: -1,
                            name: option.name,
                            year: 0,
                            platform: '',
                            genre: '',
                            rating: 0,
                            screenshots: [],
                            cover: null,
                            cropPositions: []
                        } as unknown as Game;

                        onGuess(baitGame);
                    } else {
                        onGuess(option);
                    }
                }, 1500);
            }, 3000);
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {options.map((option) => {
                    const isSelected = selectedId === option.id;
                    let stateClass = "bg-gray-800 border-gray-700 hover:bg-gray-700"; // Default

                    if (isSelected) {
                        if (!revealResult) {
                            // Selected, waiting for reveal (Orange/Yellowish)
                            stateClass = "bg-orange-600 border-orange-400 text-white animate-lifeline-pulse";
                        } else {
                            // Revealed
                            if (option.id === correctGameId) {
                                stateClass = "bg-green-600 border-green-400 text-white";
                            } else {
                                stateClass = "bg-red-600 border-red-400 text-white";
                            }
                        }
                    } else if (revealResult && option.id === correctGameId) {
                        // Show correct answer even if not selected (optional, but good for learning)
                        stateClass = "bg-green-600/50 border-green-400/50 text-white";
                    } else if (selectedId) {
                        // Dim other options when one is selected
                        stateClass = "bg-gray-800/50 border-gray-700/50 opacity-50";
                    }

                    return (
                        <button
                            key={option.id}
                            onClick={(e) => handleSelect(option, e)}
                            disabled={!!selectedId}
                            className={clsx(
                                "p-4 border rounded-xl text-left transition-all duration-300 relative overflow-visible",
                                stateClass,
                                !selectedId && "hover:scale-[1.02] active:scale-[0.98]"
                            )}
                        >
                            <span className="font-medium block relative z-10">{option.name}</span>
                        </button>
                    );
                })}
            </div>
        );
    }
);

ConsultantOptions.displayName = 'ConsultantOptions';
