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
 * Only native app supports notifications - web is simplified view only
 */
function checkNotificationSupport(): { supported: boolean; perm: NotificationPermission | 'unsupported' } {
    if (isNativeApp()) {
        return { supported: true, perm: 'default' }; // Native always supported, perm checked later
    }
    // Web version does NOT support notifications - simplified view only
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
            // Channel for Default Adhan (v2 - new channel to override old settings)
            await LocalNotifications.createChannel({
                id: 'prayer_adhan_v2',
                name: 'تنبيهات الصلاة (أذان)',
                description: 'تنبيهات أوقات الصلاة مع صوت الأذان',
                importance: 5, // HIGH
                visibility: 1, // PUBLIC
                sound: 'adhan', // Without extension for Android
                vibration: true,
            });

            // Channel for Gentle Sound (v2)
            await LocalNotifications.createChannel({
                id: 'prayer_gentle_v2',
                name: 'تنبيهات الصلاة (هادئ)',
                description: 'تنبيهات أوقات الصلاة مع صوت هادئ',
                importance: 5, // HIGH
                visibility: 1, // PUBLIC
                sound: 'gentle', // Without extension for Android
                vibration: true,
            });

            // Channel for Default/Other (v2)
            await LocalNotifications.createChannel({
                id: 'prayer_alert_v2',
                name: 'تنبيهات الصلاة (تذكير)',
                description: 'تنبيهات التذكير قبل خروج الوقت',
                importance: 4, // DEFAULT
                visibility: 1,
                sound: 'alert', // Without extension for Android
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
                // Determine channel based on simplistic logic or default
                const channelId = 'prayer_alert_v2';

                // For native, we just schedule it 1s in future as "immediate"
                await LocalNotifications.schedule({
                    notifications: [{
                        title,
                        body: options?.body || '',
                        id: Math.floor(Date.now() / 1000), // Random ID for immediate
                        schedule: { at: new Date(Date.now() + 100) },
                        sound: 'alert', // Without extension
                        smallIcon: 'ic_stat_prayer', // Custom notification icon
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

                // Determine Channel ID based on sound file (v2 channels)
                let channelId = 'prayer_alert_v2';
                let soundName = 'alert'; // Default sound without extension
                if (sound?.includes('adhan')) {
                    channelId = 'prayer_adhan_v2';
                    soundName = 'adhan';
                } else if (sound?.includes('gentle')) {
                    channelId = 'prayer_gentle_v2';
                    soundName = 'gentle';
                }

                try {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title,
                            body: options.body || '',
                            id,
                            schedule: { at: time, allowWhileIdle: true },
                            sound: soundName, // Without extension for Android
                            smallIcon: 'ic_stat_prayer', // Custom notification icon
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

                    // Manually play sound for Web
                    if (sound) {
                        // Our files are in public/sounds/ 
                        // Our files are in public/sounds/ or just root?
                        // Native raw files are: adhan.mp3, alert.mp3, gentle.mp3
                        // We need these in public/ folder for web to play them.
                        // Assuming they are mapped.
                        let webSoundUrl = '/sounds/alarm-default.mp3';
                        if (sound.includes('adhan')) webSoundUrl = '/sounds/adhan.mp3'; // Need to ensure file exists
                        else if (sound.includes('gentle')) webSoundUrl = '/sounds/gentle.mp3';
                        else if (sound.includes('alert')) webSoundUrl = '/sounds/alert.mp3';

                        const audio = new Audio(webSoundUrl);
                        audio.play().catch(e => console.warn('Expected web audio play error (interaction disallowed):', e));
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
