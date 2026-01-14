'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
 */
export function usePrayerTracker(targetDate?: Date): UsePrayerTrackerReturn {
    // Memoize dateToUse to prevent unnecessary re-renders
    const dateToUse = useMemo(() => targetDate || new Date(), [targetDate]);
    const dateKey = getDateKey(dateToUse);

    const [prayersDone, setPrayersDone] = useState<PrayerRecord>({});
    const [isLoading, setIsLoading] = useState(true);
    const isInitialMount = useRef(true);
    const currentDateKeyRef = useRef(dateKey);

    // Load prayers when date changes
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const key = getDateKey(dateToUse);
            currentDateKeyRef.current = key;

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
                        } else {
                            // No data for this date - reset state
                            setPrayersDone({});
                        }
                    } else {
                        setPrayersDone({});
                    }
                }
            } catch (e) {
                console.error('Failed to load prayer tracker', e);
                setPrayersDone({});
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [dateKey, dateToUse]);

    // Save to Preferences when state changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const save = async () => {
            const key = currentDateKeyRef.current;
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
