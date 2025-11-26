import { useState, useEffect } from 'react';
import { X, AlertTriangle, Database } from 'lucide-react';
import type { Game } from '../types';
import { useSettings } from '../hooks/useSettings';
import { AdminMigrationDialog } from './AdminMigrationDialog';

interface AdminGameEditorProps {
    isOpen: boolean;
    onClose: () => void;
    game: Game | null;
    onUpdate: (newName: string) => void;
    onDelete?: () => void;
}

export function AdminGameEditor({ isOpen, onClose, game, onUpdate, onDelete }: AdminGameEditorProps) {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showMigrationDialog, setShowMigrationDialog] = useState(false);

    const { settings } = useSettings();

    useEffect(() => {
        if (game) {
            setName(game.name);
        }
    }, [game]);

    if (!isOpen || !game) return null;

    const handleSubmit = async (e: React.FormEvent) => {
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
                    id: game.id,
                    name: name,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update game');
            }

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
                body: JSON.stringify({
                    id: game.id,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete game');
            }

            const data = await response.json();
            if (data.success) {
                if (onDelete) {
                    onDelete();
                }
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        Edit Game
                        <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded">ID: {game.id}</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowMigrationDialog(true)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Database Tools"
                        >
                            <Database size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">
                                Game Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                placeholder="Enter game name..."
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                                <AlertTriangle size={16} />
                                {error}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex justify-between items-center pt-6 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
                            >
                                Delete Game
                            </button>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <div className="flex items-center gap-3 mb-2 text-red-400">
                                <AlertTriangle size={20} />
                                <h3 className="font-bold">Delete Game?</h3>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                Are you sure you want to permanently delete <span className="font-bold text-white">{game.name}</span>?
                                <br />
                                This action cannot be undone.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isLoading}
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Deleting...' : 'Yes, Delete It'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <AdminMigrationDialog
                isOpen={showMigrationDialog}
                onClose={() => setShowMigrationDialog(false)}
            />
        </div>
    );
}
