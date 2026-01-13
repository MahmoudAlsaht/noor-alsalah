'use client';

import { useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '@/lib/platform';

interface Prayer {
    id: string;
    nameAr: string;
    time: Date;
    timeFormatted: string;
}

export function useWidgetSync(
    todayPrayers: Prayer[],
    date: string,
    nextPrayer: Prayer | null
) {
    useEffect(() => {
        // DEBUG: Log to verify this runs
        console.log('[WidgetSync] Hook triggered. isNative:', isNativeApp(), 'nextPrayer:', nextPrayer?.nameAr);

        if (!isNativeApp()) {
            console.log('[WidgetSync] Not native app, skipping sync');
            return;
        }

        if (!nextPrayer) {
            console.log('[WidgetSync] No next prayer, skipping sync');
            return;
        }

        const syncToNative = async () => {
            try {
                const data = {
                    nextPrayerName: nextPrayer.nameAr,
                    nextPrayerTime: nextPrayer.timeFormatted,
                    city: 'إربد، الأردن',
                    date: date,
                    lastUpdated: new Date().toISOString()
                };

                console.log('[WidgetSync] Saving data:', JSON.stringify(data));

                await Preferences.set({
                    key: 'WIDGET_DATA',
                    value: JSON.stringify(data),
                });

                console.log('[WidgetSync] Data saved successfully!');

            } catch (e) {
                console.error('[WidgetSync] Failed to sync:', e);
            }
        };

        syncToNative();
    }, [todayPrayers, date, nextPrayer]);
}
