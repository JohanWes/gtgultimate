import { useState } from 'react';
import { X, AlertTriangle, Database, CheckCircle, XCircle } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

interface AdminMigrationDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

interface MigrationResult {
    success: boolean;
    totalGames: number;
    updatedCount: number;
    shuffledCount: number;
    errorCount: number;
    message?: string;
}

export function AdminMigrationDialog({ isOpen, onClose }: AdminMigrationDialogProps) {
    const [confirmText, setConfirmText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<MigrationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { settings } = useSettings();

    const isConfirmed = confirmText.trim().toLowerCase() === 'i understand';

    const handleMigrate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/migrate-screenshots', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': settings.adminKey
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Migration failed');
            }

            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setConfirmText('');
        setResult(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-red-500/30 rounded-xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                >
                    <X size={24} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <Database className="text-red-500" size={28} />
                    <h2 className="text-2xl font-bold text-white">Migrate Screenshots</h2>
                </div>

                {!result ? (
                    <>
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-start gap-3 mb-3">
                                <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ Critical Database Operation</h3>
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        This will modify <span className="font-bold text-white">ALL {/* Will be filled from API */}games</span> in the database by:
                                    </p>
                                    <ul className="mt-2 ml-4 space-y-1 text-sm text-gray-300">
                                        <li>• Fetching 5 new screenshots from IGDB API</li>
                                        <li>• Shuffling existing screenshots if API fails</li>
                                        <li>• Generating new random crop positions</li>
                                    </ul>
                                    <p className="mt-3 text-sm font-bold text-red-400">
                                        A backup will be created automatically, but this operation affects the entire game database.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Type <span className="font-bold text-white">"I understand"</span> to proceed:
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                                    placeholder="I understand"
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleMigrate}
                                disabled={!isConfirmed || isLoading}
                                className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Migrating...' : 'Start Migration'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                {result.success ? (
                                    <CheckCircle className="text-green-400" size={24} />
                                ) : (
                                    <XCircle className="text-red-400" size={24} />
                                )}
                                <h3 className={`text-xl font-bold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                    {result.success ? 'Migration Complete!' : 'Migration Failed'}
                                </h3>
                            </div>

                            {result.message && (
                                <p className="text-gray-300 text-sm mb-3">{result.message}</p>
                            )}

                            {result.success && (
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="bg-black/30 rounded p-3">
                                        <div className="text-2xl font-bold text-white">{result.totalGames}</div>
                                        <div className="text-xs text-gray-400">Total Games</div>
                                    </div>
                                    <div className="bg-black/30 rounded p-3">
                                        <div className="text-2xl font-bold text-green-400">{result.updatedCount}</div>
                                        <div className="text-xs text-gray-400">New Screenshots</div>
                                    </div>
                                    <div className="bg-black/30 rounded p-3">
                                        <div className="text-2xl font-bold text-blue-400">{result.shuffledCount}</div>
                                        <div className="text-xs text-gray-400">Shuffled</div>
                                    </div>
                                    <div className="bg-black/30 rounded p-3">
                                        <div className="text-2xl font-bold text-red-400">{result.errorCount}</div>
                                        <div className="text-xs text-gray-400">Errors</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
