'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from '@/lib/platform';

// Native Alarm Plugin Interface
interface AlarmSchedulerPlugin {
    checkLaunchData(): Promise<{ isAlarm?: boolean; prayerId?: string; sound?: string }>;
}

const AlarmScheduler = registerPlugin<AlarmSchedulerPlugin>('AlarmScheduler');

export function AlarmListener() {
    const router = useRouter();
    const checkedRef = useRef(false);

    useEffect(() => {
        if (!isNativeApp() || checkedRef.current) return;

        const checkAlarmLaunch = async () => {
            try {
                // Check if app was launched by alarm (Native Mailbox)
                const data = await AlarmScheduler.checkLaunchData();

                if (data.isAlarm) {
                    console.log('🚀 App launched by ALARM!', data);
                    // alert(`🚀 انطلق المنبه!\nالصلاة: ${data.prayerName || data.prayerId}`); // Debugging

                    // Redirect to alarm page immediately
                    router.replace(`/alarm?prayer=${data.prayerId}&sound=${encodeURIComponent(data.sound || '')}`);
                    checkedRef.current = true;
                }
            } catch (e) {
                console.error('Failed to check launch data:', e);
            }
        };

        checkAlarmLaunch();

        // Also listen for app resume (foreground)
        document.addEventListener('resume', checkAlarmLaunch);
        return () => document.removeEventListener('resume', checkAlarmLaunch);
    }, [router]);

    return null; // This component handles logic only
}
