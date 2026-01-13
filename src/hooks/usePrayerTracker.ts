'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Preferences } from '@capacitor/preferences';

/**
 * Prayer IDs that can be tracked (excludes sunrise)
 */
export const TRACKABLE_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type TrackablePrayer = typeof TRACKABLE_PRAYERS[number];

/**
 * Daily prayer record
 */
export interface PrayerRecord {
    [key: string]: boolean;
}

/**
 * Hook return type
 */
export interface UsePrayerTrackerReturn {
    prayersDone: PrayerRecord;
    togglePrayer: (prayerId: TrackablePrayer) => void;
    isPrayerDone: (prayerId: string) => boolean;
    completedCount: number;
    totalCount: number;
    completionPercentage: number;
    isLoading: boolean;
}

/**
 * Get storage key for today's date
 */
function getTodayKey(): string {
    return `prayer-tracker-${format(new Date(), 'yyyy-MM-dd')}`;
}

/**
 * usePrayerTracker Hook
 * 
 * Tracks which prayers have been performed today.
 * Persists to Capacitor Preferences with date-based keys.
 */
export function usePrayerTracker(): UsePrayerTrackerReturn {
    const [prayersDone, setPrayersDone] = useState<PrayerRecord>({});
    const [isLoading, setIsLoading] = useState(true);
    const isInitialMount = useRef(true);

    // Load prayers on mount
    useEffect(() => {
        const load = async () => {
            const key = getTodayKey();
            try {
                const { value } = await Preferences.get({ key });
                if (value) {
                    setPrayersDone(JSON.parse(value));
                } else {
                    // MIGRATION: Check localStorage
                    if (typeof window !== 'undefined') {
                        const local = localStorage.getItem(key);
                        if (local) {
                            console.log('[Migration] Found prayers in localStorage, migrating');
                            const parsed = JSON.parse(local);
                            setPrayersDone(parsed);
                            await Preferences.set({ key, value: local });
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load prayer tracker', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Save to Preferences when state changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const save = async () => {
            const key = getTodayKey();
            // Only save if we have data or if we want to deliberately save empty state
            if (Object.keys(prayersDone).length > 0) {
                await Preferences.set({ key, value: JSON.stringify(prayersDone) });
            }
        };
        save();
    }, [prayersDone]);

    /**
     * Toggle prayer completion status
     */
    const togglePrayer = useCallback((prayerId: TrackablePrayer) => {
        setPrayersDone((prev) => ({
            ...prev,
            [prayerId]: !prev[prayerId],
        }));
    }, []);

    /**
     * Check if specific prayer is done
     */
    const isPrayerDone = useCallback(
        (prayerId: string): boolean => {
            return prayersDone[prayerId] === true;
        },
        [prayersDone]
    );

    // Calculate statistics
    const completedCount = TRACKABLE_PRAYERS.filter(
        (p) => prayersDone[p] === true
    ).length;
    const totalCount = TRACKABLE_PRAYERS.length;
    const completionPercentage = Math.round((completedCount / totalCount) * 100);

    return {
        prayersDone,
        togglePrayer,
        isPrayerDone,
        completedCount,
        totalCount,
        completionPercentage,
        isLoading,
    };
}
