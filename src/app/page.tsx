'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { useWidgetSync } from '@/hooks/useWidgetSync';
import { useOverlayPermission } from '@/hooks/useOverlayPermission';
import { isNativeApp } from '@/lib/platform';
import { hapticFeedback } from '@/lib/haptics';
import { getHijriDateString } from '@/lib/hijri';
import { PrayerRow } from '@/components/PrayerRow';
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

  // Prayer tracker now uses the selected date
  const { isPrayerDone, togglePrayer, completedCount, totalCount } = usePrayerTracker(targetDate);

  /**
   * Toggle prayer and immediately cancel/reschedule notifications
   * This ensures notifications are cancelled the moment user marks prayer as done
   */
  const handleTogglePrayer = useCallback((prayerId: string) => {
    const wasDone = isPrayerDone(prayerId);

    // Toggle the prayer status
    togglePrayer(prayerId as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha');

    // If prayer wasn't done and now will be marked as done -> cancel notifications
    if (!wasDone) {
      cancelNotification(prayerId, 'atTime');
      cancelNotification(prayerId, 'beforeEnd');
      console.log(`[Notifications] Cancelled for ${prayerId} (marked as done)`);
    }
    // If prayer was done and now will be unmarked -> useEffect will reschedule
  }, [isPrayerDone, togglePrayer, cancelNotification]);

  // Sync data to native widget - ENABLED
  useWidgetSync(todayPrayers, currentDate.toLocaleDateString('ar-JO'), nextPrayer);

  // Determine which prayers to show based on selected day
  const displayedPrayers = useMemo(() => {
    if (dayOffset === 0) return todayPrayers;
    return getPrayersForDate(targetDate, settings.timeFormat);
  }, [dayOffset, todayPrayers, targetDate, settings.timeFormat]);

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
    console.log('[Scheduler] Permission:', permission, 'Prayers:', todayPrayers.length);
    if (permission !== 'granted' || todayPrayers.length === 0) return;
    console.log('[Scheduler] Starting scheduling for', todayPrayers.filter(p => p.id !== 'sunrise').length, 'prayers');

    // Map sound ID to ID expected by useNotifications
    const soundMapping: Record<string, string> = {
      default: 'adhan',
      gentle: 'gentle',
      system: 'system',
      custom: 'alert', // Fallback for custom
    };
    const soundFile = soundMapping[selectedSound] || 'adhan';

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
        const now = new Date();
        const delay = prayer.time.getTime() - now.getTime();

        if (delay > 0) {
          console.log(`[Scheduler] ✅ Scheduling ${prayer.id} atTime for ${prayer.time.toLocaleTimeString()} (in ${Math.round(delay / 60000)} min)`);
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
          console.log(`[Scheduler] ⏭️ Skipping ${prayer.id} atTime - already passed (${Math.round(-delay / 60000)} min ago)`);
        }
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
            console.log(`[Scheduler] ✅ Scheduling ${prayer.id} beforeEnd for ${beforeEndTime.toLocaleTimeString()} (${beforeEndMinutes} min before next)`);
            scheduleNotification(
              `تذكير: صلاة ${prayer.nameAr}`,
              { body: `باقي ${beforeEndMinutes} دقيقة على خروج الوقت ⏰`, tag: `${prayer.id}-beforeEnd` },
              beforeEndTime,
              prayer.id,
              'beforeEnd',
              onFireCallback,
              'alert' // Use simple alert sound for reminders, not Adhan
            );
          } else {
            console.log(`[Scheduler] ⏭️ Skipping ${prayer.id} beforeEnd - already passed`);
          }
        }
      } else {
        cancelNotification(prayer.id, 'beforeEnd');
      }
      // Existing loop for todayPrayers calls scheduleNotification...
    });

    // CRITICAl FIX: Schedule Next Prayer if it belongs to tomorrow (e.g. Fajr)
    // todayPrayers only covers until midnight usually. We need to ensure the immediate next prayer is ALWAYS scheduled.
    if (nextPrayer) {
      // Check if nextPrayer is already covered by todayPrayers logic (same day and future)
      // If nextPrayer is tomorrow, it won't be in the loop above (or delay < 0 for today's instance)
      const isNextPrayerTomorrow = nextPrayer.time.getDate() !== new Date().getDate();

      if (isNextPrayerTomorrow) {
        const prayerSettings = settings[nextPrayer.id as keyof typeof settings];
        if (typeof prayerSettings === 'object' && prayerSettings.enabled && !isPrayerDone(nextPrayer.id)) { // isPrayerDone might need date context? Usually assumes today. For tomorrow, it's definitely not done.

          const soundFile = soundMapping[selectedSound] || 'adhan.mp3';
          const onFireCallback = () => { window.location.href = `/alarm?prayer=${nextPrayer.id}`; };

          // Schedule AT TIME
          if (prayerSettings.timing === 'atTime' || prayerSettings.timing === 'both') {
            console.log(`[Scheduler] 🌙 Scheduling TOMORROW ${nextPrayer.id} at ${nextPrayer.timeFormatted}`);
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

  // Simple Web View - Only shows today's prayer times + countdown + download banner
  if (!isNativeApp()) {
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

        {/* Date Display - Hijri + Gregorian */}
        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '0.85rem',
        }}>
          <div style={{ color: '#14b8a6', fontWeight: 'bold' }}>
            {getHijriDateString(currentDate)}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
            {currentDate.toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <Link href="/settings" className={styles.settingsBtn}>
          <Settings size={20} />
        </Link>
      </header>

      {/* Permission Warning Banner (Native Only) */}
      {!overlayGranted && (
        <div
          style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fdba74',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>مطلوب إذن للمنبه</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#9a3412', margin: 0 }}>
            لضمان عمل المنبه وأنت نائم، يرجى تفعيل إذن "العرض فوق التطبيقات".
          </p>
          <button
            onClick={requestOverlay}
            style={{
              backgroundColor: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              alignSelf: 'flex-start'
            }}
          >
            تفعيل الإذن الآن
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
              onToggle={handleTogglePrayer}
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
          <button className="btn btn-primary" onClick={() => {
            hapticFeedback('light');
            markPageRead();
          }}>
            تم القراءة
          </button>
        </div>
      </section>

      {/* Test Alarm Link - For Development */}
      {process.env.NODE_ENV === 'development' && (
        <Link
          href="/simple-alarm-test"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '12px',
            color: '#6366f1',
            fontSize: '14px',
            marginTop: '20px'
          }}
        >
          ⏰ اختبار المنبه (DEV)
        </Link>
      )}
    </div>
  );
}
