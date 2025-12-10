import { X, BookOpen } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const { settings, updateSetting, setIsTutorialOpen } = useSettings();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh] overflow-hidden">
                {/* Fixed Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 shrink-0">
                    <h2 className="text-2xl font-bold text-white">Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Close settings"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="font-medium text-white">Next Level on Enter</h3>
                            <p className="text-sm text-gray-400">Press Enter to go to the next level after a game ends</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.nextLevelOnEnter}
                                onChange={(e) => updateSetting('nextLevelOnEnter', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="font-medium text-white">Skip on Esc</h3>
                            <p className="text-sm text-gray-400">Press Esc to skip the current image (same as button)</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.skipOnEsc}
                                onChange={(e) => updateSetting('skipOnEsc', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="space-y-1">
                            <h3 className="font-medium text-white">Theme</h3>
                            <p className="text-sm text-gray-400">Select the game's visual style</p>
                        </div>
                        <select
                            value={settings.theme}
                            onChange={(e) => updateSetting('theme', e.target.value as 'default' | 'retro')}
                            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 w-40 ml-4"
                        >
                            <option value="default">Default</option>
                            <option value="retro">Retro</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="space-y-1">
                            <h3 className="font-medium text-white">Miniatures in Picture</h3>
                            <p className="text-sm text-gray-400">Show preview pictures inside the main image</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.miniaturesInPicture}
                                onChange={(e) => updateSetting('miniaturesInPicture', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="space-y-1">
                            <h3 className="font-medium text-white">Game Tutorial</h3>
                            <p className="text-sm text-gray-400">Learn how to play the game</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsTutorialOpen(true);
                                onClose();
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shrink-0 ml-4"
                        >
                            <BookOpen size={18} />
                            <span className="hidden sm:inline">Show Tutorial</span>
                            <span className="sm:hidden">Tutorial</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="space-y-1">
                            <h3 className="font-medium text-white">Admin Key</h3>
                            <p className="text-sm text-gray-400">Enter key to enable admin features</p>
                        </div>
                        <input
                            type="password"
                            value={settings.adminKey}
                            onChange={(e) => updateSetting('adminKey', e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 w-40 ml-4"
                            placeholder="Admin Key"
                        />
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="p-4 md:p-6 border-t border-white/10 bg-surface shrink-0 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors w-full sm:w-auto"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
