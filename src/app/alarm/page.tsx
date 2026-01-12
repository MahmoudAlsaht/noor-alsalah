'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { isNativeApp } from '@/lib/platform';
import styles from './alarm.module.css';

const PRAYER_NAMES: Record<string, string> = {
    fajr: 'الفجر',
    fajrFirst: 'الأذان الأول',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
};

const STORAGE_KEY = 'selected-alarm-sound';
const CUSTOM_SOUND_KEY = 'custom-alarm-sound-url';

/**
 * Alarm Content Component
 */
function AlarmContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isReady] = useState(true);

    // Secure: Prevent Web Access
    useEffect(() => {
        if (!isNativeApp()) {
            window.location.href = '/';
        }
    }, []);

    if (!isNativeApp()) return null;

    const prayerId = searchParams.get('prayer') || 'fajr';
    const prayerName = PRAYER_NAMES[prayerId] || 'صلاة';

    const [currentTime, setCurrentTime] = useState('');

    // Get sound URL
    const getSoundUrl = () => {
        try {
            const selectedSound = localStorage.getItem(STORAGE_KEY) || 'default';
            if (selectedSound === 'custom') {
                const customUrl = localStorage.getItem(CUSTOM_SOUND_KEY);
                if (customUrl) return customUrl;
            } else if (selectedSound === 'gentle') {
                return '/sounds/alarm-gentle.mp3';
            }
        } catch {
            // Use default
        }
        return '/sounds/alarm-default.mp3';
    };

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

    // Handle audio with HTML audio element callback
    const handleAudioRef = (audio: HTMLAudioElement | null) => {
        if (audio && !audioRef.current) {
            audioRef.current = audio;
            audio.play().catch(console.error);
        }
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        router.push('/');
    };

    if (!isReady) {
        return (
            <div className={styles.container}>
                <div className={styles.content}>جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Hidden Audio Element */}
            <audio
                ref={handleAudioRef}
                src={getSoundUrl()}
                loop
                preload="auto"
            />

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
