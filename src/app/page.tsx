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
// import { useWidgetSync } from '@/hooks/useWidgetSync'; // Disabled for now
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

  // Sync data to native widget - DISABLED FOR NOW
  // useWidgetSync(todayPrayers, currentDate.toLocaleDateString('ar-JO'), nextPrayer);

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
    if (permission !== 'granted' || todayPrayers.length === 0) return;

    // Map sound ID to actual filename for Native
    const soundMapping: Record<string, string> = {
      default: 'adhan.mp3',
      gentle: 'gentle.mp3',
      custom: 'adhan.mp3',
    };
    const soundFile = soundMapping[selectedSound] || 'adhan.mp3';

    todayPrayers.forEach((prayer, index) => {
      // Only schedule for trackable prayers (not sunrise)
      if (prayer.id === 'sunrise') return;

      // Don't schedule if prayer is already marked as done
      if (isPrayerDone(prayer.id)) {
        cancelNotification(prayer.id, 'atTime');
        cancelNotification(prayer.id, 'beforeEnd');
        return;
      }

      // Check if this prayer's alarm is enabled
      const prayerSettings = settings[prayer.id as keyof typeof settings];
      if (typeof prayerSettings !== 'object' || !prayerSettings.enabled) {
        cancelNotification(prayer.id, 'atTime');
        cancelNotification(prayer.id, 'beforeEnd');
        return;
      }

      const timing = prayerSettings.timing;
      const beforeEndMinutes = prayerSettings.beforeEndMinutes || 15;

      // Callback when notification fires: open alarm page
      const onFireCallback = () => {
        window.location.href = `/alarm?prayer=${prayer.id}`;
      };

      // Schedule AT TIME notification (if timing is 'atTime' or 'both')
      if (timing === 'atTime' || timing === 'both') {
        scheduleNotification(
          `حان وقت صلاة ${prayer.nameAr}`,
          { body: 'حي على الصلاة 🕌', tag: prayer.id },
          prayer.time,
          prayer.id,
          'atTime',
          onFireCallback,
          soundFile
        );
      } else {
        cancelNotification(prayer.id, 'atTime');
      }

      // Schedule BEFORE END notification (if timing is 'beforeEnd' or 'both')
      if (timing === 'beforeEnd' || timing === 'both') {
        // Find the next prayer to calculate "before end" time
        // "End" of current prayer = Start of next prayer
        let nextPrayerTime: Date | null = null;

        // Find next non-sunrise prayer
        for (let i = index + 1; i < todayPrayers.length; i++) {
          if (todayPrayers[i].id !== 'sunrise') {
            nextPrayerTime = todayPrayers[i].time;
            break;
          }
        }

        if (nextPrayerTime) {
          const beforeEndTime = new Date(nextPrayerTime.getTime() - beforeEndMinutes * 60 * 1000);

          // Only schedule if beforeEndTime is in the future
          if (beforeEndTime.getTime() > Date.now()) {
            scheduleNotification(
              `تذكير: صلاة ${prayer.nameAr}`,
              { body: `باقي ${beforeEndMinutes} دقيقة على خروج الوقت ⏰`, tag: `${prayer.id}-beforeEnd` },
              beforeEndTime,
              prayer.id,
              'beforeEnd',
              onFireCallback,
              soundFile
            );
          }
        }
      } else {
        cancelNotification(prayer.id, 'beforeEnd');
      }
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

  // Simple Web View - Only shows today's prayer times + countdown
  if (!isNativeApp()) {
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

        {/* Prayer Times List - Simple, no checklist */}
        <section className={`card ${styles.prayerList}`}>
          <div className={styles.sectionHeader} style={{ marginBottom: 0, paddingBottom: '1rem' }}>
            <h3>مواقيت الصلاة</h3>
          </div>
          <div className={styles.prayerRows}>
            {todayPrayers.map((prayer) => (
              <PrayerRow
                key={prayer.id}
                prayer={prayer}
                isDone={false}
                isNext={nextPrayer?.id === prayer.id}
                currentTime={currentDate}
                onToggle={() => { }}
                readOnly={true}
              />
            ))}
          </div>
        </section>

        {/* Download App Section */}
        <DownloadAppSection />
      </div>
    );
  }

  // Full Native App View - All features
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

      {/* Prayer Times List with full features */}
      <section className={`card ${styles.prayerList}`}>
        <div className={styles.sectionHeader} style={{ marginBottom: 0, paddingBottom: '1rem' }}>
          <h3>مواقيت الصلاة</h3>
          {dayOffset === 0 && (
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
              isDone={dayOffset === 0 ? isPrayerDone(prayer.id) : false}
              isNext={dayOffset === 0 && nextPrayer?.id === prayer.id}
              currentTime={currentDate}
              onToggle={togglePrayer}
              readOnly={dayOffset !== 0}
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

