'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Scheduled notification data
 */
interface ScheduledNotification {
    prayerId: string;
    type: 'atTime' | 'beforeEnd';
    timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * Hook return type
 */
export interface UseNotificationsReturn {
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    requestPermission: () => Promise<void>;
    sendNotification: (title: string, options?: NotificationOptions & { persistent?: boolean }) => void;
    scheduleNotification: (
        title: string,
        options: NotificationOptions,
        time: Date,
        prayerId: string,
        type?: 'atTime' | 'beforeEnd',
        onFire?: () => void
    ) => void;
    cancelNotification: (prayerId: string, type?: 'atTime' | 'beforeEnd') => void;
}

/**
 * Check notification support (for lazy init)
 */
function checkNotificationSupport(): { supported: boolean; perm: NotificationPermission | 'unsupported' } {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        return { supported: true, perm: Notification.permission };
    }
    return { supported: false, perm: 'unsupported' };
}

/**
 * useNotifications Hook
 * 
 * Handles browser notification permissions and scheduling.
 * Supports cancelling notifications (e.g., when prayer is marked done).
 */
export function useNotifications(): UseNotificationsReturn {
    // Lazy initialization
    const [isSupported] = useState(() => checkNotificationSupport().supported);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => checkNotificationSupport().perm);
    const scheduledRef = useRef<ScheduledNotification[]>([]);

    /**
     * Request notification permission
     */
    const requestPermission = useCallback(async () => {
        if (!isSupported) return;
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
        } catch {
            console.error('Failed to request notification permission');
        }
    }, [isSupported]);

    /**
     * Send immediate notification
     * @param persistent - If true, notification stays on lock screen until user interacts
     */
    const sendNotification = useCallback(
        (title: string, options?: NotificationOptions & { persistent?: boolean }) => {
            if (!isSupported || permission !== 'granted') return;

            const notificationOptions: NotificationOptions = {
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                requireInteraction: options?.persistent ?? false,
                ...options,
            };

            // Use Service Worker registration if available for better PWA support
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification(title, notificationOptions);
                });
            } else {
                new Notification(title, notificationOptions);
            }
        },
        [isSupported, permission]
    );

    /**
     * Cancel a scheduled notification
     */
    const cancelNotification = useCallback(
        (prayerId: string, type: 'atTime' | 'beforeEnd' = 'atTime') => {
            const index = scheduledRef.current.findIndex(
                (n) => n.prayerId === prayerId && n.type === type
            );
            if (index !== -1) {
                clearTimeout(scheduledRef.current[index].timeoutId);
                scheduledRef.current.splice(index, 1);
            }
        },
        []
    );

    /**
     * Schedule a notification for a specific time
     */
    const scheduleNotification = useCallback(
        (
            title: string,
            options: NotificationOptions,
            time: Date,
            prayerId: string,
            type: 'atTime' | 'beforeEnd' = 'atTime',
            onFire?: () => void
        ) => {
            if (!isSupported || permission !== 'granted') return;

            // Cancel any existing notification for this prayer/type
            cancelNotification(prayerId, type);

            const delay = time.getTime() - Date.now();
            if (delay <= 0) return; // Don't schedule past notifications

            const timeoutId = setTimeout(() => {
                sendNotification(title, options);
                // Call the onFire callback (e.g., to play alarm sound)
                if (onFire) onFire();
                // Remove from scheduled list after firing
                scheduledRef.current = scheduledRef.current.filter(
                    (n) => n.prayerId !== prayerId || n.type !== type
                );
            }, delay);

            scheduledRef.current.push({ prayerId, type, timeoutId });
        },
        [isSupported, permission, cancelNotification, sendNotification]
    );

    return {
        isSupported,
        permission,
        requestPermission,
        sendNotification,
        scheduleNotification,
        cancelNotification,
    };
}
