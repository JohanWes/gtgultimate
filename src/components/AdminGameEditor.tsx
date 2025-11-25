import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import type { Game } from '../types';
import { useSettings } from '../hooks/useSettings';

interface AdminGameEditorProps {
    isOpen: boolean;
    onClose: () => void;
    game: Game | null;
    onUpdate: (newName: string) => void;
}

export function AdminGameEditor({ isOpen, onClose, game, onUpdate }: AdminGameEditorProps) {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (game) {
            setName(game.name);
        }
    }, [game]);

    if (!isOpen || !game) return null;

    const { settings } = useSettings();

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
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-red-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <AlertTriangle className="text-red-500" size={24} />
                    <h2 className="text-2xl font-bold text-white">Admin Game Editor</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">
                            Game Name (ID: {game.id})
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                            placeholder="Enter game name..."
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
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
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
