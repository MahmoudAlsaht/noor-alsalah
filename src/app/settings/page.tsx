'use client';

import { ArrowRight, Bell, Clock, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useAlarmSettings } from '@/hooks/useAlarmSettings';
import { useAlarmSound, ALARM_SOUNDS } from '@/hooks/useAlarmSound';
import styles from './settings.module.css';

const PRAYER_LABELS: Record<string, string> = {
    fajr: 'الفجر',
    fajrFirst: 'أذان الفجر الأول',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
};

export default function SettingsPage() {
    const { settings, updatePrayerSetting } = useAlarmSettings();
    const { selectedSound, setSelectedSound, setCustomSound, playAlarm, stopAlarm, isPlaying, hasCustomSound } = useAlarmSound();

    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    <ArrowRight size={24} />
                </Link>
                <h1>الإعدادات</h1>
            </header>

            {/* Notification Settings */}
            <section className={`card ${styles.section}`}>
                <div className={styles.sectionHeader}>
                    <Bell size={20} />
                    <h2>إعدادات التنبيهات</h2>
                </div>

                {prayers.map((prayer) => (
                    <div key={prayer} className={styles.prayerRow}>
                        <div className={styles.prayerInfo}>
                            <span className={styles.prayerName}>{PRAYER_LABELS[prayer]}</span>
                        </div>

                        <div className={styles.prayerControls}>
                            {/* Enable/Disable Toggle */}
                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={settings[prayer].enabled}
                                    onChange={(e) =>
                                        updatePrayerSetting(prayer, { enabled: e.target.checked })
                                    }
                                />
                                <span className={styles.toggleSlider}></span>
                            </label>
                        </div>
                    </div>
                ))}
            </section>

            {/* Timing Options */}
            <section className={`card ${styles.section}`}>
                <div className={styles.sectionHeader}>
                    <Clock size={20} />
                    <h2>توقيت التنبيه</h2>
                </div>
                <p className={styles.note}>
                    اختر متى تريد التنبيه لكل صلاة: وقت الدخول، قبل الخروج، أو كلاهما.
                </p>

                {prayers.map((prayer) => (
                    <div key={prayer} className={styles.timingRow}>
                        <span>{PRAYER_LABELS[prayer]}</span>
                        <select
                            value={settings[prayer].timing}
                            onChange={(e) =>
                                updatePrayerSetting(prayer, { timing: e.target.value as 'atTime' | 'beforeEnd' | 'both' | 'none' })
                            }
                            className={styles.select}
                            disabled={!settings[prayer].enabled}
                        >
                            <option value="atTime">وقت الصلاة</option>
                            <option value="beforeEnd">قبل خروج الوقت</option>
                            <option value="both">الاثنين</option>
                            <option value="none">بدون</option>
                        </select>
                    </div>
                ))}
            </section>

            {/* Sound Settings */}
            <section className={`card ${styles.section}`}>
                <div className={styles.sectionHeader}>
                    <Volume2 size={20} />
                    <h2>صوت التنبيه</h2>
                </div>

                <div className={styles.soundRow}>
                    <label>اختر الرنة:</label>
                    <select
                        value={selectedSound}
                        onChange={(e) => setSelectedSound(e.target.value as typeof selectedSound)}
                        className={styles.select}
                    >
                        {ALARM_SOUNDS
                            .filter((sound) => sound.id !== 'custom' || hasCustomSound)
                            .map((sound) => (
                                <option key={sound.id} value={sound.id}>
                                    {sound.name}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Custom Sound Upload */}
                <div className={styles.uploadRow}>
                    <label>رفع صوت مخصص:</label>
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                setCustomSound(file);
                            }
                        }}
                        className={styles.fileInput}
                    />
                    {hasCustomSound && <span className={styles.uploadStatus}>✅ تم رفع صوت مخصص</span>}
                </div>

                <button
                    className="btn btn-secondary"
                    onClick={isPlaying ? stopAlarm : playAlarm}
                    style={{ marginTop: '0.5rem' }}
                >
                    {isPlaying ? 'إيقاف' : 'تجربة الصوت'}
                </button>
            </section>
        </div>
    );
}
