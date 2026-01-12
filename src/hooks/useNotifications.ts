'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Scheduled notification info
 */
interface ScheduledNotification {
    timeoutId: ReturnType<typeof setTimeout>;
    prayerId: string;
    type: 'atTime' | 'beforeEnd';
}

/**
 * Hook return type
 */
export interface UseNotificationsReturn {
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    requestPermission: () => Promise<boolean>;
    sendNotification: (title: string, options?: NotificationOptions) => void;
    scheduleNotification: (
        title: string,
        options: NotificationOptions,
        date: Date,
        prayerId: string,
        type: 'atTime' | 'beforeEnd'
    ) => void;
    cancelNotification: (prayerId: string, type?: 'atTime' | 'beforeEnd') => void;
}

/**
 * useNotifications Hook
 * 
 * Handles browser notification permissions and scheduling.
 * Supports cancelling notifications (e.g., when prayer is marked done).
 */
export function useNotifications(): UseNotificationsReturn {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
    const scheduledRef = useRef<ScheduledNotification[]>([]);

    // Check support on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            scheduledRef.current.forEach((n) => clearTimeout(n.timeoutId));
        };
    }, []);

    /**
     * Request notification permission
     */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isSupported) return false;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        } catch {
            return false;
        }
    }, [isSupported]);

    /**
     * Send immediate notification
     */
    const sendNotification = useCallback(
        (title: string, options?: NotificationOptions) => {
            if (!isSupported || permission !== 'granted') return;

            // Use Service Worker registration if available for better PWA support
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification(title, {
                        icon: '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        ...options,
                    });
                });
            } else {
                new Notification(title, {
                    icon: '/icon-192x192.png',
                    ...options,
                });
            }
        },
        [isSupported, permission]
    );

    /**
     * Cancel a scheduled notification
     */
    const cancelNotification = useCallback(
        (prayerId: string, type?: 'atTime' | 'beforeEnd') => {
            scheduledRef.current = scheduledRef.current.filter((n) => {
                if (n.prayerId === prayerId && (type === undefined || n.type === type)) {
                    clearTimeout(n.timeoutId);
                    return false;
                }
                return true;
            });
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
            date: Date,
            prayerId: string,
            type: 'atTime' | 'beforeEnd'
        ) => {
            const now = new Date();
            const delay = date.getTime() - now.getTime();

            if (delay <= 0) return; // Time has passed

            // Cancel any existing notification with same prayerId and type
            cancelNotification(prayerId, type);

            // Schedule new notification
            const timeoutId = setTimeout(() => {
                sendNotification(title, options);
                // Remove from scheduled list after firing
                scheduledRef.current = scheduledRef.current.filter(
                    (n) => n.prayerId !== prayerId || n.type !== type
                );
            }, delay);

            scheduledRef.current.push({ timeoutId, prayerId, type });
        },
        [sendNotification, cancelNotification]
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
