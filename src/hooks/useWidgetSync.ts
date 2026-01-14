'use client';

import { useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '@/lib/platform';
import { getHijriDateString } from '@/lib/hijri';

interface Prayer {
    id: string;
    nameAr: string;
    time: Date;
    timeFormatted: string;
}

/**
 * useWidgetSync Hook
 * 
 * Syncs ALL prayer data to native SharedPreferences for the widget.
 * The widget will calculate the "next prayer" itself, making it self-updating.
 */
export function useWidgetSync(
    todayPrayers: Prayer[],
    date: string,
    nextPrayer: Prayer | null
) {
    useEffect(() => {
        console.log('[WidgetSync] Hook triggered. isNative:', isNativeApp());

        if (!isNativeApp()) {
            console.log('[WidgetSync] Not native app, skipping sync');
            return;
        }

        if (todayPrayers.length === 0) {
            console.log('[WidgetSync] No prayers data, skipping sync');
            return;
        }

        const syncToNative = async () => {
            try {
                // Send ALL prayers so widget can calculate next prayer itself
                const prayersForWidget = todayPrayers
                    .filter(p => p.id !== 'sunrise') // Exclude sunrise
                    .map(p => ({
                        id: p.id,
                        name: p.nameAr,
                        time: p.timeFormatted,
                        timestamp: p.time.getTime()
                    }));

                const data = {
                    // Full prayers array for smart widget
                    prayers: prayersForWidget,
                    // Also include current next prayer for backward compatibility
                    nextPrayerName: nextPrayer?.nameAr || '',
                    nextPrayerTime: nextPrayer?.timeFormatted || '',
                    nextPrayerTimestamp: nextPrayer?.time.getTime() || 0,
                    // Metadata
                    city: 'إربد، الأردن',
                    date: date,
                    hijriDate: getHijriDateString(new Date()),
                    lastUpdated: new Date().toISOString()
                };

                console.log('[WidgetSync] Saving data with', prayersForWidget.length, 'prayers');

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
