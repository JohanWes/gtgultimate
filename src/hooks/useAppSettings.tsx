// Context for managing user settings
import React, { useState, useEffect, createContext, useContext } from 'react';

const STORAGE_KEY = 'guessthegame_settings';

export interface Settings {
    nextLevelOnEnter: boolean;
    skipOnEsc: boolean;
}

const DEFAULT_SETTINGS: Settings = {
    nextLevelOnEnter: false,
    skipOnEsc: false,
};

interface SettingsContextType {
    settings: Settings;
    updateSetting: (key: keyof Settings, value: boolean) => void;
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

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const updateSetting = (key: keyof Settings, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting }
        }>
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
