'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Alarm timing options
 */
export type AlarmTiming = 'atTime' | 'beforeEnd' | 'both' | 'none';

/**
 * Per-prayer alarm settings
 */
export interface PrayerAlarmSettings {
    enabled: boolean;
    timing: AlarmTiming;
    beforeEndMinutes: number; // Minutes before next prayer (end of current)
}

/**
 * Full alarm settings structure
 */
export interface AlarmSettings {
    fajr: PrayerAlarmSettings;
    fajrFirst: PrayerAlarmSettings; // First Adhan for Fajr (before true Fajr)
    dhuhr: PrayerAlarmSettings;
    asr: PrayerAlarmSettings;
    maghrib: PrayerAlarmSettings;
    isha: PrayerAlarmSettings;
    firstFajrOffset: number; // Minutes before true Fajr for first adhan
    playSound: boolean;
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: AlarmSettings = {
    fajr: { enabled: true, timing: 'atTime', beforeEndMinutes: 15 },
    fajrFirst: { enabled: false, timing: 'atTime', beforeEndMinutes: 0 },
    dhuhr: { enabled: true, timing: 'atTime', beforeEndMinutes: 15 },
    asr: { enabled: true, timing: 'atTime', beforeEndMinutes: 15 },
    maghrib: { enabled: true, timing: 'atTime', beforeEndMinutes: 15 },
    isha: { enabled: true, timing: 'atTime', beforeEndMinutes: 15 },
    firstFajrOffset: 10, // 10 minutes before true Fajr
    playSound: true,
};

const STORAGE_KEY = 'alarm-settings';

/**
 * Hook return type
 */
export interface UseAlarmSettingsReturn {
    settings: AlarmSettings;
    updatePrayerSetting: (
        prayer: keyof Omit<AlarmSettings, 'firstFajrOffset' | 'playSound'>,
        update: Partial<PrayerAlarmSettings>
    ) => void;
    setFirstFajrOffset: (minutes: number) => void;
    setPlaySound: (enabled: boolean) => void;
    resetToDefaults: () => void;
}

/**
 * Load settings from localStorage
 */
function loadSettings(): AlarmSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch {
        // Ignore errors
    }
    return DEFAULT_SETTINGS;
}

/**
 * useAlarmSettings Hook
 * 
 * Manages per-prayer alarm preferences:
 * - Enable/disable per prayer
 * - Timing: at prayer time, before end, or both
 * - First Fajr adhan support
 */
export function useAlarmSettings(): UseAlarmSettingsReturn {
    // Use lazy initialization to load from localStorage immediately
    const [settings, setSettings] = useState<AlarmSettings>(() => loadSettings());
    const isInitialMount = useRef(true);

    // Save to localStorage (but skip initial mount to prevent overwriting)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    /**
     * Update a specific prayer's settings
     */
    const updatePrayerSetting = useCallback(
        (
            prayer: keyof Omit<AlarmSettings, 'firstFajrOffset' | 'playSound'>,
            update: Partial<PrayerAlarmSettings>
        ) => {
            setSettings((prev) => ({
                ...prev,
                [prayer]: { ...prev[prayer], ...update },
            }));
        },
        []
    );

    /**
     * Set first Fajr offset
     */
    const setFirstFajrOffset = useCallback((minutes: number) => {
        setSettings((prev) => ({ ...prev, firstFajrOffset: minutes }));
    }, []);

    /**
     * Toggle sound
     */
    const setPlaySound = useCallback((enabled: boolean) => {
        setSettings((prev) => ({ ...prev, playSound: enabled }));
    }, []);

    /**
     * Reset to defaults
     */
    const resetToDefaults = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    return {
        settings,
        updatePrayerSetting,
        setFirstFajrOffset,
        setPlaySound,
        resetToDefaults,
    };
}
