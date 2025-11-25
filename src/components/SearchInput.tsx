
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Send } from 'lucide-react';
import { clsx } from 'clsx';
import type { Game } from '../types';
import { initializeSearchIndex } from '../utils/searchIndex';
import { initializeCombinedSearchIndex, searchCombined } from '../utils/baitGamesIndex';

interface SearchInputProps {
    readonly games: Game[];
    readonly onGuess: (name: string) => void;
    readonly disabled: boolean;
    readonly autoFocus?: boolean;
    readonly correctAnswers?: string[];
}

export function SearchInput({ games, onGuess, disabled, autoFocus, correctAnswers }: SearchInputProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [displayValue, setDisplayValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const skipNextFocus = useRef(false);

    // Auto-focus when enabled
    useEffect(() => {
        if (!disabled && autoFocus && inputRef.current) {
            // Small timeout to ensure DOM is ready and prevent fighting with other focus events
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [disabled, autoFocus]);

    // Initialize both search indexes
    useMemo(() => {
        initializeSearchIndex(games);
        // Convert games to searchable format for combined index
        const searchableGames = games.map(g => ({ id: g.id, name: g.name, isBait: false }));
        initializeCombinedSearchIndex(searchableGames);
    }, [games]);

    const results = useMemo(() => {
        if (!searchQuery) return [];
        const allResults = searchCombined(searchQuery);

        // Deduplicate by name (case-insensitive)
        const seen = new Set<string>();
        const uniqueResults = allResults.filter(result => {
            const lowerName = result.name.toLowerCase();
            if (seen.has(lowerName)) {
                return false;
            }
            seen.add(lowerName);
            return true;
        });

        // Prioritize correct answers if they exist in the results
        if (correctAnswers && correctAnswers.length > 0) {
            const correctMatches: typeof uniqueResults = [];
            const otherMatches: typeof uniqueResults = [];

            uniqueResults.forEach(result => {
                if (correctAnswers.includes(result.name)) {
                    correctMatches.push(result);
                } else {
                    otherMatches.push(result);
                }
            });

            // If we found correct matches, shuffle them into the top 5
            if (correctMatches.length > 0) {
                // Take enough other matches to fill up to 5 slots (or less if not enough results)
                const poolSize = 5;
                const slotsNeeded = Math.max(0, poolSize - correctMatches.length);
                const topOthers = otherMatches.slice(0, slotsNeeded);
                const remainingOthers = otherMatches.slice(slotsNeeded);

                // Combine and shuffle the top pool
                const topPool = [...correctMatches, ...topOthers];

                // Fisher-Yates shuffle for the top pool
                for (let i = topPool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [topPool[i], topPool[j]] = [topPool[j], topPool[i]];
                }

                return [...topPool, ...remainingOthers];
            }
        }

        return uniqueResults;
    }, [searchQuery, correctAnswers]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [results]);

    useEffect(() => {
        if (isOpen && listRef.current) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, isOpen]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (disabled) return;

        if (results.length > 0 && isOpen) {
            submitGuess(results[selectedIndex].name);
        } else if (displayValue) {
            // If exact match exists in database (real or bait), allow it
            const potentialMatches = searchCombined(displayValue);
            const exactMatch = potentialMatches.find(g => g.name.toLowerCase() === displayValue.toLowerCase());

            if (exactMatch) {
                submitGuess(exactMatch.name);
            }
        }
    };

    const submitGuess = (name: string) => {
        onGuess(name);
        setSearchQuery('');
        setDisplayValue('');
        setIsOpen(false);
    };

    const fillQuery = (name: string) => {
        setSearchQuery(name);
        setDisplayValue(name);
        setIsOpen(false);
        skipNextFocus.current = true;
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = (selectedIndex + 1) % results.length;
            setSelectedIndex(nextIndex);
            if (results[nextIndex]) {
                setDisplayValue(results[nextIndex].name);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = (selectedIndex - 1 + results.length) % results.length;
            setSelectedIndex(prevIndex);
            if (results[prevIndex]) {
                setDisplayValue(results[prevIndex].name);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative w-full z-20">
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-muted group-focus-within:text-primary transition-colors" size={18} />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={displayValue}
                        onChange={e => {
                            const val = e.target.value;
                            setSearchQuery(val);
                            setDisplayValue(val);
                            setIsOpen(true);
                        }}
                        onFocus={() => {
                            if (skipNextFocus.current) {
                                skipNextFocus.current = false;
                                return;
                            }
                            setIsOpen(true);
                        }}
                        onClick={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        placeholder={disabled ? "Game Over" : "Type to search for a game..."}
                        className="w-full pl-11 pr-11 py-2.5 bg-surface/50 backdrop-blur border border-white/10 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-lg placeholder:text-muted/50"
                    />
                    <button
                        type="submit"
                        disabled={disabled || !displayValue}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-white disabled:opacity-50 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>

            {isOpen && results.length > 0 && (
                <ul
                    ref={listRef}
                    className="absolute w-full mt-2 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2"
                >
                    {results.map((game, idx) => {
                        const isSelected = idx === selectedIndex;
                        const buttonClass = isSelected
                            ? "bg-primary/20 text-white"
                            : "text-muted hover:bg-white/5 hover:text-white";

                        return (
                            <li key={game.id}>
                                <button
                                    onClick={() => fillQuery(game.name)}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 flex items-center justify-between transition-colors text-sm",
                                        buttonClass
                                    )}
                                >
                                    <span className="font-medium">{game.name}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
