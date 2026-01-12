'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * usePrayerReminder Hook
 * 
 * Manages:
 * 1. Red dot badge when current prayer is not marked done
 * 2. Persistent notification with countdown + warning
 */

interface PrayerInfo {
    id: string;
    nameAr: string;
    time: Date;
}

interface UsePrayerReminderProps {
    currentPrayer: PrayerInfo | null;
    nextPrayer: PrayerInfo | null;
    timeRemaining: string;
    isPrayerDone: (id: string) => boolean;
    notificationPermission: NotificationPermission | 'unsupported';
}

export function usePrayerReminder({
    currentPrayer,
    nextPrayer,
    timeRemaining,
    isPrayerDone,
    notificationPermission,
}: UsePrayerReminderProps) {
    const notificationRef = useRef<Notification | null>(null);
    const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /**
     * Check if Badging API is supported
     */
    const isBadgeSupported = typeof navigator !== 'undefined' && 'setAppBadge' in navigator;

    /**
     * Set red dot badge (using count 1 with small icon appears as dot)
     */
    const setRedDotBadge = useCallback(async () => {
        if (!isBadgeSupported) return;
        try {
            await (navigator as Navigator & { setAppBadge: (count?: number) => Promise<void> }).setAppBadge();
        } catch (err) {
            console.warn('Failed to set badge:', err);
        }
    }, [isBadgeSupported]);

    /**
     * Clear badge
     */
    const clearBadge = useCallback(async () => {
        if (!isBadgeSupported) return;
        try {
            await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
        } catch (err) {
            console.warn('Failed to clear badge:', err);
        }
    }, [isBadgeSupported]);

    /**
     * Update persistent notification
     */
    const updatePersistentNotification = useCallback(() => {
        if (notificationPermission !== 'granted' || !nextPrayer) return;

        // Check if current prayer is not done (warning needed)
        const showWarning = currentPrayer && !isPrayerDone(currentPrayer.id);

        let title: string;
        let body: string;

        if (showWarning) {
            // Warning mode
            title = `⚠️ لم تصلِ ${currentPrayer.nameAr} بعد`;
            body = `متبقي ${timeRemaining} لصلاة ${nextPrayer.nameAr}`;
        } else {
            // Normal countdown mode
            title = `صلاة ${nextPrayer.nameAr}`;
            body = `⏱️ ${timeRemaining} متبقي`;
        }

        // Close existing notification
        if (notificationRef.current) {
            notificationRef.current.close();
        }

        // Create new persistent notification
        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification(title, {
                        body,
                        icon: '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        tag: 'prayer-reminder', // Replace existing
                        requireInteraction: true, // Keep on lock screen
                        silent: true, // Don't make sound on update
                    });
                });
            }
        } catch (err) {
            console.warn('Failed to show notification:', err);
        }
    }, [currentPrayer, nextPrayer, timeRemaining, isPrayerDone, notificationPermission]);

    /**
     * Update badge based on current prayer status
     */
    useEffect(() => {
        if (!currentPrayer) {
            clearBadge();
            return;
        }

        if (!isPrayerDone(currentPrayer.id)) {
            setRedDotBadge();
        } else {
            clearBadge();
        }
    }, [currentPrayer, isPrayerDone, setRedDotBadge, clearBadge]);

    /**
     * Update persistent notification every minute
     */
    useEffect(() => {
        if (notificationPermission !== 'granted') return;

        // Initial update
        updatePersistentNotification();

        // Update every minute
        updateIntervalRef.current = setInterval(() => {
            updatePersistentNotification();
        }, 60000); // 1 minute

        return () => {
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
            }
        };
    }, [updatePersistentNotification, notificationPermission]);

    /**
     * Clear notification on unmount
     */
    useEffect(() => {
        const notification = notificationRef.current;
        return () => {
            if (notification) {
                notification.close();
            }
        };
    }, []);

    return {
        isBadgeSupported,
        updatePersistentNotification,
    };
}
