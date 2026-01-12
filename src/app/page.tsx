'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Book, Clock, ExternalLink, Settings } from 'lucide-react';
import { usePrayerTimes, getPrayersForDate } from '@/hooks/usePrayerTimes';
import { usePrayerTracker } from '@/hooks/usePrayerTracker';
import { useQuranProgress } from '@/hooks/useQuranProgress';
import { useAlarmSound } from '@/hooks/useAlarmSound';
import { useNotifications } from '@/hooks/useNotifications';
import { useAlarmSettings } from '@/hooks/useAlarmSettings';
import { usePrayerReminder } from '@/hooks/usePrayerReminder';
import { useWidgetSync } from '@/hooks/useWidgetSync'; // Import
import { isNativeApp } from '@/lib/platform'; // Import Platform Check
import { PrayerRow } from '@/components/PrayerRow';
import { DownloadAppSection } from '@/components/DownloadAppSection'; // Import
import styles from './page.module.css';

export default function Home() {
  const { settings } = useAlarmSettings();
  const { prayers: todayPrayers, nextPrayer, timeRemaining, currentDate, isLoading } = usePrayerTimes({ format: settings.timeFormat });
  const { isPrayerDone, togglePrayer, completedCount, totalCount } = usePrayerTracker();
  const { currentPage, markPageRead, quranComUrl } = useQuranProgress();
  const { permission, scheduleNotification, cancelNotification } = useNotifications();
  const { selectedSound } = useAlarmSound();

  // Day Navigation State (-1: Yesterday, 0: Today, 1: Tomorrow)
  // We can expand range if needed, but UI specified Yesterday/Tomorrow
  const [dayOffset, setDayOffset] = useState(0);

  // Sync data to native widget (Always sync Today's data)
  useWidgetSync(todayPrayers, currentDate.toLocaleDateString('ar-JO'), nextPrayer);

  // Determine which prayers to show based on selected day
  const displayedPrayers = dayOffset === 0
    ? todayPrayers
    : (() => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      return getPrayersForDate(targetDate, settings.timeFormat);
    })();

  const getDayLabel = (offset: number) => {
    if (offset === 0) return 'اليوم';
    if (offset === 1) return 'غداً';
    if (offset === -1) return 'أمس';
    return '';
  };

  // Check for updates automatically logic (disabled)

  // Find current prayer (the one we're in now, not the next one)
  const getCurrentPrayer = () => {
    const now = new Date();
    // Only relevant if we are calculating relative to *NOW*
    // So we use todayPrayers always for logic
    for (let i = todayPrayers.length - 1; i >= 0; i--) {
      if (todayPrayers[i].time <= now && todayPrayers[i].id !== 'sunrise') {
        return todayPrayers[i];
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

    if (permission !== 'granted' || todayPrayers.length === 0) return;

    // Map sound ID to actual filename for Native
    // Note: These files must exist in android/app/src/main/res/raw/
    const soundMapping: Record<string, string> = {
      default: 'adhan.mp3',
      gentle: 'gentle.mp3',
      custom: 'adhan.mp3', // Fallback for native custom sound
    };
    const soundFile = soundMapping[selectedSound] || 'adhan.mp3';

    todayPrayers.forEach((prayer) => {
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
  }, [todayPrayers, permission, scheduleNotification, cancelNotification, isPrayerDone, settings, selectedSound]);

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
        <h1 className={styles.title}>نور الصلاة</h1>
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
        <div className={styles.sectionHeader} style={{ marginBottom: 0, paddingBottom: '1rem' }}>
          <h3>مواقيت الصلاة</h3>
          {/* Only show count if Today */
            dayOffset === 0 && (
              <span className="text-secondary">
                {completedCount}/{totalCount}
              </span>
            )}
        </div>

        {/* Date Navigation Tabs */}
        <div className={styles.dateTabs} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {[-1, 0, 1].map((offset) => (
            <button
              key={offset}
              className={`btn ${dayOffset === offset ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }}
              onClick={() => setDayOffset(offset)}
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
              // Only check 'done' status if we are viewing Today
              isDone={dayOffset === 0 ? isPrayerDone(prayer.id) : false}
              // Only highlight 'next' if we are viewing Today
              isNext={dayOffset === 0 && nextPrayer?.id === prayer.id}
              currentTime={currentDate}
              onToggle={togglePrayer}
              readOnly={dayOffset !== 0} // Disable interaction for non-today
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

      {/* Download App Section - Web Only */}
      {!isNativeApp() && <DownloadAppSection />}
    </div>
  );
}
