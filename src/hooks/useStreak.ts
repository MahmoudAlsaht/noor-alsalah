'use client';

import { useState, useCallback } from 'react';
import { format, subDays } from 'date-fns';
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
    lastPerfectDay: string | null;
    history: Record<string, boolean>;
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
 * Load and check streak data (for lazy init)
 */
function loadAndCheckStreak(): { data: StreakData; broken: boolean } {
    if (typeof window === 'undefined') {
        return {
            data: { currentStreak: 0, longestStreak: 0, lastPerfectDay: null, history: {} },
            broken: false,
        };
    }

    let data: StreakData = {
        currentStreak: 0,
        longestStreak: 0,
        lastPerfectDay: null,
        history: {},
    };

    try {
        const stored = localStorage.getItem(STREAK_KEY);
        if (stored) {
            data = JSON.parse(stored);
        }
    } catch {
        // Use defaults
    }

    const yesterday = getYesterdayKey();
    const today = getTodayKey();
    let broken = false;

    // Check if streak is broken
    if (data.currentStreak > 0 && data.lastPerfectDay !== today && data.lastPerfectDay !== yesterday) {
        broken = true;
        data = { ...data, currentStreak: 0 };
        localStorage.setItem(STREAK_KEY, JSON.stringify(data));
    }

    return { data, broken };
}

/**
 * Save streak data to localStorage
 */
function saveStreakData(data: StreakData): void {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

/**
 * useStreak Hook
 */
export function useStreak(): UseStreakReturn {
    // Lazy initialization with broken check
    const [streakData, setStreakData] = useState<StreakData>(() => loadAndCheckStreak().data);
    const [streakBroken, setStreakBroken] = useState(() => loadAndCheckStreak().broken);

    /**
     * Update streak when user completes 5/5 prayers
     */
    const updateStreak = useCallback(() => {
        const todayKey = getTodayKey();
        const trackerKey = `prayer-tracker-${todayKey}`;

        try {
            const trackerData = localStorage.getItem(trackerKey);
            if (!trackerData) return;

            const prayers = JSON.parse(trackerData);
            const completedCount = TRACKABLE_PRAYERS.filter((p) => prayers[p] === true).length;

            if (completedCount === TRACKABLE_PRAYERS.length) {
                setStreakData((prev) => {
                    const newData = { ...prev };

                    if (newData.lastPerfectDay !== todayKey) {
                        const yesterday = getYesterdayKey();

                        if (newData.lastPerfectDay === yesterday) {
                            newData.currentStreak += 1;
                        } else {
                            newData.currentStreak = 1;
                        }

                        newData.lastPerfectDay = todayKey;
                        newData.history[todayKey] = true;

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
