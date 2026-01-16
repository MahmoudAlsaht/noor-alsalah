'use client';

import { useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Bell,
    Clock,
    Sliders,
    Volume2,
    RefreshCw,
    ArrowLeft,
    Info,
    Settings as SettingsIcon,
    Save
} from 'lucide-react';
import Link from 'next/link';
import { useAlarmSettings } from '@/hooks/useAlarmSettings';
import { useAlarmSound } from '@/hooks/useAlarmSound';
import { useAppUpdater } from '@/hooks/useAppUpdater';
import { usePrayerAdjustments, PrayerAdjustments } from '@/hooks/usePrayerAdjustments';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import styles from './settings.module.css';

const PRAYER_LABELS: Record<string, string> = {
    fajr: 'الفجر',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
};

export default function SettingsPage() {
    const { settings, updatePrayerSetting, setTimeFormat } = useAlarmSettings();
    const { adjustments, saveAdjustments } = usePrayerAdjustments();
    const { soundName, pickSystemRingtone, playAlarm, stopAlarm, isPlaying } = useAlarmSound();
    const { isChecking, checkForUpdate, currentVersion } = useAppUpdater();
    const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

    const toggleHaptics = async (style: ImpactStyle = ImpactStyle.Light) => {
        try {
            await Haptics.impact({ style });
        } catch {
            // Haptics not supported
        }
    };

    const handleSettingChange = (prayer: string, key: string, value: string | boolean) => {
        toggleHaptics();
        updatePrayerSetting(prayer as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', { [key]: value });
    };

    const handleOffsetChange = (prayer: keyof PrayerAdjustments, value: number) => {
        toggleHaptics();
        const newAdjustments = { ...adjustments, [prayer]: value };
        saveAdjustments(newAdjustments);
        setIsDirty(true);
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn} onClick={() => toggleHaptics(ImpactStyle.Medium)}>
                    <ArrowLeft size={24} style={{ transform: 'rotate(180deg)' }} />
                </Link>
                <h1 className="text-gradient">الإعدادات</h1>
            </header>

            {/* 1. Prayer Management (Accordion) */}
            <section className={`${styles.section} card`}>
                <div className={styles.sectionHeader}>
                    <Bell size={20} className="text-accent" />
                    <h2 className="text-gradient">تنبيهات الصلوات</h2>
                </div>
                <p className={styles.note}>تحكم في تنبيهات كل صلاة وتوقيتها وتصحيحها.</p>

                <div className={styles.prayerList}>
                    {prayers.map((id) => (
                        <div key={id} className={`${styles.prayerItem} ${expandedPrayer === id ? styles.prayerItemExpanded : ''}`}>
                            <div className={styles.prayerHeader} onClick={() => {
                                setExpandedPrayer(expandedPrayer === id ? null : id);
                                toggleHaptics();
                            }}>
                                <span className={styles.prayerName}>{PRAYER_LABELS[id]}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span className={styles.prayerNote}>
                                        {settings[id].enabled ? 'مفعل' : 'معطل'}
                                    </span>
                                    {expandedPrayer === id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>

                            {expandedPrayer === id && (
                                <div className={styles.prayerContent}>
                                    <div className={styles.flexBetween} style={{ marginBottom: '1.25rem' }}>
                                        <label style={{ fontWeight: 700 }}>تفعيل التنبيه</label>
                                        <input
                                            type="checkbox"
                                            className="premium-checkbox"
                                            checked={settings[id].enabled}
                                            onChange={(e) => handleSettingChange(id, 'enabled', e.target.checked)}
                                        />
                                    </div>

                                    <div className={styles.flexBetween} style={{ marginBottom: '1.25rem' }}>
                                        <label style={{ fontWeight: 700 }}>توقيت التنبيه</label>
                                        <select
                                            className="premium-select"
                                            value={settings[id].timing || 'atTime'}
                                            disabled={!settings[id].enabled}
                                            onChange={(e) => handleSettingChange(id, 'timing', e.target.value)}
                                        >
                                            <option value="atTime">عند دخول الوقت</option>
                                            <option value="beforeEnd">قبل انتهاء الوقت</option>
                                            <option value="both">كلاهما</option>
                                        </select>
                                    </div>

                                    <div className={styles.flexBetween}>
                                        <label style={{ fontWeight: 700 }}>تصحيح الوقت (دقائق)</label>
                                        <select
                                            className="premium-select"
                                            value={adjustments[id]}
                                            onChange={(e) => handleOffsetChange(id as keyof PrayerAdjustments, parseInt(e.target.value))}
                                        >
                                            {Array.from({ length: 41 }, (_, i) => i - 20).map(v => (
                                                <option key={v} value={v}>{v > 0 ? `+${v}` : v}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {isDirty && (
                    <div style={{ padding: '0 1rem 1rem' }}>
                        <button
                            className="btn btn-primary w-full"
                            style={{ background: 'var(--color-gold)', color: '#000', width: '100%', justifyContent: 'center' }}
                            onClick={() => { window.location.reload(); }}
                        >
                            <Save size={18} style={{ marginLeft: '0.5rem' }} />
                            يجب إعادة تشغيل التطبيق لتطبيق التعديلات
                        </button>
                    </div>
                )}
            </section>

            {/* 2. Sound & Feedback */}
            <section className={`${styles.section} card`}>
                <div className={styles.sectionHeader}>
                    <Volume2 size={20} className="text-accent" />
                    <h2 className="text-gradient">الصوت والتفاعل</h2>
                </div>

                <div className={styles.soundPickerContainer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className={styles.flexBetween} style={{ padding: '0.5rem 0' }}>
                        <div>
                            <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>نغمة التنبيه</p>
                            <p className={styles.note}>{soundName || 'نغمة النظام'}</p>
                        </div>
                    </div>

                    <button
                        className="btn btn-secondary w-full"
                        style={{ justifyContent: 'center' }}
                        onClick={() => { pickSystemRingtone(); toggleHaptics(); }}
                    >
                        <Sliders size={18} style={{ marginLeft: '0.5rem' }} />
                        تغيير النغمة
                    </button>

                    <button
                        className={`btn ${isPlaying ? 'btn-secondary' : 'btn-primary'} w-full`}
                        style={{ justifyContent: 'center' }}
                        onClick={() => {
                            if (isPlaying) stopAlarm();
                            else playAlarm(false);
                            toggleHaptics(ImpactStyle.Medium);
                        }}
                    >
                        {isPlaying ? 'إيقاف التجربة' : 'تجربة الصوت'}
                    </button>
                </div>
            </section>

            {/* 3. Global Display Settings */}
            <section className={`${styles.section} card`}>
                <div className={styles.sectionHeader}>
                    <SettingsIcon size={20} className="text-accent" />
                    <h2 className="text-gradient">تفضيلات العرض</h2>
                </div>

                <div className={styles.flexBetween}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Clock size={18} className="text-secondary" />
                        <span style={{ fontWeight: 700 }}>نظام الوقت (12/24)</span>
                    </div>
                    <input
                        type="checkbox"
                        className="premium-checkbox"
                        checked={settings.timeFormat === '24h'}
                        onChange={(e) => {
                            setTimeFormat(e.target.checked ? '24h' : '12h');
                            toggleHaptics();
                        }}
                    />
                </div>
            </section>

            {/* 4. About & System */}
            <section className={`${styles.section} card`}>
                <div className={styles.sectionHeader}>
                    <Info size={20} className="text-accent" />
                    <h2 className="text-gradient">عن التطبيق</h2>
                </div>

                <div className={styles.flexBetween} style={{ padding: '0.5rem 0' }}>
                    <span className={styles.note} style={{ fontSize: '0.95rem' }}>إصدار التطبيق</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{currentVersion || '0.1.27'}</span>
                </div>

                <button
                    className="btn btn-primary w-full"
                    style={{ justifyContent: 'center', marginTop: '0.5rem' }}
                    onClick={() => { checkForUpdate(); toggleHaptics(ImpactStyle.Medium); }}
                    disabled={isChecking}
                >
                    <RefreshCw size={18} className={isChecking ? 'animate-spin' : ''} style={{ marginLeft: '0.5rem' }} />
                    {isChecking ? 'جاري الفحص...' : 'البحث عن تحديثات'}
                </button>
            </section>

            <footer style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.4 }}>
                <p className={styles.note}>نور الصلاة - تقبل الله طاعتكم</p>
            </footer>
        </div>
    );
}
