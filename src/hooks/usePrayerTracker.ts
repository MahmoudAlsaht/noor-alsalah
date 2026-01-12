'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

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
}

/**
 * Get storage key for today's date
 */
function getTodayKey(): string {
    return `prayer-tracker-${format(new Date(), 'yyyy-MM-dd')}`;
}

/**
 * Load prayers from localStorage (for lazy init)
 */
function loadPrayers(): PrayerRecord {
    if (typeof window === 'undefined') return {};
    try {
        const stored = localStorage.getItem(getTodayKey());
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore parse errors
    }
    return {};
}

/**
 * usePrayerTracker Hook
 * 
 * Tracks which prayers have been performed today.
 * Persists to localStorage with date-based keys.
 */
export function usePrayerTracker(): UsePrayerTrackerReturn {
    // Lazy initialization from localStorage
    const [prayersDone, setPrayersDone] = useState<PrayerRecord>(() => loadPrayers());

    // Save to localStorage when state changes
    useEffect(() => {
        if (Object.keys(prayersDone).length > 0) {
            localStorage.setItem(getTodayKey(), JSON.stringify(prayersDone));
        }
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
    };
}
