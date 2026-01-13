'use client';

import { useState, useCallback, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeApp } from '../lib/platform';

/**
 * Scheduled notification data (Web)
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
    permission: NotificationPermission | 'unsupported' | 'granted' | 'denied';
    requestPermission: () => Promise<void>;
    sendNotification: (title: string, options?: NotificationOptions & { persistent?: boolean }) => void;
    scheduleNotification: (
        title: string,
        options: NotificationOptions,
        time: Date,
        prayerId: string,
        type?: 'atTime' | 'beforeEnd',
        onFire?: () => void,
        sound?: string
    ) => void;
    cancelNotification: (prayerId: string, type?: 'atTime' | 'beforeEnd') => void;
}

/**
 * Helper to generate unique ID for Capacitor notifications
 */
function generateNotificationId(prayerId: string, type: string): number {
    // Simple hash: Sum of char codes + type offset
    // This is simple but effectively unique for the limited set of prayer names
    let hash = 0;
    const str = prayerId + type;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * checkNotificationSupport
 */
function checkNotificationSupport(): { supported: boolean; perm: NotificationPermission | 'unsupported' } {
    if (isNativeApp()) {
        return { supported: true, perm: 'default' }; // Native always supported, perm checked later
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
        return { supported: true, perm: Notification.permission };
    }
    return { supported: false, perm: 'unsupported' };
}

/**
 * useNotifications Hook
 */
export function useNotifications(): UseNotificationsReturn {
    const [isSupported] = useState(() => checkNotificationSupport().supported);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | 'granted' | 'denied'>(() => checkNotificationSupport().perm);
    const scheduledRef = useRef<ScheduledNotification[]>([]); // For Web timeouts

    /**
     * Create Notification Channels (Native only)
     */
    const createChannels = useCallback(async () => {
        if (!isNativeApp()) return;

        try {
            // Channel for Default Adhan
            await LocalNotifications.createChannel({
                id: 'prayer_channel_adhan',
                name: 'تنبيهات الصلاة (أذان)',
                description: 'تنبيهات أوقات الصلاة مع صوت الأذان',
                importance: 5, // HIGH
                visibility: 1, // PUBLIC
                sound: 'adhan.mp3',
                vibration: true,
            });

            // Channel for Gentle Sound
            await LocalNotifications.createChannel({
                id: 'prayer_channel_gentle',
                name: 'تنبيهات الصلاة (هادئ)',
                description: 'تنبيهات أوقات الصلاة مع صوت هادئ',
                importance: 5, // HIGH
                visibility: 1, // PUBLIC
                sound: 'gentle.mp3',
                vibration: true,
            });

            // Channel for Default/Other
            await LocalNotifications.createChannel({
                id: 'prayer_channel_default',
                name: 'تنبيهات الصلاة (عام)',
                description: 'تنبيهات عامة',
                importance: 3, // DEAULT
                visibility: 1,
                sound: 'alert.mp3',
                vibration: true,
            });

        } catch (e) {
            console.error('Failed to create notification channels', e);
        }
    }, []);

    // Initialize channels on load
    useState(() => {
        createChannels();
    });

    /**
     * Request notification permission
     */
    const requestPermission = useCallback(async () => {
        if (!isSupported) return;

        if (isNativeApp()) {
            try {
                const result = await LocalNotifications.requestPermissions();
                setPermission(result.display === 'granted' ? 'granted' : 'denied');
                // Ensure channels are created after permission (just in case)
                await createChannels();
            } catch (e) {
                console.error('Native permission request failed', e);
            }
        } else {
            try {
                const result = await Notification.requestPermission();
                setPermission(result);
            } catch {
                console.error('Failed to request notification permission');
            }
        }
    }, [isSupported, createChannels]);

    /**
     * Send immediate notification
     */
    const sendNotification = useCallback(
        async (title: string, options?: NotificationOptions & { persistent?: boolean }) => {
            if (!isSupported) return;

            if (isNativeApp()) {
                // Determine channel based on simplistic logic or default
                const channelId = 'prayer_channel_default';

                // For native, we just schedule it 1s in future as "immediate"
                await LocalNotifications.schedule({
                    notifications: [{
                        title,
                        body: options?.body || '',
                        id: Math.floor(Date.now() / 1000), // Random ID for immediate
                        schedule: { at: new Date(Date.now() + 100) },
                        sound: 'alert.mp3',
                        smallIcon: 'ic_stat_icon_config_sample',
                        channelId,
                        actionTypeId: '',
                        extra: null
                    }]
                });
            } else {
                if (permission !== 'granted') return;
                const notificationOptions: NotificationOptions = {
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png',
                    requireInteraction: options?.persistent ?? false,
                    ...options,
                };

                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then((registration) => {
                        registration.showNotification(title, notificationOptions);
                    });
                } else {
                    new Notification(title, notificationOptions);
                }
            }
        },
        [isSupported, permission]
    );

    /**
     * Cancel a scheduled notification
     */
    const cancelNotification = useCallback(
        async (prayerId: string, type: 'atTime' | 'beforeEnd' = 'atTime') => {
            if (isNativeApp()) {
                const id = generateNotificationId(prayerId, type);
                await LocalNotifications.cancel({ notifications: [{ id }] });
            } else {
                const index = scheduledRef.current.findIndex(
                    (n) => n.prayerId === prayerId && n.type === type
                );
                if (index !== -1) {
                    clearTimeout(scheduledRef.current[index].timeoutId);
                    scheduledRef.current.splice(index, 1);
                }
            }
        },
        []
    );

    /**
     * Schedule a notification
     */
    const scheduleNotification = useCallback(
        async (
            title: string,
            options: NotificationOptions,
            time: Date,
            prayerId: string,
            type: 'atTime' | 'beforeEnd' = 'atTime',
            onFire?: () => void,
            sound?: string // New parameter
        ) => {
            if (!isSupported) return;

            // Cancel existing
            await cancelNotification(prayerId, type);

            const delay = time.getTime() - Date.now();
            if (delay <= 0) return;

            if (isNativeApp()) {
                const id = generateNotificationId(prayerId, type);

                // Determine Channel ID based on sound file
                let channelId = 'prayer_channel_default';
                if (sound?.includes('adhan')) {
                    channelId = 'prayer_channel_adhan';
                } else if (sound?.includes('gentle')) {
                    channelId = 'prayer_channel_gentle';
                }

                try {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title,
                            body: options.body || '',
                            id,
                            schedule: { at: time, allowWhileIdle: true },
                            sound: sound || 'adhan.mp3',
                            smallIcon: 'ic_stat_icon_config_sample',
                            channelId,
                        }]
                    });
                } catch (e) {
                    console.error('Failed to schedule native notification', e);
                }
            } else {
                if (permission !== 'granted') return;
                const timeoutId = setTimeout(() => {
                    sendNotification(title, options);
                    if (onFire) onFire();
                    scheduledRef.current = scheduledRef.current.filter(
                        (n) => n.prayerId !== prayerId || n.type !== type
                    );
                }, delay);

                scheduledRef.current.push({ prayerId, type, timeoutId });
            }
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
