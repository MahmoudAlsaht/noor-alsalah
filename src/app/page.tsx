'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Book, Clock, ExternalLink, Settings } from 'lucide-react';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { usePrayerTracker } from '@/hooks/usePrayerTracker';
import { useQuranProgress } from '@/hooks/useQuranProgress';
import { useAlarmSound } from '@/hooks/useAlarmSound';
import { useNotifications } from '@/hooks/useNotifications';
import { useAlarmSettings } from '@/hooks/useAlarmSettings';
import { usePrayerReminder } from '@/hooks/usePrayerReminder';
import { useWidgetSync } from '@/hooks/useWidgetSync'; // Import
import { useAppUpdater } from '@/hooks/useAppUpdater'; // Import Updater
import { isNativeApp } from '@/lib/platform'; // Import Platform Check
import { PrayerRow } from '@/components/PrayerRow';
import styles from './page.module.css';

export default function Home() {
  const { prayers, nextPrayer, timeRemaining, currentDate, isLoading } = usePrayerTimes();
  const { isPrayerDone, togglePrayer, completedCount, totalCount } = usePrayerTracker();
  const { currentPage, markPageRead, quranComUrl } = useQuranProgress();
  const { permission, scheduleNotification, cancelNotification } = useNotifications();
  const { settings } = useAlarmSettings();
  const { selectedSound } = useAlarmSound();

  // Sync data to native widget
  useWidgetSync(prayers, currentDate.toLocaleDateString('ar-JO'), nextPrayer);

  // Check for updates automatically
  useAppUpdater();

  // Find current prayer (the one we're in now, not the next one)
  const getCurrentPrayer = () => {
    const now = new Date();
    for (let i = prayers.length - 1; i >= 0; i--) {
      if (prayers[i].time <= now && prayers[i].id !== 'sunrise') {
        return prayers[i];
      }
    }
    return null;
  };
  const currentPrayer = getCurrentPrayer();

  // Smart badge + persistent notification
  usePrayerReminder({
    currentPrayer: currentPrayer ? { id: currentPrayer.id, nameAr: currentPrayer.nameAr, time: currentPrayer.time } : null,
    nextPrayer: nextPrayer ? { id: nextPrayer.id, nameAr: nextPrayer.nameAr, time: nextPrayer.time } : null,
    timeRemaining,
    isPrayerDone,
    notificationPermission: permission,
  });

  // Schedule notifications for upcoming prayers
  useEffect(() => {
    // If native, we don't use this web-based scheduling effect for browser notifications
    // Native alarms are handled via the hook's internal logic or separate effect if needed.
    // However, the current scheduleNotification hook handles native inside it.
    // We just need to make sure we don't request duplicate permissions or show UI.

    // BUT checking existing logic: scheduleNotification handles both. 
    // The issue might be the Permission Button in UI.

    if (permission !== 'granted' || prayers.length === 0) return;

    // Map sound ID to actual filename for Native
    // Note: These files must exist in android/app/src/main/res/raw/
    const soundMapping: Record<string, string> = {
      default: 'adhan.mp3',
      gentle: 'gentle.mp3',
      custom: 'adhan.mp3', // Fallback for native custom sound
    };
    const soundFile = soundMapping[selectedSound] || 'adhan.mp3';

    prayers.forEach((prayer) => {
      // Only schedule for trackable prayers (not sunrise)
      if (prayer.id === 'sunrise') return;

      // Don't schedule if prayer is already marked as done
      if (isPrayerDone(prayer.id)) {
        cancelNotification(prayer.id); // Cancel any existing
        return;
      }

      // Check if this prayer's alarm is enabled
      const prayerSettings = settings[prayer.id as keyof typeof settings];
      if (typeof prayerSettings === 'object' && !prayerSettings.enabled) return;

      // Callback when notification fires: open alarm page (page handles sound)
      const onFireCallback = () => {
        // Redirect to full-screen alarm page (it handles audio)
        window.location.href = `/alarm?prayer=${prayer.id}`;
      };

      scheduleNotification(
        `حان وقت صلاة ${prayer.nameAr}`,
        { body: 'حي على الصلاة 🕌', tag: prayer.id },
        prayer.time,
        prayer.id,
        'atTime',
        onFireCallback,
        soundFile // Pass sound file
      );
    });
  }, [prayers, permission, scheduleNotification, cancelNotification, isPrayerDone, settings, selectedSound]);

  // Fix Hydration Mismatch
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted || isLoading) {
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



        {/* Settings Link - Native Only */}
        {isNativeApp() && (
          <Link href="/settings" className={styles.settingsBtn}>
            <Settings size={20} />
          </Link>
        )}
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
