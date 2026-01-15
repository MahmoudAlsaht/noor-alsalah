'use client';

import { useState, useEffect } from 'react';

export interface PrayerAdjustments {
    fajr: number;
    sunrise: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
}

const DEFAULT_ADJUSTMENTS: PrayerAdjustments = {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 4, // Jordan default
    isha: 0
};

const STORAGE_KEY = 'prayer-adjustments-v1';

/**
 * Hook to manage prayer adjustments
 */
export function usePrayerAdjustments() {
    const [adjustments, setAdjustments] = useState<PrayerAdjustments>(DEFAULT_ADJUSTMENTS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from storage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setAdjustments({ ...DEFAULT_ADJUSTMENTS, ...JSON.parse(stored) });
            }
        } catch {
            // ignore
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save adjustments
    const saveAdjustments = (newAdjustments: PrayerAdjustments) => {
        setAdjustments(newAdjustments);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAdjustments));
        // Caller handles reload if needed
    };

    const resetDefaults = () => {
        saveAdjustments(DEFAULT_ADJUSTMENTS);
    };

    return {
        adjustments,
        saveAdjustments,
        resetDefaults,
        isLoaded
    };
}
