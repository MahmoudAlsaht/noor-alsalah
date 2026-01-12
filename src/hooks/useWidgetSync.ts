'use client';

import { useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '../lib/platform';
import { type PrayerTimeEntry } from './usePrayerTimes';

export function useWidgetSync(prayers: PrayerTimeEntry[], currentDate: string, nextPrayer: PrayerTimeEntry | null) {
    useEffect(() => {
        if (!isNativeApp() || prayers.length === 0) return;

        const syncData = async () => {
            try {
                const data: Record<string, string> = {
                    date: currentDate,
                    nextName: nextPrayer ? nextPrayer.nameAr : '',
                    nextTime: nextPrayer ? nextPrayer.timeFormatted : '',
                };

                prayers.forEach(p => {
                    data[p.id] = p.timeFormatted;
                });

                // Write to Capacitor Preferences
                await Preferences.set({
                    key: 'widget_prayer_data',
                    value: JSON.stringify(data),
                });
                console.log('Widget data synced to Prefs:', data);

            } catch (error) {
                console.error('Failed to sync widget data:', error);
            }
        };

        syncData();
    }, [prayers, currentDate, nextPrayer]);
}
