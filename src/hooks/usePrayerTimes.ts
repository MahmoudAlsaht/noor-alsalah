'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    PrayerTimes,
    CalculationParameters,
    Coordinates,
    Prayer,
} from 'adhan';
import { differenceInSeconds } from 'date-fns';

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
 * Format PrayerTimes object into useful array
 */
/**
 * Format PrayerTimes object into useful array
 */
function formatPrayers(prayerTimes: PrayerTimes, format: '12h' | '24h'): PrayerTimeEntry[] {
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

        // Manual Formatting to ensure 12h/24h behavior
        let timeFormatted = '';
        const hours = time.getHours();
        const minutes = time.getMinutes().toString().padStart(2, '0');

        if (format === '24h') {
            // 24h: 13:30
            timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes}`;
        } else {
            // 12h: 01:30 pm (Arabic)
            // We manually construct it to match user expectation: "01:30 م"
            const h12 = hours % 12 || 12;
            const ampm = hours >= 12 ? 'م' : 'ص';
            timeFormatted = `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
        }

        return {
            id,
            nameAr: PRAYER_NAMES[id],
            nameEn: id.charAt(0).toUpperCase() + id.slice(1),
            time,
            timeFormatted,
        };
    });
}

/**
 * Get prayer times for any specific date
 */
export function getPrayersForDate(date: Date, format: '12h' | '24h' = '12h'): PrayerTimeEntry[] {
    const prayerTimes = new PrayerTimes(IRBID_COORDINATES, date, JORDAN_METHOD);
    return formatPrayers(prayerTimes, format);
}

/**
 * usePrayerTimes Hook
 * 
 * Calculates prayer times for Irbid, Jordan using the Jordan Ministry
 * of Awqaf calculation method. Returns formatted times and countdown
 * to the next prayer.
 */
interface UsePrayerTimesOptions {
    format?: '12h' | '24h';
}

import { usePrayerAdjustments, PrayerAdjustments } from './usePrayerAdjustments';

// ... (existing imports)

/**
 * Get calculation method with dynamic adjustments
 */
function getMethodWithAdjustments(adjustments?: PrayerAdjustments): CalculationParameters {
    const params = new CalculationParameters('Other', 18, 18);

    // Use provided adjustments OR default Jordan ones
    // Note: usePrayerAdjustments handles the defaults (including maghrib: 4)
    if (adjustments) {
        params.adjustments = adjustments;
    } else {
        // Fallback if not loaded yet
        params.adjustments = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 4, isha: 0 };
    }

    return params;
}

export function usePrayerTimes({ format = '12h' }: UsePrayerTimesOptions = {}): UsePrayerTimesReturn {
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [isLoading] = useState(false);

    // Load adjustments
    const { adjustments, isLoaded } = usePrayerAdjustments();

    // Update current date every second for countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDate(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Calculate prayer times with Dynamic Adjustments
    const prayerTimes = useMemo(() => {
        // Only calculate if adjustments are loaded to avoid jumps
        // But for SSR/initial render, use defaults
        const method = getMethodWithAdjustments(isLoaded ? adjustments : undefined);
        return new PrayerTimes(IRBID_COORDINATES, currentDate, method);
    }, [currentDate, adjustments, isLoaded]);

    // Format prayers into array
    const prayers: PrayerTimeEntry[] = useMemo(() => {
        return formatPrayers(prayerTimes, format);
    }, [prayerTimes, format]);

    // Find next prayer
    const nextPrayer = useMemo(() => {
        const next = prayerTimes.nextPrayer();

        // If it's after Isha, next prayer is Fajr TOMORROW
        if (next === Prayer.None) {
            // Get current method with adjustments
            const method = getMethodWithAdjustments(isLoaded ? adjustments : undefined);

            // Calculate tomorrow's Fajr time
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowTimes = new PrayerTimes(
                IRBID_COORDINATES,
                tomorrow,
                method // Use dynamic method
            );

            // Return Fajr with tomorrow's actual time
            return {
                id: 'fajr',
                nameAr: PRAYER_NAMES['fajr'],
                nameEn: 'Fajr',
                time: tomorrowTimes.fajr,
                timeFormatted: formatPrayers(tomorrowTimes, format).find(p => p.id === 'fajr')?.timeFormatted || '',
            };
        }

        const nextId = next.toString().toLowerCase();
        return prayers.find((p) => p.id === nextId) || null;
    }, [prayers, prayerTimes, currentDate, format, adjustments, isLoaded]); // Add deps

    // Calculate time remaining
    const timeRemaining = useMemo(() => {
        if (!nextPrayer) return '00:00:00';

        let diffSeconds = differenceInSeconds(nextPrayer.time, currentDate);

        // If negative (shouldn't happen if nextPrayer is correctly set to tomorrow, but for safety)
        if (diffSeconds < 0 && nextPrayer.id === 'fajr') {
            // Already handled by nextPrayer logic above, but ensure consistency
            // In fact, if nextPrayer.time is tomorrow, diffSeconds will be positive.
            // But if we are in the transition split second?
            return '00:00:00';
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
