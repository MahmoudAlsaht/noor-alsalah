'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { isNativeApp } from '@/lib/platform';
import { registerPlugin } from '@capacitor/core';
import styles from './alarm.module.css';

// Native Alarm Plugin Interface
interface AlarmSchedulerPlugin {
    stopAlarmSound(): Promise<void>;
}
const AlarmScheduler = registerPlugin<AlarmSchedulerPlugin>('AlarmScheduler');

const PRAYER_NAMES: Record<string, string> = {
    fajr: 'الفجر',
    fajrFirst: 'الأذان الأول',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
};



/**
 * Alarm Content Component
 */
function AlarmContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [isReady] = useState(true);

    // Secure: Prevent Web Access
    useEffect(() => {
        if (!isNativeApp()) {
            window.location.href = '/';
        }
    }, []);

    const prayerId = searchParams.get('prayer') || 'fajr';
    const prayerName = PRAYER_NAMES[prayerId] || 'صلاة';

    const [currentTime, setCurrentTime] = useState('');



    // Update time every second
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            );
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleStop = useCallback(async () => {
        try {
            // Stop native sound
            await AlarmScheduler.stopAlarmSound();
        } catch (e) {
            console.error('Failed to stop native alarm:', e);
        }
        router.push('/');
    }, [router]);

    // Auto-stop alarm after 2 minutes
    useEffect(() => {
        const timer = setTimeout(() => {
            console.log('Alarm auto-stopped after 2 minutes');
            handleStop();
        }, 120000); // 2 minutes

        return () => clearTimeout(timer);
    }, [handleStop]);



    if (!isNativeApp()) return null;

    if (!isReady) {
        return (
            <div className={styles.container}>
                <div className={styles.content}>جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Background Glow */}
            <div className={styles.glow} />

            {/* Content */}
            <div className={styles.content}>
                <p className={styles.label}>حان وقت صلاة</p>
                <h1 className={styles.prayerName}>{prayerName}</h1>
                <p className={styles.time}>{currentTime}</p>

                {/* Stop Button */}
                <button className={styles.stopBtn} onClick={handleStop}>
                    <X size={32} />
                    <span>إيقاف</span>
                </button>
            </div>

            {/* Islamic Pattern Overlay */}
            <div className={styles.pattern} />
        </div>
    );
}

/**
 * Full-Screen Alarm Page
 */
export default function AlarmPage() {
    return (
        <Suspense fallback={<div className={styles.container}><div className={styles.content}>جاري التحميل...</div></div>}>
            <AlarmContent />
        </Suspense>
    );
}
