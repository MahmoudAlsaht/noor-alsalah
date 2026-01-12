'use client';

import { useCallback } from 'react';

/**
 * useBadge Hook
 * 
 * Manages the app icon badge count using the Badging API.
 * Shows the number of remaining prayers on the app icon.
 * 
 * Note: Only works on Android PWA and some desktop browsers.
 * iOS does not support this API.
 */
export function useBadge() {
    /**
     * Check if Badging API is supported
     */
    const isSupported = typeof navigator !== 'undefined' && 'setAppBadge' in navigator;

    /**
     * Set the badge count
     */
    const setBadge = useCallback(async (count: number) => {
        if (!isSupported) return;

        try {
            if (count > 0) {
                await (navigator as Navigator & { setAppBadge: (count: number) => Promise<void> }).setAppBadge(count);
            } else {
                await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
            }
        } catch (err) {
            console.warn('Failed to set badge:', err);
        }
    }, [isSupported]);

    /**
     * Clear the badge
     */
    const clearBadge = useCallback(async () => {
        if (!isSupported) return;

        try {
            await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
        } catch (err) {
            console.warn('Failed to clear badge:', err);
        }
    }, [isSupported]);

    return {
        isSupported,
        setBadge,
        clearBadge,
    };
}
