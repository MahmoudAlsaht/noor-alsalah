'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook return type
 */
export interface UseNotificationsReturn {
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    requestPermission: () => Promise<boolean>;
    sendNotification: (title: string, options?: NotificationOptions) => void;
    scheduleNotification: (title: string, options: NotificationOptions, date: Date) => void;
}

/**
 * useNotifications Hook
 * 
 * Handles browser notification permissions and scheduling.
 * Works with PWA Service Worker for background notifications.
 */
export function useNotifications(): UseNotificationsReturn {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

    // Check support on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
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
     * Schedule a notification for a specific time
     */
    const scheduleNotification = useCallback(
        (title: string, options: NotificationOptions, date: Date) => {
            const now = new Date();
            const delay = date.getTime() - now.getTime();

            if (delay <= 0) return; // Time has passed

            // Schedule with setTimeout (works while app is open)
            setTimeout(() => {
                sendNotification(title, options);
            }, delay);
        },
        [sendNotification]
    );

    return {
        isSupported,
        permission,
        requestPermission,
        sendNotification,
        scheduleNotification,
    };
}
