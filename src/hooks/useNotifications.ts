'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeApp } from '../lib/platform';
import { registerPlugin } from '@capacitor/core';

// Native Alarm Plugin Interface
interface AlarmSchedulerPlugin {
    scheduleAlarm(options: {
        id: number;
        triggerTime: number;
        prayerId: string;
        prayerName: string;
        sound: string;
    }): Promise<{ success: boolean; id: number }>;
    cancelAlarm(options: { id: number }): Promise<void>;
}

const AlarmScheduler = registerPlugin<AlarmSchedulerPlugin>('AlarmScheduler');

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
 * useNotifications Hook
 */
export function useNotifications(): UseNotificationsReturn {
    // Start with 'default' - will be updated in useEffect after mount
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | 'granted' | 'denied'>('default');
    const scheduledRef = useRef<ScheduledNotification[]>([]); // For Web timeouts


    /**
     * Create Notification Channels (Native only)
     */
    const createChannels = useCallback(async () => {
        if (!isNativeApp()) return;

        try {
            // Channel for Alarms (v2)
            await LocalNotifications.createChannel({
                id: 'prayer_alarm_v2',
                name: 'منبهات الصلاة',
                description: 'تنبيهات أوقات الصلاة الرئيسية',
                importance: 5, // HIGH
                visibility: 1, // PUBLIC
                vibration: true,
            });

            // Channel for Reminders (v2)
            await LocalNotifications.createChannel({
                id: 'prayer_reminder_v2',
                name: 'تذكيرات الصلاة',
                description: 'تنبيهات التذكير قبل خروج الوقت',
                importance: 4, // DEFAULT
                visibility: 1,
                vibration: true,
            });

            // Check and request exact alarm permission (Android 12+)
            try {
                const exactStatus = await LocalNotifications.checkExactNotificationSetting();
                if (exactStatus.exact_alarm !== 'granted') {
                    console.log('Exact alarm not granted, opening settings...');
                    await LocalNotifications.changeExactNotificationSetting();
                }
            } catch {
                console.warn('Exact alarm check not supported or failed');
            }

        } catch (e) {
            console.error('Failed to create notification channels', e);
        }
    }, []);

    /**
     * AUTO-REQUEST PERMISSION ON MOUNT
     * This is the critical fix: request permission automatically when app loads
     */
    useEffect(() => {
        const initializePermissions = async () => {
            // Check if running in native app
            const native = isNativeApp();
            console.log('[Notifications] Initializing. isNative:', native);

            if (!native) {
                console.log('[Notifications] Not native app - notifications disabled');
                setPermission('unsupported');
                return;
            }

            // We're in native app - enable support
            setIsSupported(true);

            try {
                console.log('[Notifications] Checking permissions on mount...');

                // Step 1: Check current permission status
                const status = await LocalNotifications.checkPermissions();
                console.log('[Notifications] Current status:', status.display);

                if (status.display === 'granted') {
                    setPermission('granted');
                    console.log('[Notifications] ✅ Permission already granted!');
                    // Create channels if permission already granted
                    await createChannels();
                } else if (status.display === 'prompt') {
                    // Permission not yet requested - request it now
                    console.log('[Notifications] Requesting permissions...');
                    const result = await LocalNotifications.requestPermissions();
                    console.log('[Notifications] Request result:', result.display);

                    if (result.display === 'granted') {
                        setPermission('granted');
                        await createChannels();

                        // Also check exact alarm permission (Android 12+)
                        try {
                            const exactStatus = await LocalNotifications.checkExactNotificationSetting();
                            if (exactStatus.exact_alarm !== 'granted') {
                                await LocalNotifications.changeExactNotificationSetting();
                            }
                        } catch {
                            // Expected on Android < 12
                        }
                    } else {
                        setPermission('denied');
                    }
                } else {
                    // Permission denied
                    setPermission('denied');
                }
            } catch (e) {
                console.error('[Notifications] Permission init failed:', e);
            }
        };

        initializePermissions();
    }, [createChannels]);

    /**
     * Request notification permission
     */
    const requestPermission = useCallback(async () => {
        if (!isSupported) return;

        if (isNativeApp()) {
            try {
                // Step 1: Check current permission status
                const currentStatus = await LocalNotifications.checkPermissions();
                console.log('[Notifications] Current permission:', currentStatus.display);

                // Step 2: Request notification permission if not granted
                if (currentStatus.display !== 'granted') {
                    const result = await LocalNotifications.requestPermissions();
                    console.log('[Notifications] Permission request result:', result.display);

                    if (result.display !== 'granted') {
                        setPermission('denied');
                        console.warn('[Notifications] Permission denied by user');
                        return;
                    }
                }

                setPermission('granted');

                // Step 3: Create notification channels (must be after permission)
                await createChannels();

                // Step 4: Check exact alarm permission (Android 12+)
                try {
                    const exactStatus = await LocalNotifications.checkExactNotificationSetting();
                    console.log('[Notifications] Exact alarm status:', exactStatus.exact_alarm);

                    if (exactStatus.exact_alarm !== 'granted') {
                        console.log('[Notifications] Requesting exact alarm permission...');
                        await LocalNotifications.changeExactNotificationSetting();
                    }
                } catch {
                    // This is expected on Android < 12 or if not supported
                    console.log('[Notifications] Exact alarm check skipped (not supported or not needed)');
                }

            } catch (e) {
                console.error('[Notifications] Permission request failed:', e);
                setPermission('denied');
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
                await LocalNotifications.schedule({
                    notifications: [{
                        title,
                        body: options?.body || '',
                        id: Math.floor(Date.now() / 1000),
                        schedule: { at: new Date(Date.now() + 100) },
                        smallIcon: 'ic_stat_prayer',
                        channelId: 'prayer_reminder_v2',
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
                // Cancel from both systems to be safe
                await LocalNotifications.cancel({ notifications: [{ id }] });
                try {
                    await AlarmScheduler.cancelAlarm({ id });
                } catch (e) {
                    console.warn('Failed to cancel native alarm', e);
                }
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
                try {
                    // Use Native AlarmScheduler for Full Screen Experience
                    console.log(`[Alarm] Scheduling native alarm: ${prayerId} at ${time.toLocaleTimeString()} with sound URI: ${sound}`);

                    await AlarmScheduler.scheduleAlarm({
                        id,
                        triggerTime: time.getTime(),
                        prayerId,
                        prayerName: title,
                        sound: sound || '' // Pass the URI directly
                    });

                } catch (e) {
                    console.error('Failed to schedule native alarm', e);
                    // Fallback to LocalNotifications if alarm fails?
                    // For now, just log error.
                }
            } else {
                if (permission !== 'granted') return;
                const timeoutId = setTimeout(() => {
                    sendNotification(title, options);

                    // Manual play sound for Web - Optional: Skip since files are removed
                    if (sound && !sound.startsWith('content://')) {
                        const audio = new Audio(sound);
                        audio.play().catch(() => { });
                    }

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
