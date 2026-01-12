'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Book, Clock, ExternalLink, Bell, Settings } from 'lucide-react';
import { usePrayerTimes, PRAYER_NAMES } from '@/hooks/usePrayerTimes';
import { usePrayerTracker } from '@/hooks/usePrayerTracker';
import { useQuranProgress } from '@/hooks/useQuranProgress';
import { useNotifications } from '@/hooks/useNotifications';
import { PrayerRow } from '@/components/PrayerRow';
import styles from './page.module.css';

export default function Home() {
  const { prayers, nextPrayer, timeRemaining, currentDate, isLoading } = usePrayerTimes();
  const { isPrayerDone, togglePrayer, completedCount, totalCount } = usePrayerTracker();
  const { currentPage, markPageRead, quranComUrl } = useQuranProgress();
  const { isSupported, permission, requestPermission, scheduleNotification } = useNotifications();

  // Schedule notifications for upcoming prayers
  useEffect(() => {
    if (permission !== 'granted' || prayers.length === 0) return;

    prayers.forEach((prayer) => {
      // Only schedule for trackable prayers (not sunrise)
      if (prayer.id === 'sunrise') return;

      scheduleNotification(
        `حان وقت صلاة ${prayer.nameAr}`,
        { body: 'حي على الصلاة 🕌', tag: prayer.id },
        prayer.time
      );
    });
  }, [prayers, permission, scheduleNotification]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with Logo */}
      <header className={styles.header}>
        <Image
          src="/logo-master.png"
          alt="Prayer Times"
          width={60}
          height={60}
          className={styles.logo}
        />
        <h1 className={styles.title}>أوقات الصلاة</h1>
        <p className={styles.subtitle}>إربد، الأردن</p>

        {/* Notification Permission Button */}
        {isSupported && permission !== 'granted' && (
          <button
            className="btn btn-secondary"
            onClick={requestPermission}
            style={{ marginTop: '0.5rem' }}
          >
            <Bell size={16} />
            تفعيل الإشعارات
          </button>
        )}

        {/* Settings Link */}
        <Link href="/settings" className={styles.settingsBtn}>
          <Settings size={20} />
        </Link>
      </header>

      {/* Next Prayer Card */}
      {nextPrayer && (
        <section className={`card ${styles.nextPrayerCard}`}>
          <div className={styles.nextPrayerLabel}>
            <Clock size={18} />
            <span>الصلاة القادمة</span>
          </div>
          <h2 className={styles.nextPrayerName}>{nextPrayer.nameAr}</h2>
          <div className={styles.countdown}>{timeRemaining}</div>
          <p className={styles.nextPrayerTime}>
            {nextPrayer.timeFormatted}
          </p>
        </section>
      )}

      {/* Prayer Times List */}
      <section className={`card ${styles.prayerList}`}>
        <div className={styles.sectionHeader}>
          <h3>مواعيد اليوم</h3>
          <span className="text-secondary">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className={styles.prayerRows}>
          {prayers.map((prayer) => (
            <PrayerRow
              key={prayer.id}
              prayer={prayer}
              isDone={isPrayerDone(prayer.id)}
              isNext={nextPrayer?.id === prayer.id}
              currentTime={currentDate}
              onToggle={togglePrayer}
            />
          ))}
        </div>
      </section>

      {/* Quran Progress Card */}
      <section className={`card ${styles.quranCard}`}>
        <div className={styles.sectionHeader}>
          <div className={styles.quranTitle}>
            <Book size={20} />
            <h3>الورد اليومي</h3>
          </div>
        </div>
        <p className={styles.quranPage}>الصفحة {currentPage}</p>
        <div className={styles.quranActions}>
          <a
            href={quranComUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <ExternalLink size={16} />
            اقرأ الآن
          </a>
          <button className="btn btn-primary" onClick={markPageRead}>
            تم القراءة
          </button>
        </div>
      </section>
    </div>
  );
}
