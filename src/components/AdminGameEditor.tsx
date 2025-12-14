import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Search, Check, Image as ImageIcon, Download } from 'lucide-react';
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

type Mode = 'edit' | 'request';
type RequestStep = 'search' | 'review';

export function AdminGameEditor({ isOpen, onClose, game, onUpdate, onDelete }: AdminGameEditorProps) {
    const [mode, setMode] = useState<Mode>('edit');

    // Edit Mode State
    const [name, setName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Request Mode State
    const [requestStep, setRequestStep] = useState<RequestStep>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [foundGame, setFoundGame] = useState<any | null>(null);
    const [selectedScreenshots, setSelectedScreenshots] = useState<string[]>([]);

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
            setSelectedScreenshots([]);
            setSearchQuery('');

            if (game) {
                setName(game.name);
            }
        }
    }, [isOpen, game]);

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
                    id: game?.id,
                    name: name,
                }),
            });

            if (!response.ok) throw new Error('Failed to update game');

            const data = await response.json();
            if (data.success) {
                onUpdate(name);
                onClose();
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
                body: JSON.stringify({ id: game?.id }),
            });

            if (!response.ok) throw new Error('Failed to delete game');

            const data = await response.json();
            if (data.success) {
                if (onDelete) onDelete();
                onClose();
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


    const handleSearch = async (e: React.FormEvent, skipCheck = false) => {
        if (e && e.preventDefault) e.preventDefault();
        setIsLoading(true);
        setError(null);
        setFoundGame(null);
        setSimilarGames([]);

        try {
            const response = await fetch('/api/admin/request-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': settings.adminKey
                },
                body: JSON.stringify({ name: searchQuery, skipCheck }),
            });

            // 409 Conflict means potential duplicates
            if (response.status === 409) {
                const data = await response.json();
                setError(data.error);
                if (data.similarGames) {
                    setSimilarGames(data.similarGames);
                }
                return;
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to search game');
            }

            const data = await response.json();
            setFoundGame(data);
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
                // Determine visuals for max reached? No need, just restrict.
                // Or maybe replace the last one? Let's just block or do nothing.
                // Or maybe replacing FIFO? Simple block is less confusing.
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
                    gameData: foundGame,
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
                // Ideally refresh game list or something, but standard behavior is fine
                // Maybe show a toast
                alert(`Added ${data.game.name}!`);
                window.location.reload(); // Hard reload to fetch new games list
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={clsx(
                "bg-surface border border-white/10 rounded-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 relative",
                requestStep === 'review' ? "w-full max-w-4xl" : "w-full max-w-md"
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
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    {mode === 'edit' && game && (
                        <div className="text-xs text-gray-500 font-mono">
                            ID: {game.id}
                        </div>
                    )}
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto min-h-0 flex-1">
                    {mode === 'edit' && game ? (
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
                                    <p className="text-gray-300 text-sm">Permanently delete <span className="font-bold text-white">{game.name}</span>?</p>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                    <button onClick={handleDelete} disabled={isLoading} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">
                                        {isLoading ? 'Deleting...' : 'Confirm Delete'}
                                    </button>
                                </div>
                            </div>
                        )
                    ) : mode === 'edit' && !game ? (
                        <div className="text-center text-gray-400 py-8">Select a game to edit.</div>
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
                            ) : (
                                /* REVIEW STEP */
                                <div className="space-y-6">
                                    <div className="flex gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                        {foundGame?.cover ? (
                                            <img src={foundGame.cover} alt="Cover" className="w-24 h-32 object-cover rounded shadow-lg" />
                                        ) : (
                                            <div className="w-24 h-32 bg-gray-800 rounded flex items-center justify-center text-gray-600"><ImageIcon size={32} /></div>
                                        )}
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{foundGame?.name}</h3>
                                            <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-400">
                                                <span className="bg-white/10 px-2 py-0.5 rounded">{foundGame?.year}</span>
                                                <span className="bg-white/10 px-2 py-0.5 rounded">{foundGame?.platform}</span>
                                                <span className="bg-white/10 px-2 py-0.5 rounded">{foundGame?.genre}</span>
                                                <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">★ {foundGame?.rating}</span>
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
                                                                <Check className="text-white drop-shadow-md" size={32} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                        <button
                                            onClick={() => setRequestStep('search')}
                                            className="px-4 py-2 text-gray-400 hover:text-white"
                                        >
                                            Back to Search
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
                                        onClick={(e) => handleSearch(e, true)}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded transition-colors"
                                    >
                                        I'm sure, Search Anyway
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
