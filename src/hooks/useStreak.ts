'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, isSameDay } from 'date-fns';
import { TRACKABLE_PRAYERS } from './usePrayerTracker';

/**
 * Storage keys
 */
const STREAK_KEY = 'prayer-streak-data';

/**
 * Streak data structure
 */
interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastPerfectDay: string | null; // YYYY-MM-DD
    history: Record<string, boolean>; // date -> isPerfect (5/5)
}

/**
 * Hook return type
 */
export interface UseStreakReturn {
    currentStreak: number;
    longestStreak: number;
    updateStreak: () => void;
    streakBroken: boolean;
}

/**
 * Get today's date key
 */
function getTodayKey(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Get yesterday's date key
 */
function getYesterdayKey(): string {
    return format(subDays(new Date(), 1), 'yyyy-MM-dd');
}

/**
 * Load streak data from localStorage
 */
function loadStreakData(): StreakData {
    try {
        const stored = localStorage.getItem(STREAK_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore errors
    }
    return {
        currentStreak: 0,
        longestStreak: 0,
        lastPerfectDay: null,
        history: {},
    };
}

/**
 * Save streak data to localStorage
 */
function saveStreakData(data: StreakData): void {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

/**
 * useStreak Hook
 * 
 * Tracks consecutive days of completing all 5 prayers.
 * A "streak" is maintained when the user marks 5/5 prayers daily.
 */
export function useStreak(): UseStreakReturn {
    const [streakData, setStreakData] = useState<StreakData>(loadStreakData);
    const [streakBroken, setStreakBroken] = useState(false);

    // Check for broken streak on mount
    useEffect(() => {
        const data = loadStreakData();
        const yesterday = getYesterdayKey();
        const today = getTodayKey();

        // If we had a streak but yesterday wasn't perfect, it's broken
        if (data.currentStreak > 0 && data.lastPerfectDay !== today && data.lastPerfectDay !== yesterday) {
            setStreakBroken(true);
            // Reset streak
            data.currentStreak = 0;
            saveStreakData(data);
            setStreakData(data);
        }
    }, []);

    /**
     * Update streak when user completes 5/5 prayers
     */
    const updateStreak = useCallback(() => {
        // Check today's prayer tracker data
        const todayKey = getTodayKey();
        const trackerKey = `prayer-tracker-${todayKey}`;

        try {
            const trackerData = localStorage.getItem(trackerKey);
            if (!trackerData) return;

            const prayers = JSON.parse(trackerData);
            const completedCount = TRACKABLE_PRAYERS.filter((p) => prayers[p] === true).length;

            // Only update if 5/5 completed
            if (completedCount === TRACKABLE_PRAYERS.length) {
                setStreakData((prev) => {
                    const newData = { ...prev };

                    // Check if this is a new day
                    if (newData.lastPerfectDay !== todayKey) {
                        const yesterday = getYesterdayKey();

                        // If yesterday was perfect, continue streak
                        if (newData.lastPerfectDay === yesterday) {
                            newData.currentStreak += 1;
                        } else {
                            // Start new streak
                            newData.currentStreak = 1;
                        }

                        newData.lastPerfectDay = todayKey;
                        newData.history[todayKey] = true;

                        // Update longest streak
                        if (newData.currentStreak > newData.longestStreak) {
                            newData.longestStreak = newData.currentStreak;
                        }

                        saveStreakData(newData);
                        setStreakBroken(false);
                    }

                    return newData;
                });
            }
        } catch {
            // Ignore errors
        }
    }, []);

    return {
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        updateStreak,
        streakBroken,
    };
}
