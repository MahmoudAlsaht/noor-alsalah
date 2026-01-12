'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    PrayerTimes,
    CalculationMethod,
    CalculationParameters,
    Coordinates,
    Prayer,
} from 'adhan';
import { format, differenceInSeconds } from 'date-fns';

/**
 * Prayer names in Arabic for display
 */
export const PRAYER_NAMES: Record<string, string> = {
    fajr: 'الفجر',
    sunrise: 'الشروق',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
};

/**
 * Prayer time entry with formatted data
 */
export interface PrayerTimeEntry {
    id: string;
    nameAr: string;
    nameEn: string;
    time: Date;
    timeFormatted: string;
}

/**
 * Hook return type
 */
export interface UsePrayerTimesReturn {
    prayers: PrayerTimeEntry[];
    nextPrayer: PrayerTimeEntry | null;
    timeRemaining: string;
    currentDate: Date;
    isLoading: boolean;
}

/**
 * Irbid, Jordan coordinates (hardcoded for MVP)
 */
const IRBID_COORDINATES = new Coordinates(32.5568, 35.8469);

/**
 * Jordan Ministry of Awqaf calculation method (Custom)
 * Based on official Jordan parameters:
 * - Fajr angle: 18°
 * - Isha angle: 18°
 * - Madhab: Shafi (standard for Jordan)
 */
function getJordanMethod(): CalculationParameters {
    const params = new CalculationParameters('Other', 18, 18);
    // Jordan Ministry of Awqaf adds ~4 minutes to Maghrib (sunset) as safety buffer
    params.adjustments = {
        fajr: 0,
        sunrise: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 4,
        isha: 0,
    };
    return params;
}

const JORDAN_METHOD = getJordanMethod();

/**
 * Format seconds into "HH:MM:SS" countdown string
 */
function formatCountdown(totalSeconds: number): string {
    if (totalSeconds <= 0) return '00:00:00';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
        .map((n) => n.toString().padStart(2, '0'))
        .join(':');
}

/**
 * usePrayerTimes Hook
 * 
 * Calculates prayer times for Irbid, Jordan using the Jordan Ministry
 * of Awqaf calculation method. Returns formatted times and countdown
 * to the next prayer.
 */
export function usePrayerTimes(): UsePrayerTimesReturn {
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [isLoading, setIsLoading] = useState(true);

    // Update current date every second for countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDate(new Date());
        }, 1000);

        setIsLoading(false);
        return () => clearInterval(interval);
    }, []);

    // Calculate prayer times for today
    const prayerTimes = useMemo(() => {
        return new PrayerTimes(IRBID_COORDINATES, currentDate, JORDAN_METHOD);
    }, [currentDate.toDateString()]); // Only recalc on date change

    // Format prayers into array
    const prayers: PrayerTimeEntry[] = useMemo(() => {
        const prayerKeys: Array<{ key: keyof PrayerTimes; id: string }> = [
            { key: 'fajr', id: 'fajr' },
            { key: 'sunrise', id: 'sunrise' },
            { key: 'dhuhr', id: 'dhuhr' },
            { key: 'asr', id: 'asr' },
            { key: 'maghrib', id: 'maghrib' },
            { key: 'isha', id: 'isha' },
        ];

        return prayerKeys.map(({ key, id }) => {
            const time = prayerTimes[key] as Date;
            return {
                id,
                nameAr: PRAYER_NAMES[id],
                nameEn: id.charAt(0).toUpperCase() + id.slice(1),
                time,
                // Uses device locale settings (respects 12h/24h preference)
                timeFormatted: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
        });
    }, [prayerTimes]);

    // Find next prayer
    const nextPrayer = useMemo(() => {
        const current = prayerTimes.currentPrayer();
        const next = prayerTimes.nextPrayer();

        // If it's after Isha, next prayer is Fajr tomorrow (handled by adhan)
        if (next === Prayer.None) {
            // After Isha - show Fajr for tomorrow
            return prayers.find((p) => p.id === 'fajr') || null;
        }

        const nextId = next.toString().toLowerCase();
        return prayers.find((p) => p.id === nextId) || null;
    }, [prayers, prayerTimes, currentDate]);

    // Calculate time remaining
    const timeRemaining = useMemo(() => {
        if (!nextPrayer) return '00:00:00';

        let diffSeconds = differenceInSeconds(nextPrayer.time, currentDate);

        // If negative (after Isha), calculate until Fajr tomorrow
        if (diffSeconds < 0) {
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowTimes = new PrayerTimes(
                IRBID_COORDINATES,
                tomorrow,
                JORDAN_METHOD
            );
            diffSeconds = differenceInSeconds(tomorrowTimes.fajr, currentDate);
        }

        return formatCountdown(diffSeconds);
    }, [nextPrayer, currentDate]);

    return {
        prayers,
        nextPrayer,
        timeRemaining,
        currentDate,
        isLoading,
    };
}
