'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { Preferences } from '@capacitor/preferences';
import { PrayerTimeEntry } from './usePrayerTimes';

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
 * Get storage key for a specific date
 */
function getDateKey(date: Date): string {
    return `prayer-tracker-${format(date, 'yyyy-MM-dd')}`;
}

/**
 * usePrayerTracker Hook
 * 
 * Tracks which prayers have been performed for a specific date.
 * Persists to Capacitor Preferences with date-based keys.
 * 
 * @param targetDate - The date to track prayers for (defaults to today)
 * @param currentPrayers - Optional array of today's prayers for auto-unmark logic
 */
export function usePrayerTracker(targetDate?: Date, currentPrayers?: PrayerTimeEntry[]): UsePrayerTrackerReturn {
    // Memoize dateToUse to prevent unnecessary re-renders
    const dateToUse = useMemo(() => targetDate || new Date(), [targetDate]);
    const dateKey = getDateKey(dateToUse);

    const [prayersDone, setPrayersDone] = useState<PrayerRecord>({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadedKey, setLoadedKey] = useState<string>(''); // NEW: Track what's actually loaded
    const isInitialMount = useRef(true);

    // Load prayers when date changes
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const { value } = await Preferences.get({ key: dateKey });
                if (value) {
                    setPrayersDone(JSON.parse(value));
                } else {
                    // MIGRATION: Check localStorage
                    if (typeof window !== 'undefined') {
                        const local = localStorage.getItem(dateKey);
                        if (local) {
                            const parsed = JSON.parse(local);
                            setPrayersDone(parsed);
                            await Preferences.set({ key: dateKey, value: local });
                        } else {
                            setPrayersDone({});
                        }
                    } else {
                        setPrayersDone({});
                    }
                }
                setLoadedKey(dateKey); // Mark as loaded for THIS key
            } catch (e) {
                console.error('Failed to load prayer tracker', e);
                setPrayersDone({});
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [dateKey]);

    // Save to Preferences when state changes
    useEffect(() => {
        // Don't save if it's the very first mount or if we are still loading/mismatched
        if (isInitialMount.current || isLoading || loadedKey !== dateKey) {
            if (isInitialMount.current) isInitialMount.current = false;
            return;
        }

        const save = async () => {
            // Always save the current state for the current loaded key
            await Preferences.set({ key: dateKey, value: JSON.stringify(prayersDone) });
        };
        save();
    }, [prayersDone, dateKey, isLoading, loadedKey]);

    // Auto-unmark logic: If a prayer is marked as done but its (adjusted) time is in the future
    useEffect(() => {
        if (isLoading || !currentPrayers || !isSameDay(dateToUse, new Date())) return;

        const now = new Date();
        let changed = false;
        const newPrayersDone = { ...prayersDone };

        TRACKABLE_PRAYERS.forEach((id) => {
            if (newPrayersDone[id]) {
                const prayer = currentPrayers.find(p => p.id === id);
                // If the prayer time is now in the future (due to adjustment), unmark it
                if (prayer && prayer.time > now) {
                    newPrayersDone[id] = false;
                    changed = true;
                }
            }
        });

        if (changed) {
            setPrayersDone(newPrayersDone);
        }
    }, [currentPrayers, prayersDone, isLoading, dateToUse]);

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
