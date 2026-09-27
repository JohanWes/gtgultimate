
import React, { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { Search, Send } from 'lucide-react';
import { clsx } from 'clsx';
import type { Game } from '../types';
import { initializeSearchIndex, search } from '../utils/searchIndex';

interface SearchInputProps {
    readonly games: Game[];
    readonly onGuess: (name: string) => void;
    readonly disabled: boolean;
    readonly autoFocus?: boolean;
    readonly correctAnswers?: string[];
    readonly hideResults?: boolean;
    readonly onHorseTrigger?: () => void;
}

type SearchResultItem =
    | { type: 'game'; game: Game }
    | { type: 'special'; label: string; value: 'Horse' };

export function SearchInput({ games, onGuess, disabled, autoFocus, correctAnswers, hideResults, onHorseTrigger }: SearchInputProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [displayValue, setDisplayValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const skipNextFocus = useRef(false);
    // Per-mount seed for the stable pseudo-random order of the top results (keeps render pure)
    const [shuffleSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
    // Search runs on the deferred query so typing never waits on Fuse
    const deferredQuery = useDeferredValue(searchQuery);

    // Auto-focus when enabled, but check for touch devices to avoid keyboard popping up
    useEffect(() => {
        if (!disabled && autoFocus && inputRef.current) {
            // Check if device supports touch (likely mobile/tablet)
            const isTouch = window.matchMedia('(pointer: coarse)').matches;
            if (isTouch) return;

            // Small timeout to ensure DOM is ready and prevent fighting with other focus events
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [disabled, autoFocus]);

    // Initialize search index
    useMemo(() => {
        initializeSearchIndex(games);
    }, [games]);

    const correctAnswerSet = useMemo(() => new Set(correctAnswers ?? []), [correctAnswers]);

    const results = useMemo(() => {
        if (!deferredQuery) return [];
        const allResults = search(deferredQuery);

        // Deduplicate by name (case-insensitive)
        const seen = new Set<string>();
        let ordered = allResults.filter(result => {
            const lowerName = result.name.toLowerCase();
            if (seen.has(lowerName)) {
                return false;
            }
            seen.add(lowerName);
            return true;
        });

        // If correct answers are in the results, mix them into the top 5 so they are not always first
        if (correctAnswerSet.size > 0) {
            const correctMatches = ordered.filter(result => correctAnswerSet.has(result.name));
            if (correctMatches.length > 0) {
                const otherMatches = ordered.filter(result => !correctAnswerSet.has(result.name));
                // Take enough other matches to fill up to 5 slots (or less if not enough results)
                const slotsNeeded = Math.max(0, 5 - correctMatches.length);
                const topPool = [...correctMatches, ...otherMatches.slice(0, slotsNeeded)];

                // Order the top pool by a seeded hash of the name (unpredictable, but stable per mount)
                const rank = (name: string) => {
                    let h = shuffleSeed;
                    for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 2654435761);
                    return h;
                };
                topPool.sort((a, b) => rank(a.name) - rank(b.name));

                ordered = [...topPool, ...otherMatches.slice(slotsNeeded)];
            }
        }

        // An exact match of the typed text always comes first, so Enter submits what was typed
        const typed = deferredQuery.trim().toLowerCase();
        const exactIndex = ordered.findIndex(result => result.name.toLowerCase() === typed);
        if (exactIndex > 0) {
            ordered = [ordered[exactIndex], ...ordered.slice(0, exactIndex), ...ordered.slice(exactIndex + 1)];
        }

        const gameResults = ordered.map(result => ({ type: 'game', game: result } as SearchResultItem));
        if (onHorseTrigger && deferredQuery.toLowerCase().includes('horse')) {
            gameResults.unshift({ type: 'special', label: 'Horse', value: 'Horse' });
        }

        return gameResults;
    }, [deferredQuery, correctAnswerSet, onHorseTrigger, shuffleSeed]);

    const showResults = isOpen && !hideResults && results.length > 0;

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

        // Only pick from the list when it is visible and up to date with the input
        if (showResults && deferredQuery === searchQuery) {
            const typed = displayValue.trim().toLowerCase();
            const exact = results.find(r => (r.type === 'game' ? r.game.name : r.label).toLowerCase() === typed);
            submitResult(exact ?? results[selectedIndex] ?? results[0]);
        } else if (displayValue) {
            if (onHorseTrigger && displayValue.trim().toLowerCase() === 'horse') {
                onHorseTrigger();
                setSearchQuery('');
                setDisplayValue('');
                setIsOpen(false);
                return;
            }

            // If exact match exists in database, allow it
            const potentialMatches = search(displayValue);
            const exactMatch = potentialMatches.find(g => g.name.toLowerCase() === displayValue.trim().toLowerCase());

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
        setSelectedIndex(0);
        setIsOpen(false);
        skipNextFocus.current = true;
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            if (results.length === 0) return;
            e.preventDefault();
            const nextIndex = (selectedIndex + 1) % results.length;
            setSelectedIndex(nextIndex);
            if (results[nextIndex]?.type === 'game') {
                setDisplayValue(results[nextIndex].game.name);
            } else if (results[nextIndex]?.type === 'special') {
                setDisplayValue(results[nextIndex].label);
            }
        } else if (e.key === 'ArrowUp') {
            if (results.length === 0) return;
            e.preventDefault();
            const prevIndex = (selectedIndex - 1 + results.length) % results.length;
            setSelectedIndex(prevIndex);
            if (results[prevIndex]?.type === 'game') {
                setDisplayValue(results[prevIndex].game.name);
            } else if (results[prevIndex]?.type === 'special') {
                setDisplayValue(results[prevIndex].label);
            }
        } else if (e.key === 'Escape') {
            if (showResults) {
                // Only close the dropdown; don't let the global Esc-to-skip fire too
                e.stopPropagation();
                setIsOpen(false);
            }
        }
    };

    const submitResult = (result: SearchResultItem) => {
        if (result.type === 'game') {
            submitGuess(result.game.name);
            return;
        }

        onHorseTrigger?.();
        setSearchQuery('');
        setDisplayValue('');
        setIsOpen(false);
    };

    const containerRef = useRef<HTMLDivElement>(null);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div ref={containerRef} className="relative w-full z-20">
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
                            setSelectedIndex(0);
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
                        className="w-full pl-11 pr-11 py-2.5 glass-panel rounded-xl text-base text-text ui-focus-ring transition-all shadow-lg placeholder:text-muted"
                    />
                    <button
                        type="submit"
                        disabled={disabled || !displayValue}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-white disabled:opacity-50 transition-colors ui-focus-ring rounded-md"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>

            {showResults && (
                <ul
                    ref={listRef}
                    className="search-results-panel absolute w-full mt-2 glass-panel-strong backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2"
                >
                    {results.map((result, idx) => {
                        const isSelected = idx === selectedIndex;
                        const buttonClass = isSelected
                            ? "bg-primary/25 text-white border-l-2 border-primary"
                            : "text-muted hover:bg-white/8 hover:text-white";
                        const label = result.type === 'game' ? result.game.name : result.label;

                        return (
                            <li key={result.type === 'game' ? result.game.id : result.value}>
                                <button
                                    onClick={() => result.type === 'game' ? fillQuery(result.game.name) : submitResult(result)}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 flex items-center justify-between transition-colors text-sm",
                                        buttonClass
                                    )}
                                >
                                    <span className="font-medium">{label}</span>
                                    {result.type === 'special' && (
                                        <span className="text-[10px] uppercase tracking-wider text-warning font-bold">Secret</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
