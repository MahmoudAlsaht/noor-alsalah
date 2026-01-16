'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { usePrayerTimes, getPrayersForDate } from '@/hooks/usePrayerTimes';
import { usePrayerTracker } from '@/hooks/usePrayerTracker';
import { useQuranProgress } from '@/hooks/useQuranProgress';
import { useAlarmSound } from '@/hooks/useAlarmSound';
import { useNotifications } from '@/hooks/useNotifications';
import { useAlarmSettings } from '@/hooks/useAlarmSettings';
import { usePrayerReminder } from '@/hooks/usePrayerReminder';
import { useWidgetSync } from '@/hooks/useWidgetSync';
import { useOverlayPermission } from '@/hooks/useOverlayPermission';
import { isNativeApp } from '@/lib/platform';
import { WebHome } from '@/components/WebHome';
import { NativeHome } from '@/components/NativeHome';
import styles from './page.module.css';

export default function Home() {
  const { settings } = useAlarmSettings();
  const { prayers: todayPrayers, nextPrayer, timeRemaining, currentDate, isLoading } = usePrayerTimes({ format: settings.timeFormat });
  const { currentPage, markPageRead, quranComUrl } = useQuranProgress();
  const { permission, scheduleNotification, cancelNotification } = useNotifications();
  const { selectedSound } = useAlarmSound();
  const { granted: overlayGranted, requestPermission: requestOverlay } = useOverlayPermission();

  // Day Navigation State (-1: Yesterday, 0: Today, 1: Tomorrow)
  const [dayOffset, setDayOffset] = useState(0);

  // Calculate target date based on offset
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  // Determine which prayers to show based on selected day
  const displayedPrayers = useMemo(() => {
    if (dayOffset === 0) return todayPrayers;
    return getPrayersForDate(targetDate, settings.timeFormat);
  }, [dayOffset, todayPrayers, targetDate, settings.timeFormat]);

  // Prayer tracker now uses the selected date and current prayers for auto-unmark logic
  const { isPrayerDone, togglePrayer, completedCount, totalCount } = usePrayerTracker(targetDate, displayedPrayers);

  /**
   * Toggle prayer and immediately cancel/reschedule notifications
   */
  const handleTogglePrayer = useCallback((prayerId: string) => {
    const wasDone = isPrayerDone(prayerId);
    togglePrayer(prayerId as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha');

    if (!wasDone) {
      cancelNotification(prayerId, 'atTime');
      cancelNotification(prayerId, 'beforeEnd');
    }
  }, [isPrayerDone, togglePrayer, cancelNotification]);

  // Sync data to native widget
  useWidgetSync(todayPrayers, currentDate.toLocaleDateString('ar-JO'), nextPrayer);

  // Find current prayer
  const getCurrentPrayer = () => {
    const now = new Date();
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

    // Use selectedSound URI directly as the sound parameter
    const soundFile = selectedSound;

    todayPrayers.forEach((prayer, index) => {
      if (prayer.id === 'sunrise') return;

      if (isPrayerDone(prayer.id)) {
        cancelNotification(prayer.id, 'atTime');
        cancelNotification(prayer.id, 'beforeEnd');
        return;
      }

      const prayerSettings = settings[prayer.id as keyof typeof settings];
      if (typeof prayerSettings !== 'object' || !prayerSettings.enabled) {
        cancelNotification(prayer.id, 'atTime');
        cancelNotification(prayer.id, 'beforeEnd');
        return;
      }

      const timing = prayerSettings.timing;
      const beforeEndMinutes = prayerSettings.beforeEndMinutes || 15;
      const onFireCallback = () => { window.location.href = `/alarm?prayer=${prayer.id}`; };

      if (timing === 'atTime' || timing === 'both') {
        const now = new Date();
        const delay = prayer.time.getTime() - now.getTime();
        if (delay > 0) {
          scheduleNotification(
            `حان وقت صلاة ${prayer.nameAr}`,
            { body: 'حي على الصلاة 🕌', tag: prayer.id },
            prayer.time,
            prayer.id,
            'atTime',
            onFireCallback,
            soundFile
          );
        }
      } else {
        cancelNotification(prayer.id, 'atTime');
      }

      if (timing === 'beforeEnd' || timing === 'both') {
        let nextPrayerTime: Date | null = null;
        for (let i = index + 1; i < todayPrayers.length; i++) {
          if (todayPrayers[i].id !== 'sunrise') {
            nextPrayerTime = todayPrayers[i].time;
            break;
          }
        }

        if (nextPrayerTime) {
          const beforeEndTime = new Date(nextPrayerTime.getTime() - beforeEndMinutes * 60 * 1000);
          if (beforeEndTime.getTime() > Date.now()) {
            scheduleNotification(
              `تذكير: صلاة ${prayer.nameAr}`,
              { body: `باقي ${beforeEndMinutes} دقيقة على خروج الوقت ⏰`, tag: `${prayer.id}-beforeEnd` },
              beforeEndTime,
              prayer.id,
              'beforeEnd',
              onFireCallback,
              '' // Default notification sound for reminders
            );
          }
        }
      } else {
        cancelNotification(prayer.id, 'beforeEnd');
      }
    });

    if (nextPrayer) {
      const isNextPrayerTomorrow = nextPrayer.time.getDate() !== new Date().getDate();
      if (isNextPrayerTomorrow) {
        const prayerSettings = settings[nextPrayer.id as keyof typeof settings];
        if (typeof prayerSettings === 'object' && prayerSettings.enabled && !isPrayerDone(nextPrayer.id)) {
          const soundFile = selectedSound;
          const onFireCallback = () => { window.location.href = `/alarm?prayer=${nextPrayer.id}`; };

          if (prayerSettings.timing === 'atTime' || prayerSettings.timing === 'both') {
            scheduleNotification(
              `حان وقت صلاة ${nextPrayer.nameAr}`,
              { body: 'حي على الصلاة 🕌', tag: `${nextPrayer.id}-tomorrow` },
              nextPrayer.time,
              nextPrayer.id,
              'atTime',
              onFireCallback,
              soundFile
            );
          }
        }
      }
    }
  }, [todayPrayers, nextPrayer, permission, scheduleNotification, cancelNotification, isPrayerDone, settings, selectedSound]);

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

  if (!isNativeApp()) {
    return (
      <WebHome
        currentDate={currentDate}
        nextPrayer={nextPrayer}
        timeRemaining={timeRemaining}
        todayPrayers={todayPrayers}
      />
    );
  }

  return (
    <NativeHome
      currentDate={currentDate}
      nextPrayer={nextPrayer}
      timeRemaining={timeRemaining}
      dayOffset={dayOffset}
      setDayOffset={setDayOffset}
      displayedPrayers={displayedPrayers}
      isPrayerDone={isPrayerDone}
      handleTogglePrayer={handleTogglePrayer}
      completedCount={completedCount}
      totalCount={totalCount}
      overlayGranted={overlayGranted}
      requestOverlay={requestOverlay}
      currentPage={currentPage}
      quranComUrl={quranComUrl}
      markPageRead={markPageRead}
    />
  );
}
