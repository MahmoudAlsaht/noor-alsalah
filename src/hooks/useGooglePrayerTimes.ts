'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Google prayer times response
 */
interface GoogleTimesResponse {
    success: boolean;
    data?: {
        fajr: string;
        sunrise: string;
        dhuhr: string;
        asr: string;
        maghrib: string;
        isha: string;
        source: string;
        fetchedAt: string;
    };
    error?: string;
}

/**
 * Hook return type
 */
export interface UseGooglePrayerTimesReturn {
    googleTimes: GoogleTimesResponse['data'] | null;
    isLoading: boolean;
    error: string | null;
    lastFetched: Date | null;
    refetch: () => Promise<void>;
}

/**
 * Storage key for caching
 */
const CACHE_KEY = 'google-prayer-times-cache';
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * useGooglePrayerTimes Hook
 * 
 * Fetches prayer times from Google Search via our API route.
 * Caches results in localStorage for 12 hours to minimize requests.
 */
export function useGooglePrayerTimes(): UseGooglePrayerTimesReturn {
    const [googleTimes, setGoogleTimes] = useState<GoogleTimesResponse['data'] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    /**
     * Fetch times from API
     */
    const fetchTimes = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/google-times');
            const result: GoogleTimesResponse = await response.json();

            if (result.success && result.data) {
                setGoogleTimes(result.data);
                setLastFetched(new Date());

                // Cache in localStorage
                localStorage.setItem(
                    CACHE_KEY,
                    JSON.stringify({
                        data: result.data,
                        timestamp: Date.now(),
                    })
                );
            } else {
                setError(result.error || 'Failed to fetch from Google');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Load from cache or fetch fresh
     */
    useEffect(() => {
        const loadCachedOrFetch = () => {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    const age = Date.now() - timestamp;

                    if (age < CACHE_DURATION_MS) {
                        // Use cached data
                        setGoogleTimes(data);
                        setLastFetched(new Date(timestamp));
                        return;
                    }
                }
            } catch {
                // Ignore cache errors
            }

            // Fetch fresh data
            fetchTimes();
        };

        loadCachedOrFetch();
    }, [fetchTimes]);

    return {
        googleTimes,
        isLoading,
        error,
        lastFetched,
        refetch: fetchTimes,
    };
}
