'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';

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
    timeFormat: '12h' | '24h';
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
    timeFormat: '12h',
};

const STORAGE_KEY = 'alarm-settings';

/**
 * Hook return type
 */
export interface UseAlarmSettingsReturn {
    settings: AlarmSettings;
    isLoading: boolean;
    updatePrayerSetting: (
        prayer: keyof Omit<AlarmSettings, 'firstFajrOffset' | 'playSound' | 'timeFormat'>,
        update: Partial<PrayerAlarmSettings>
    ) => void;
    setFirstFajrOffset: (minutes: number) => void;
    setPlaySound: (enabled: boolean) => void;
    setTimeFormat: (format: '12h' | '24h') => void;
    resetToDefaults: () => void;
}

/**
 * useAlarmSettings Hook
 * 
 * Manages per-prayer alarm preferences using Capacitor Preferences.
 */
export function useAlarmSettings(): UseAlarmSettingsReturn {
    const [settings, setSettings] = useState<AlarmSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialMount = useRef(true);

    // Load settings on mount
    useEffect(() => {
        const load = async () => {
            try {
                const { value } = await Preferences.get({ key: STORAGE_KEY });
                if (value) {
                    setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(value) });
                } else {
                    // MIGRATION: Check localStorage if no Preference found
                    if (typeof window !== 'undefined') {
                        const local = localStorage.getItem(STORAGE_KEY);
                        if (local) {
                            console.log('[Migration] Found settings in localStorage, migrating to Preferences');
                            const parsed = JSON.parse(local);
                            const merged = { ...DEFAULT_SETTINGS, ...parsed };
                            setSettings(merged);
                            // Save to Preferences immediately
                            await Preferences.set({
                                key: STORAGE_KEY,
                                value: JSON.stringify(merged),
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load settings', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Save settings when changed
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Debounce or just save
        const save = async () => {
            try {
                await Preferences.set({
                    key: STORAGE_KEY,
                    value: JSON.stringify(settings),
                });
            } catch (e) {
                console.error('Failed to save settings', e);
            }
        };
        save();
    }, [settings]);

    /**
     * Update a specific prayer's settings
     */
    const updatePrayerSetting = useCallback(
        (
            prayer: keyof Omit<AlarmSettings, 'firstFajrOffset' | 'playSound' | 'timeFormat'>,
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
     * Set time format
     */
    const setTimeFormat = useCallback((format: '12h' | '24h') => {
        setSettings((prev) => ({ ...prev, timeFormat: format }));
    }, []);

    /**
     * Reset to defaults
     */
    const resetToDefaults = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    return {
        settings,
        isLoading,
        updatePrayerSetting,
        setFirstFajrOffset,
        setPlaySound,
        setTimeFormat,
        resetToDefaults,
    };
}
