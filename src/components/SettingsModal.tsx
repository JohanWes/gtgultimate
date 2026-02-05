import { X, BookOpen } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSettings } from '../hooks/useSettings';
import { buildTransition, motionDurations } from '../utils/motion';

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const { settings, updateSetting, setIsTutorialOpen } = useSettings();
    const shouldReduceMotion = useReducedMotion();
    const overlayTransition = buildTransition(motionDurations.standard, !!shouldReduceMotion);
    const panelTransition = buildTransition(motionDurations.standard, !!shouldReduceMotion);

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
        >
            <motion.div
                className="glass-panel-strong rounded-xl max-w-md w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.97, y: shouldReduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.985, y: shouldReduceMotion ? 0 : 6 }}
                transition={panelTransition}
            >
                {/* Fixed Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 shrink-0">
                    <h2 className="text-2xl font-bold text-text font-display">Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-muted hover:text-text transition-colors ui-focus-ring rounded-md"
                        aria-label="Close settings"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="font-medium text-text">Next Level on Enter</h3>
                            <p className="text-sm text-muted">Press Enter to go to the next level after a game ends</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.nextLevelOnEnter}
                                onChange={(e) => updateSetting('nextLevelOnEnter', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="font-medium text-text">Skip on Esc</h3>
                            <p className="text-sm text-muted">Press Esc to skip the current image (same as button)</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.skipOnEsc}
                                onChange={(e) => updateSetting('skipOnEsc', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="space-y-1">
                            <h3 className="font-medium text-text">Theme</h3>
                            <p className="text-sm text-muted">Select the game's visual style</p>
                        </div>
                        <select
                            value={settings.theme}
                            onChange={(e) => updateSetting('theme', e.target.value as 'default' | 'retro' | 'midnight-black')}
                            className="bg-surface/60 border border-white/10 rounded px-3 py-1.5 text-text text-sm ui-focus-ring w-40 ml-4"
                        >
                            <option value="default">Default</option>
                            <option value="retro">Retro</option>
                            <option value="midnight-black">Midnight Black</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="space-y-1">
                            <h3 className="font-medium text-text">Miniatures in Picture</h3>
                            <p className="text-sm text-muted">Show preview pictures inside the main image</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.miniaturesInPicture}
                                onChange={(e) => updateSetting('miniaturesInPicture', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="space-y-1">
                            <h3 className="font-medium text-text">Game Tutorial</h3>
                            <p className="text-sm text-muted">Learn how to play the game</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsTutorialOpen(true);
                                onClose();
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:brightness-110 text-onPrimary rounded-lg font-medium transition-colors shrink-0 ml-4"
                        >
                            <BookOpen size={18} />
                            <span className="hidden sm:inline">Show Tutorial</span>
                            <span className="sm:hidden">Tutorial</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="space-y-1">
                            <h3 className="font-medium text-text">Admin Key</h3>
                            <p className="text-sm text-muted">Enter key to enable admin features</p>
                        </div>
                        <input
                            type="password"
                            value={settings.adminKey}
                            onChange={(e) => updateSetting('adminKey', e.target.value)}
                            className="bg-surface/60 border border-white/10 rounded px-3 py-1.5 text-text text-sm ui-focus-ring w-40 ml-4"
                            placeholder="Admin Key"
                        />
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="p-4 md:p-6 border-t border-white/10 bg-transparent shrink-0 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-text text-background font-bold rounded-lg hover:brightness-110 transition-colors w-full sm:w-auto ui-focus-ring"
                    >
                        Done
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
