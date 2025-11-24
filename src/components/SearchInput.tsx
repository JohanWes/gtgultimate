
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
}

export function SearchInput({ games, onGuess, disabled }: SearchInputProps) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Initialize both search indexes
    useMemo(() => {
        initializeSearchIndex(games);
        // Convert games to searchable format for combined index
        const searchableGames = games.map(g => ({ id: g.id, name: g.name, isBait: false }));
        initializeCombinedSearchIndex(searchableGames);
    }, [games]);

    const results = useMemo(() => {
        if (!query) return [];
        const allResults = searchCombined(query);
        
        // Deduplicate by name (case-insensitive)
        const seen = new Set<string>();
        return allResults.filter(result => {
            const lowerName = result.name.toLowerCase();
            if (seen.has(lowerName)) {
                return false;
            }
            seen.add(lowerName);
            return true;
        });
    }, [query]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [results]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (disabled) return;

        if (results.length > 0 && isOpen) {
            handleSelect(results[selectedIndex].name);
        } else if (query) {
            // If exact match exists in database, allow it, otherwise ignore
            const exactMatch = games.find(g => g.name.toLowerCase() === query.toLowerCase());
            if (exactMatch) {
                handleSelect(exactMatch.name);
            }
        }
    };

    const handleSelect = (name: string) => {
        onGuess(name);
        setQuery('');
        setIsOpen(false);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
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
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        placeholder={disabled ? "Game Over" : "Type to search for a game..."}
                        className="w-full pl-11 pr-11 py-2.5 bg-surface/50 backdrop-blur border border-white/10 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-lg placeholder:text-muted/50"
                    />
                    <button
                        type="submit"
                        disabled={disabled || !query}
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
                                    onClick={() => handleSelect(game.name)}
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
