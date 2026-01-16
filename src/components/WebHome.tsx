import React from 'react';
import Image from 'next/image';
import { Clock, ExternalLink } from 'lucide-react';
import { getHijriDateString } from '@/lib/hijri';
import styles from '@/app/page.module.css';
import { PrayerTimeEntry } from '@/hooks/usePrayerTimes';

interface WebHomeProps {
    currentDate: Date;
    nextPrayer: PrayerTimeEntry | null;
    timeRemaining: string;
    todayPrayers: PrayerTimeEntry[];
}

export const WebHome: React.FC<WebHomeProps> = ({
    currentDate,
    nextPrayer,
    timeRemaining,
    todayPrayers
}) => {
    return (
        <div className={styles.container}>
            {/* Fixed Download Banner */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: '#14b8a6',
                color: 'white',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                zIndex: 1000,
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
                <div style={{ flex: 1, fontSize: '14px' }}>
                    <strong>📱 حمّل التطبيق</strong> • تتبع صلواتك • تنبيهات بصوت الأذان • ويدجت ذكي
                </div>
                <a
                    href="https://github.com/MahmoudAlsaht/noor-alsalah/releases/latest/download/noor-alsalah.apk"
                    style={{
                        backgroundColor: 'white',
                        color: '#14b8a6',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    تحميل APK
                </a>
            </div>

            {/* Spacer for fixed banner */}
            <div style={{ height: '60px' }} />

            {/* Header with Logo */}
            <header className={styles.header}>
                <Image
                    src="/logo-master.png"
                    alt="Prayer Times"
                    width={60}
                    height={60}
                    className={styles.logo}
                />
                <h1 className={styles.title}>نور الصلاة</h1>
                <p className={styles.subtitle}>إربد، الأردن</p>
                {/* Date Display - Hijri + Gregorian */}
                <div style={{
                    marginTop: '8px',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    opacity: 0.9
                }}>
                    <div style={{ color: '#14b8a6', fontWeight: 'bold' }}>
                        {getHijriDateString(currentDate)}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
                        {currentDate.toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </header>

            {/* Next Prayer Card */}
            {nextPrayer && (
                <section className={`card ${styles.nextPrayerCard}`}>
                    <div className={styles.nextPrayerLabel}>
                        <Clock size={18} />
                        <span>الصلاة القادمة</span>
                    </div>
                    <h2 className={styles.nextPrayerName}>
                        {nextPrayer.nameAr}
                        {nextPrayer.isTomorrow && <span style={{ fontSize: '0.8rem', opacity: 0.8, marginRight: '8px' }}>(غداً)</span>}
                    </h2>
                    <div className={styles.countdown}>{timeRemaining}</div>
                    <p className={styles.nextPrayerTime}>
                        {nextPrayer.timeFormatted}
                    </p>
                </section>
            )}

            {/* Prayer Times List - Simple, no checklist */}
            <section className={`card ${styles.prayerList}`}>
                <div className={styles.sectionHeader} style={{ marginBottom: 0, paddingBottom: '1rem' }}>
                    <h3>مواقيت الصلاة</h3>
                    <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                        {currentDate.toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
                <div className={styles.prayerRows}>
                    {todayPrayers.map((prayer) => (
                        <div
                            key={prayer.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 0',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                backgroundColor: nextPrayer?.id === prayer.id ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                                borderRadius: nextPrayer?.id === prayer.id ? '8px' : 0,
                                paddingLeft: nextPrayer?.id === prayer.id ? '12px' : 0,
                                paddingRight: nextPrayer?.id === prayer.id ? '12px' : 0,
                            }}
                        >
                            <span style={{ fontWeight: nextPrayer?.id === prayer.id ? 'bold' : 'normal' }}>
                                {prayer.nameAr}
                                {nextPrayer?.id === prayer.id && <span style={{ marginRight: '8px', color: '#14b8a6' }}>● التالية</span>}
                            </span>
                            <span style={{ opacity: 0.8 }}>{prayer.timeFormatted}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Download Section at Bottom */}
            <section className="card" style={{ textAlign: 'center', padding: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>🕌 حمّل تطبيق نور الصلاة</h3>
                <p className="text-secondary" style={{ marginBottom: '16px', fontSize: '14px' }}>
                    تتبع صلواتك • تنبيهات بصوت الأذان • ويدجت للشاشة الرئيسية
                </p>
                <a
                    href="https://github.com/MahmoudAlsaht/noor-alsalah/releases/latest/download/noor-alsalah.apk"
                    className="btn btn-primary"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '14px 28px',
                        fontSize: '16px'
                    }}
                >
                    <ExternalLink size={18} />
                    تحميل للأندرويد
                </a>
            </section>
        </div>
    );
};
