'use client';

import { useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '../lib/platform';

interface WidgetData {
    [key: string]: string | undefined;
}

export function useWidgetSync(
    prayers: { id: string; timeFormatted: string; nameAr: string; time: Date }[],
    currentDate: string,
    nextPrayer: { nameAr: string; timeFormatted: string } | null
) {
    useEffect(() => {
        if (!isNativeApp() || prayers.length === 0) return;

        const syncToWidget = async () => {
            // Map prayer data to a simple object for the widget
            const data: WidgetData = {};
            prayers.forEach(p => {
                data[p.id] = p.timeFormatted;
            });
            data['date'] = currentDate;

            if (nextPrayer) {
                data['nextName'] = nextPrayer.nameAr;
                data['nextTime'] = nextPrayer.timeFormatted;
            }

            try {
                // Store in a shared preference key that the native widget can read
                await Preferences.set({
                    key: 'widget_prayer_data',
                    value: JSON.stringify(data),
                });
            } catch (e) {
                console.error('Failed to sync widget data', e);
            }
        };

        syncToWidget();
    }, [prayers, currentDate, nextPrayer]);
}
