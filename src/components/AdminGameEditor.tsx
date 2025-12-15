import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Search, Image as ImageIcon, Download } from 'lucide-react';
import type { Game } from '../types';
import { useSettings } from '../hooks/useSettings';
import clsx from 'clsx';

interface AdminGameEditorProps {
    isOpen: boolean;
    onClose: () => void;
    game: Game | null;
    onUpdate: (newName: string) => void;
    onDelete?: () => void;
}

type Mode = 'edit' | 'request' | 'database';
type RequestStep = 'search' | 'review' | 'selection';

export function AdminGameEditor({ isOpen, onClose, game, onUpdate, onDelete }: AdminGameEditorProps) {
    const [mode, setMode] = useState<Mode>('edit');

    // Edit Mode State
    const [name, setName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Request Mode State
    const [requestStep, setRequestStep] = useState<RequestStep>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]); // NEW
    const [foundGame, setFoundGame] = useState<any | null>(null);
    const [selectedScreenshots, setSelectedScreenshots] = useState<string[]>([]);

    // New state for editing metadata during request
    const [editPlatform, setEditPlatform] = useState('');
    const [editGenre, setEditGenre] = useState('');
    const [editSynopsis, setEditSynopsis] = useState('');

    // Database Mode State
    const [dbSearchQuery, setDbSearchQuery] = useState('');
    const [dbSearchResults, setDbSearchResults] = useState<Game[]>([]);
    const [editingGameId, setEditingGameId] = useState<number | null>(null);

    // Edit Mode Extended State
    const [platform, setPlatform] = useState('');
    const [genre, setGenre] = useState('');

    // Shared State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [similarGames, setSimilarGames] = useState<string[]>([]);

    const { settings } = useSettings();

    useEffect(() => {
        if (isOpen) {
            // Reset states when opening
            setMode('edit');
            setRequestStep('search');
            setError(null);
            setFoundGame(null);
            setSearchResults([]);
            setSelectedScreenshots([]);
            setSearchQuery('');
            setEditPlatform('');
            setEditGenre('');
            setEditSynopsis('');
            setDbSearchQuery('');
            setDbSearchResults([]);
            setEditingGameId(null);

            if (game) {
                setName(game.name);
                setPlatform(game.platform);
                setGenre(game.genre);
            }
        }
    }, [isOpen, game]);

    // Effect to handle internal editing game override
    useEffect(() => {
        if (editingGameId && mode === 'edit') {
            const gameToEdit = dbSearchResults.find(g => g.id === editingGameId);
            if (gameToEdit) {
                setName(gameToEdit.name);
                setPlatform(gameToEdit.platform);
                setGenre(gameToEdit.genre);
            }
        } else if (game && mode === 'edit' && !editingGameId) {
            // Fallback to prop game if not editing a specific DB game
            setName(game.name);
            setPlatform(game.platform);
            setGenre(game.genre);
        }
    }, [mode, editingGameId, dbSearchResults, game]);

    if (!isOpen) return null;

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/update-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': settings.adminKey
                },
                body: JSON.stringify({
                    id: editingGameId || game?.id,
                    name: name,
                    platform: platform,
                    genre: genre
                }),
            });

            if (!response.ok) throw new Error('Failed to update game');

            const data = await response.json();
            if (data.success) {
                onUpdate(name);
                if (editingGameId) {
                    // Refresh DB search if we were editing from DB
                    handleDbSearch(new Event('submit') as any);
                    setMode('database');
                    setEditingGameId(null);
                } else {
                    onClose();
                }
            } else {
                setError(data.error || 'Unknown error');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/delete-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': settings.adminKey
                },
                body: JSON.stringify({ id: editingGameId || game?.id }),
            });

            if (!response.ok) throw new Error('Failed to delete game');

            const data = await response.json();
            if (data.success) {
                if (onDelete && !editingGameId) onDelete();
                if (editingGameId) {
                    handleDbSearch(new Event('submit') as any);
                    setMode('database');
                    setEditingGameId(null);
                } else {
                    onClose();
                }
            } else {
                setError(data.error || 'Unknown error');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();
        setIsLoading(true);
        setError(null);
        setFoundGame(null);
        setSearchResults([]);
        setSimilarGames([]);

        try {
            const response = await fetch('/api/admin/request-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': settings.adminKey
                },
                body: JSON.stringify({ name: searchQuery, mode: 'search' }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to search game');
            }

            const data = await response.json();
            if (data.results && data.results.length > 0) {
                setSearchResults(data.results);
                setRequestStep('selection');
            } else {
                setError('No games found matching your query.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectGame = async (igdbId: number, skipCheck = false) => {
        setIsLoading(true);
        setError(null);
        setFoundGame(null);

        try {
            const response = await fetch('/api/admin/request-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': settings.adminKey
                },
                body: JSON.stringify({ igdbId, mode: 'details', skipCheck }),
            });

            // 409 Conflict means potential duplicates
            if (response.status === 409) {
                const data = await response.json();
                setError(data.error);
                if (data.similarGames) {
                    setSimilarGames(data.similarGames);
                }
                // When we get a duplicate error, we should probably keep the ID so we can "Search Anyway"
                // But wait, "Search Anyway" uses handleSearch in the original code, but here we need to re-call handleSelectGame
                // I'll attach the ID to the error state or just use a closure? 
                // Using a closure in the render button is easiest.

                // Store the "pending" game data if available to retry
                if (data.gameData) {
                    setFoundGame(data.gameData); // HACK: temporarily store minimal data to know what ID to retry
                }
                return;
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to get game details');
            }

            const data = await response.json();
            setFoundGame(data);

            // Initialize edit fields
            setEditPlatform(data.platform || 'Unknown');
            setEditGenre(data.genre || 'Unknown');
            setEditSynopsis(data.synopsis || '');

            setRequestStep('review');
            setSelectedScreenshots(data.availableScreenshots.slice(0, 5));

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleScreenshot = (url: string) => {
        if (selectedScreenshots.includes(url)) {
            setSelectedScreenshots(prev => prev.filter(s => s !== url));
        } else {
            if (selectedScreenshots.length >= 5) {
                return;
            }
            setSelectedScreenshots(prev => [...prev, url]);
        }
    };

    const handleAddGame = async () => {
        if (selectedScreenshots.length !== 5) {
            setError('Please select exactly 5 screenshots');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/add-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': settings.adminKey
                },
                body: JSON.stringify({
                    gameData: {
                        ...foundGame,
                        platform: editPlatform,
                        genre: editGenre,
                        synopsis: editSynopsis
                    },
                    selectedScreenshots
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save game');
            }

            const data = await response.json();
            if (data.success) {
                onClose();
                alert(`Added ${data.game.name}!`);
                window.location.reload();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDbSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/search-local', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': settings.adminKey
                },
                body: JSON.stringify({ query: dbSearchQuery }),
            });

            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();
            setDbSearchResults(data);
        } catch {
            setError('Failed to search database');
        } finally {
            setIsLoading(false);
        }
    };

    const startEditingKey = (gameData: Game) => {
        setEditingGameId(gameData.id);
        setMode('edit');
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={clsx(
                "bg-surface border border-white/10 rounded-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 relative",
                (requestStep === 'review' || requestStep === 'selection') ? "w-full max-w-4xl" : "w-full max-w-md"
            )}>
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-4">
                            {/* Tabs */}
                            <button
                                onClick={() => setMode('edit')}
                                className={clsx(
                                    "text-lg font-bold transition-colors",
                                    mode === 'edit' ? "text-white" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                Edit Game
                            </button>
                            <span className="text-gray-600">|</span>
                            <button
                                onClick={() => setMode('request')}
                                className={clsx(
                                    "text-lg font-bold transition-colors",
                                    mode === 'request' ? "text-white" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                Request Game
                            </button>
                            <span className="text-gray-600">|</span>
                            <button
                                onClick={() => setMode('database')}
                                className={clsx(
                                    "text-lg font-bold transition-colors",
                                    mode === 'database' ? "text-white" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                Check DB
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    {mode === 'edit' && (
                        <div className="text-xs text-gray-500 font-mono">
                            ID: {editingGameId || (game ? game.id : 'None')}
                        </div>
                    )}
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto min-h-0 flex-1">
                    {mode === 'edit' ? (
                        (game || editingGameId) ? (
                            // ... (Edit mode content remains same for now)
                            !showDeleteConfirm ? (
                                <form onSubmit={handleUpdate} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-400">Game Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-400">Platform</label>
                                        <input
                                            type="text"
                                            value={platform}
                                            onChange={(e) => setPlatform(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-400">Genre</label>
                                        <input
                                            type="text"
                                            value={genre}
                                            onChange={(e) => setGenre(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        />
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm font-medium"
                                        >
                                            Delete Game
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50"
                                        >
                                            {isLoading ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2"><AlertTriangle size={20} /> Delete Game?</h3>
                                        <p className="text-gray-300 text-sm">Permanently delete <span className="font-bold text-white">{name}</span>?</p>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                        <button onClick={handleDelete} disabled={isLoading} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">
                                            {isLoading ? 'Deleting...' : 'Confirm Delete'}
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="text-center text-gray-400 py-8">Select a game to edit.</div>
                        )
                    ) : mode === 'database' ? (
                        /* DATABASE MODE */
                        <div className="space-y-6">
                            <form onSubmit={handleDbSearch} className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={dbSearchQuery}
                                        onChange={(e) => setDbSearchQuery(e.target.value)}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Search local database..."
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="px-6 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50"
                                    >
                                        <Search size={20} />
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-2">
                                {dbSearchResults.map((g) => (
                                    <div key={g.id} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            {g.cover && (
                                                <img src={g.cover} alt="" className="w-10 h-10 object-cover rounded" />
                                            )}
                                            <div>
                                                <div className="font-bold text-white">{g.name}</div>
                                                <div className="text-xs text-gray-400 flex gap-2">
                                                    <span>{g.platform}</span>
                                                    <span>•</span>
                                                    <span>{g.genre}</span>
                                                    <span>•</span>
                                                    <span>{g.year}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEditingKey(g)}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {dbSearchResults.length === 0 && !isLoading && (
                                    <div className="text-center text-gray-500 py-8">
                                        No games found or search not initiated.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* REQUEST MODE */
                        <div className="space-y-6">
                            {requestStep === 'search' ? (
                                <form onSubmit={handleSearch} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-400">Search for a Game</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                                placeholder="e.g. The Witcher 3"
                                                autoFocus
                                            />
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={isLoading} className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50">
                                        {isLoading ? 'Searching...' : 'Search on IGDB'}
                                    </button>
                                </form>
                            ) : requestStep === 'selection' ? (
                                /* SELECTION STEP */
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-bold text-white">Select a Game</h3>
                                        <button
                                            onClick={() => setRequestStep('search')}
                                            className="px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded"
                                        >
                                            Back to Search
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
                                        {searchResults.map((result: any) => (
                                            <button
                                                key={result.id}
                                                onClick={() => handleSelectGame(result.id)}
                                                disabled={isLoading}
                                                className="flex items-start gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-left transition-colors"
                                            >
                                                {result.cover ? (
                                                    <img src={result.cover} alt="" className="w-16 h-20 object-cover rounded bg-black/50" />
                                                ) : (
                                                    <div className="w-16 h-20 bg-white/5 rounded flex items-center justify-center text-gray-600">
                                                        <ImageIcon size={20} />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-white line-clamp-1">{result.name}</div>
                                                    <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-2">
                                                        <span>{result.year || '????'}</span>
                                                        <span>•</span>
                                                        <span>{result.platform}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">{result.genre}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* REVIEW STEP */
                                <div className="space-y-6">
                                    <div className="flex gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                        {foundGame?.cover ? (
                                            <img src={foundGame.cover} alt="Cover" className="w-24 h-32 object-cover rounded shadow-lg" />
                                        ) : (
                                            <div className="w-24 h-32 bg-gray-800 rounded flex items-center justify-center text-gray-600"><ImageIcon size={32} /></div>
                                        )}
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-white mb-3">{foundGame?.name}</h3>

                                            <div className="grid grid-cols-2 gap-4 max-w-lg">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-500 uppercase">Platform</label>
                                                    <input
                                                        type="text"
                                                        value={editPlatform}
                                                        onChange={(e) => setEditPlatform(e.target.value)}
                                                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-500 uppercase">Genre</label>
                                                    <input
                                                        type="text"
                                                        value={editGenre}
                                                        onChange={(e) => setEditGenre(e.target.value)}
                                                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-3 space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase">Synopsis</label>
                                                <textarea
                                                    value={editSynopsis}
                                                    onChange={(e) => setEditSynopsis(e.target.value)}
                                                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-primary transition-colors h-24 resize-none"
                                                />
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-3 text-sm text-gray-400">
                                                <span className="bg-white/10 px-2 py-0.5 rounded" title="Year">{foundGame?.year}</span>
                                                <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded" title="Rating">★ {foundGame?.rating}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-sm font-medium text-gray-300">Select 5 Screenshots</label>
                                            <span className={clsx("text-sm font-bold", selectedScreenshots.length === 5 ? "text-green-400" : "text-orange-400")}>
                                                {selectedScreenshots.length} / 5 Selected
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                            {foundGame?.availableScreenshots.map((url: string, idx: number) => {
                                                const isSelected = selectedScreenshots.includes(url);
                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => toggleScreenshot(url)}
                                                        className={clsx(
                                                            "aspect-video rounded cursor-pointer relative group overflow-hidden border-2 transition-all",
                                                            isSelected ? "border-green-500 opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                                                        )}
                                                    >
                                                        <img src={url} alt={`Screenshot ${idx}`} className="w-full h-full object-cover" />
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center backdrop-blur-[1px]">
                                                                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-white">
                                                                    <span className="text-white text-2xl font-bold">{selectedScreenshots.indexOf(url) + 1}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                        <button
                                            onClick={() => setRequestStep('selection')}
                                            className="px-4 py-2 text-gray-400 hover:text-white"
                                        >
                                            Back to Selection
                                        </button>
                                        <button
                                            onClick={handleAddGame}
                                            disabled={isLoading || selectedScreenshots.length !== 5}
                                            className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <Download size={18} />
                                            {isLoading ? 'Saving...' : 'Import Game'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Error Message & Duplicates Warning */}
                {error && (
                    <div className="mx-6 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 text-sm font-bold mb-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>

                        {similarGames.length > 0 && (
                            <div className="mt-2 space-y-3">
                                <p className="text-gray-300 text-sm">
                                    Are you sure you want to add this game? It might already exist as:
                                </p>
                                <ul className="list-disc list-inside text-sm text-gray-400 pl-2">
                                    {similarGames.map((game, idx) => (
                                        <li key={idx} className="font-medium text-white">{game}</li>
                                    ))}
                                </ul>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => { setError(null); setSimilarGames([]); }}
                                        className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => foundGame && handleSelectGame(foundGame.id, true)}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded transition-colors"
                                    >
                                        I'm sure, Import Anyway
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

