import React, { useState, useEffect, createContext, useContext } from 'react';

const STORAGE_KEY = 'guessthegame_settings';
const TUTORIAL_KEY = 'guessthegame_tutorial_seen';

export interface Settings {
    nextLevelOnEnter: boolean;
    skipOnEsc: boolean;
    adminKey: string;
    theme: 'default' | 'retro';
}

const DEFAULT_SETTINGS: Settings = {
    nextLevelOnEnter: false,
    skipOnEsc: false,
    adminKey: '',
    theme: 'default'
};

interface SettingsContextType {
    settings: Settings;
    updateSetting: (key: keyof Settings, value: boolean | string) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (isOpen: boolean) => void;
    // Tutorial state
    hasSeenTutorial: boolean;
    isTutorialOpen: boolean;
    setIsTutorialOpen: (isOpen: boolean) => void;
    markTutorialSeen: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        return DEFAULT_SETTINGS;
    });

    // Tutorial state
    const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean>(() => {
        try {
            return localStorage.getItem(TUTORIAL_KEY) === 'true';
        } catch {
            return false;
        }
    });
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);

    // Auto-open tutorial for first-time users (after a brief delay for smooth UX)
    useEffect(() => {
        if (!hasSeenTutorial) {
            const timer = setTimeout(() => {
                setIsTutorialOpen(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [hasSeenTutorial]);

    const markTutorialSeen = () => {
        setHasSeenTutorial(true);
        try {
            localStorage.setItem(TUTORIAL_KEY, 'true');
        } catch (e) {
            console.error('Failed to save tutorial state:', e);
        }
    };

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const updateSetting = (key: keyof Settings, value: boolean | string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSetting,
            isSettingsOpen,
            setIsSettingsOpen,
            hasSeenTutorial,
            isTutorialOpen,
            setIsTutorialOpen,
            markTutorialSeen
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
