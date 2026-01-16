import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Book, Clock, ExternalLink, Settings } from 'lucide-react';
import { PrayerTimeEntry } from '@/hooks/usePrayerTimes';
import { getHijriDateString } from '@/lib/hijri';
import { PrayerRow } from '@/components/PrayerRow';
import { hapticFeedback } from '@/lib/haptics';
import styles from '@/app/page.module.css';

interface NativeHomeProps {
    currentDate: Date;
    nextPrayer: PrayerTimeEntry | null;
    timeRemaining: string;
    dayOffset: number;
    setDayOffset: (offset: number) => void;
    displayedPrayers: PrayerTimeEntry[];
    isPrayerDone: (prayerId: string) => boolean;
    handleTogglePrayer: (prayerId: string) => void;
    completedCount: number;
    totalCount: number;
    overlayGranted: boolean;
    requestOverlay: () => void;
    currentPage: number;
    quranComUrl: string;
    markPageRead: () => void;
}

export const NativeHome: React.FC<NativeHomeProps> = ({
    currentDate,
    nextPrayer,
    timeRemaining,
    dayOffset,
    setDayOffset,
    displayedPrayers,
    isPrayerDone,
    handleTogglePrayer,
    completedCount,
    totalCount,
    overlayGranted,
    requestOverlay,
    currentPage,
    quranComUrl,
    markPageRead,
}) => {
    const getDayLabel = (offset: number) => {
        if (offset === 0) return 'اليوم';
        if (offset === 1) return 'غداً';
        if (offset === -1) return 'أمس';
        return '';
    };

    // Dynamic color based on current prayer
    const getPrayerTheme = () => {
        if (!nextPrayer) return 'teal';
        const id = nextPrayer.id;
        if (id === 'fajr') return '#818cf8'; // Indigo
        if (id === 'dhuhr' || id === 'asr') return '#fbbf24'; // Gold/Amber
        if (id === 'maghrib') return '#f87171'; // Red/Sunset
        return '#2dd4bf'; // Teal
    };

    const themeColor = getPrayerTheme();

    return (
        <div className={styles.container} style={{ '--accent': themeColor } as React.CSSProperties}>
            {/* Background Accent Glow */}
            <div style={{
                position: 'fixed',
                top: '-10%',
                right: '-10%',
                width: '60%',
                height: '40%',
                background: themeColor,
                filter: 'blur(120px)',
                opacity: 0.08,
                pointerEvents: 'none',
                zIndex: 0
            }} />

            {/* Header with Logo */}
            <header className={styles.header}>
                <Image
                    src="/logo-master.png"
                    alt="Prayer Times"
                    width={84}
                    height={84}
                    className={styles.logo}
                />
                <h1 className={`${styles.title} text-gradient`}>نور الصلاة</h1>
                <p className={styles.subtitle}>تقبل الله طاعتكم</p>

                {/* Date Display - Hijri + Gregorian */}
                <div style={{
                    marginTop: '20px',
                    textAlign: 'center',
                }}>
                    <div className="text-gradient" style={{ fontSize: '1.4rem', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                        {getHijriDateString(currentDate)}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>
                        {currentDate.toLocaleDateString('ar-JO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>

                <Link href="/settings" className={styles.settingsBtn} onClick={() => hapticFeedback('medium')}>
                    <Settings size={22} />
                </Link>
            </header>

            {/* Permission Warning Banner */}
            {!overlayGranted && (
                <div
                    style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                        borderRadius: 'var(--radius)',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                        <span style={{ fontWeight: '800', fontSize: '1.05rem' }}>تنبيه بخصوص الأذان</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0, lineHeight: '1.6' }}>
                        ليعمل المنبه بشكل صحيح في خلفية النظام، يرجى تفعيل إذن &quot;الظهور فوق التطبيقات&quot;.
                    </p>
                    <button
                        onClick={() => { hapticFeedback('medium'); requestOverlay(); }}
                        className="btn btn-primary"
                        style={{ alignSelf: 'flex-start', padding: '0.7rem 1.4rem' }}
                    >
                        تفعيل التنبيهات
                    </button>
                </div>
            )}

            {/* Next Prayer Card */}
            {nextPrayer && (
                <section className={`card ${styles.nextPrayerCard}`}>
                    <div className={styles.nextPrayerLabel}>
                        <Clock size={18} />
                        <span>الصلاة القادمة</span>
                    </div>
                    <h2 className={styles.nextPrayerName}>
                        {nextPrayer.nameAr}
                        {nextPrayer.isTomorrow && <span style={{ fontSize: '1rem', opacity: 0.6, marginRight: '10px', fontWeight: '600' }}>(غداً)</span>}
                    </h2>
                    <div className={styles.countdown} style={{ color: themeColor }}>{timeRemaining}</div>
                    <p className={styles.nextPrayerTime}>
                        موعد الأذان: {nextPrayer.timeFormatted}
                    </p>
                </section>
            )}

            {/* Prayer Times List */}
            <section className={`card ${styles.prayerList}`}>
                <div className={styles.sectionHeader} style={{ marginBottom: '1.5rem' }}>
                    <h3 className="text-gradient" style={{ marginBottom: '1.5rem' }}>المواقيت</h3>
                    {dayOffset === 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.35rem 0.9rem', borderRadius: '2rem', fontSize: '0.9rem', fontWeight: '800' }}>
                            <span style={{ color: 'var(--accent)' }}>{completedCount}</span>
                            <span style={{ opacity: 0.4 }}> / {totalCount}</span>
                        </div>
                    )}
                </div>

                {/* Date Navigation */}
                <div className={styles.dateTabs} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '1.1rem' }}>
                    {[-1, 0, 1].map((offset) => (
                        <button
                            key={offset}
                            className={`btn ${dayOffset === offset ? 'btn-primary' : ''}`}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                fontSize: '0.95rem',
                                background: dayOffset === offset ? 'var(--accent)' : 'transparent',
                                color: dayOffset === offset ? '#020617' : '#94a3b8',
                                borderRadius: '0.85rem',
                                fontWeight: '800'
                            }}
                            onClick={() => {
                                hapticFeedback('light');
                                setDayOffset(offset);
                            }}
                        >
                            {getDayLabel(offset)}
                        </button>
                    ))}
                </div>

                <div className={styles.prayerRows}>
                    {displayedPrayers.map((prayer) => (
                        <PrayerRow
                            key={prayer.id}
                            prayer={prayer}
                            isDone={dayOffset === 0 ? isPrayerDone(prayer.id) : false}
                            isNext={dayOffset === 0 && nextPrayer?.id === prayer.id}
                            currentTime={currentDate}
                            onToggle={(id) => {
                                hapticFeedback(isPrayerDone(id) ? 'light' : 'medium');
                                handleTogglePrayer(id);
                            }}
                            readOnly={dayOffset !== 0}
                        />
                    ))}
                </div>
            </section>

            {/* Daily Quran Card - Premium Overhaul */}
            <section className={`card ${styles.quranCard}`}>
                <div className={styles.sectionHeader} style={{ justifyContent: 'center', marginBottom: '1rem' }}>
                    <div className={styles.quranTitle}>
                        < Book size={20} className="text-accent" />
                        <h3 className="text-gradient">الورد اليومي</h3>
                    </div>
                </div>

                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>يجب قراءة</div>
                    <p className={styles.quranPage} style={{ color: 'var(--highlight)', margin: 0 }}>صفحة {currentPage}</p>
                </div>

                <div className={styles.quranActions}>
                    <a
                        href={quranComUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ flex: 1.2, gap: '0.75rem' }}
                        onClick={() => hapticFeedback('light')}
                    >
                        <ExternalLink size={18} />
                        قراءة الصفحة
                    </a>
                    <button
                        className="btn btn-primary"
                        style={{ background: 'var(--accent)', color: '#020617', flex: 1 }}
                        onClick={() => {
                            hapticFeedback('medium');
                            markPageRead();
                        }}
                    >
                        تمت القراءة
                    </button>
                </div>
            </section>

            <footer style={{ textAlign: 'center', padding: '2.5rem 1rem', opacity: 0.3, fontSize: '0.85rem' }}>
                <p>إربد، الأردن</p>
            </footer>
        </div>
    );
};
