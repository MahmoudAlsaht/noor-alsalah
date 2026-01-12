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
    const { settings, updatePrayerSetting, setFirstFajrOffset, setPlaySound } = useAlarmSettings();
    const { selectedSound, setSelectedSound, playAlarm, stopAlarm, isPlaying } = useAlarmSound();

    const prayers = ['fajr', 'fajrFirst', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

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
                            {prayer === 'fajrFirst' && (
                                <span className={styles.prayerNote}>
                                    {settings.firstFajrOffset} دقيقة قبل الفجر
                                </span>
                            )}
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

                {/* First Fajr Offset */}
                <div className={styles.offsetRow}>
                    <label>وقت الأذان الأول (قبل الفجر):</label>
                    <select
                        value={settings.firstFajrOffset}
                        onChange={(e) => setFirstFajrOffset(Number(e.target.value))}
                        className={styles.select}
                    >
                        <option value={5}>5 دقائق</option>
                        <option value={10}>10 دقائق</option>
                        <option value={15}>15 دقائق</option>
                        <option value={20}>20 دقائق</option>
                    </select>
                </div>
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

                {prayers.filter((p) => p !== 'fajrFirst').map((prayer) => (
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
                        {ALARM_SOUNDS.map((sound) => (
                            <option key={sound.id} value={sound.id}>
                                {sound.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    className="btn btn-secondary"
                    onClick={isPlaying ? stopAlarm : playAlarm}
                    style={{ marginTop: '0.5rem' }}
                >
                    {isPlaying ? 'إيقاف' : 'تجربة الصوت'}
                </button>

                <div className={styles.toggleRow}>
                    <span>تشغيل الصوت</span>
                    <label className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={settings.playSound}
                            onChange={(e) => setPlaySound(e.target.checked)}
                        />
                        <span className={styles.toggleSlider}></span>
                    </label>
                </div>
            </section>
        </div>
    );
}
