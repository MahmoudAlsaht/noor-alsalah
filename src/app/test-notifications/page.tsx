'use client';

import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { isNativeApp } from '@/lib/platform';
import { LocalNotifications } from '@capacitor/local-notifications';

interface ScheduledItem {
    prayer: string;
    type: 'adhan' | 'reminder';
    fireAt: Date;
    fired: boolean;
}

export default function TestNotifications() {
    const { scheduleNotification, requestPermission, permission } = useNotifications();
    const [status, setStatus] = useState('جاهز');
    const [mounted, setMounted] = useState(false);
    const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // eslint-disable-next-line
        setMounted(true);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // Update countdown every second
    useEffect(() => {
        if (scheduledItems.length === 0) return;

        intervalRef.current = setInterval(() => {
            const now = Date.now();
            setScheduledItems(prev => prev.map(item => ({
                ...item,
                fired: item.fireAt.getTime() <= now
            })));

            // Calculate next notification countdown
            const next = scheduledItems.find(item => item.fireAt.getTime() > now);
            if (next) {
                setCountdown(Math.ceil((next.fireAt.getTime() - now) / 1000));
            } else {
                setCountdown(null);
            }
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [scheduledItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!mounted) return null;

    const simulateSingleNotification = async (type: 'adhan' | 'gentle' | 'alert', title: string) => {
        setStatus(`جاري جدولة ${type}...`);

        if (permission !== 'granted') {
            await requestPermission();
        }

        const now = new Date();
        const fireTime = new Date(now.getTime() + 5000); // Fire in 5 seconds

        // Sound names WITHOUT extension for native
        let soundName = 'adhan';
        if (type === 'gentle') soundName = 'gentle';
        if (type === 'alert') soundName = 'alert';

        await scheduleNotification(
            title,
            { body: 'هذا تنبيه تجريبي...' },
            fireTime,
            `test-${type}-${Date.now()}`,
            'atTime',
            () => console.log('Notification Fired!'),
            soundName
        );

        setStatus(`تم جدولة ${type} - سيصل بعد 5 ثواني`);
    };

    const simulateFullDay = async () => {
        setStatus('جاري جدولة 10 تنبيهات...');

        if (permission !== 'granted') {
            await requestPermission();
        }

        const prayers = [
            { id: 'fajr', name: 'الفجر' },
            { id: 'dhuhr', name: 'الظهر' },
            { id: 'asr', name: 'العصر' },
            { id: 'maghrib', name: 'المغرب' },
            { id: 'isha', name: 'العشاء' },
        ];

        const now = Date.now();
        let delay = 10000; // Start in 10 seconds
        const items: ScheduledItem[] = [];

        for (const prayer of prayers) {
            const adhanTime = new Date(now + delay);

            // 1. Adhan (At Time) - صوت الأذان
            await scheduleNotification(
                `حان وقت صلاة ${prayer.name}`,
                { body: 'حي على الصلاة 🕌', tag: `${prayer.id}-test` },
                adhanTime,
                `test-${prayer.id}`,
                'atTime',
                () => console.log(`${prayer.name} Adhan Fired`),
                'adhan' // بدون .mp3
            );
            items.push({
                prayer: prayer.name,
                type: 'adhan',
                fireAt: adhanTime,
                fired: false
            });
            delay += 12000; // +12 seconds

            const reminderTime = new Date(now + delay);

            // 2. Reminder (Before End) - صوت التنبيه
            await scheduleNotification(
                `تذكير: صلاة ${prayer.name}`,
                { body: 'باقي 15 دقيقة على خروج الوقت ⏰', tag: `${prayer.id}-warning-test` },
                reminderTime,
                `test-${prayer.id}`,
                'beforeEnd',
                () => console.log(`${prayer.name} Warning Fired`),
                'alert' // بدون .mp3
            );
            items.push({
                prayer: prayer.name,
                type: 'reminder',
                fireAt: reminderTime,
                fired: false
            });
            delay += 12000; // +12 seconds
        }

        setScheduledItems(items);
        setStatus(`✅ تم جدولة 10 تنبيهات! الأول بعد 10 ث، الأخير بعد ${Math.round(delay / 1000)} ث`);
    };

    const clearAll = () => {
        setScheduledItems([]);
        setCountdown(null);
        setStatus('تم مسح القائمة');
    };

    const showPendingNotifications = async () => {
        if (!isNativeApp()) {
            setStatus('هذا الاختبار يعمل فقط على التطبيق');
            return;
        }
        try {
            const pending = await LocalNotifications.getPending();
            const count = pending.notifications.length;
            setPendingCount(count);
            setStatus(`📋 ${count} تنبيهات مجدولة في النظام`);
            console.log('[Debug] Pending notifications:', pending.notifications);
        } catch (e) {
            console.error('Failed to get pending', e);
            setStatus('فشل في قراءة التنبيهات المعلقة');
        }
    };

    return (
        <div style={{
            padding: 20,
            fontFamily: 'system-ui, sans-serif',
            direction: 'rtl',
            backgroundColor: '#0f172a',
            minHeight: '100vh',
            color: 'white'
        }}>
            <h1 style={{ marginBottom: 10 }}>🔔 محاكاة التنبيهات</h1>

            <div style={{
                backgroundColor: '#1e293b',
                padding: 15,
                borderRadius: 10,
                marginBottom: 20
            }}>
                <p><strong>الحالة:</strong> {status}</p>
                <p><strong>الإذن:</strong> {permission === 'granted' ? '✅ مسموح' : permission === 'denied' ? '❌ مرفوض' : '⏳ ينتظر'}</p>
                <p><strong>المنصة:</strong> {isNativeApp() ? '📱 تطبيق أصلي' : '🌐 متصفح'}</p>
                {countdown !== null && (
                    <p style={{ fontSize: 24, color: '#f59e0b' }}>
                        ⏱️ التنبيه القادم بعد: <strong>{countdown}</strong> ثانية
                    </p>
                )}
                {pendingCount !== null && (
                    <p style={{ color: '#10b981' }}>
                        📋 <strong>{pendingCount}</strong> تنبيهات مجدولة في النظام
                    </p>
                )}
                <button
                    onClick={showPendingNotifications}
                    style={{ ...buttonStyle('#6366f1'), marginTop: 10 }}
                >
                    🔍 عرض التنبيهات المجدولة
                </button>
            </div>

            {/* Single Tests */}
            <div style={{ marginBottom: 20 }}>
                <h3>اختبار فردي (5 ثواني)</h3>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => simulateSingleNotification('adhan', 'اختبار الأذان')}
                        style={buttonStyle('#14b8a6')}
                    >
                        🕌 أذان
                    </button>
                    <button
                        onClick={() => simulateSingleNotification('gentle', 'اختبار هادئ')}
                        style={buttonStyle('#8b5cf6')}
                    >
                        🔔 هادئ
                    </button>
                    <button
                        onClick={() => simulateSingleNotification('alert', 'اختبار تنبيه')}
                        style={buttonStyle('#ef4444')}
                    >
                        ⚠️ تنبيه
                    </button>
                </div>
            </div>

            {/* Full Day Simulation */}
            <div style={{ marginBottom: 20 }}>
                <h3>محاكاة يوم كامل (~2 دقيقة)</h3>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>
                    سيتم جدولة 10 تنبيهات: أذان + تذكير لكل صلاة.<br />
                    أغلق التطبيق بعد الضغط للاختبار!
                </p>
                <button
                    onClick={simulateFullDay}
                    style={{
                        ...buttonStyle('#f59e0b'),
                        width: '100%',
                        fontSize: 18,
                        padding: '15px 20px'
                    }}
                >
                    🚀 ابدأ محاكاة يوم كامل
                </button>
                {scheduledItems.length > 0 && (
                    <button
                        onClick={clearAll}
                        style={{
                            ...buttonStyle('#64748b'),
                            width: '100%',
                            marginTop: 10
                        }}
                    >
                        🗑️ مسح القائمة
                    </button>
                )}
            </div>

            {/* Scheduled Items List */}
            {scheduledItems.length > 0 && (
                <div>
                    <h3>التنبيهات المجدولة:</h3>
                    <div style={{
                        display: 'grid',
                        gap: 8,
                        maxHeight: 300,
                        overflowY: 'auto'
                    }}>
                        {scheduledItems.map((item, i) => (
                            <div
                                key={i}
                                style={{
                                    backgroundColor: item.fired ? '#166534' : '#1e293b',
                                    padding: 10,
                                    borderRadius: 8,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span>
                                    {item.type === 'adhan' ? '🕌' : '⏰'} {item.prayer} - {item.type === 'adhan' ? 'أذان' : 'تذكير'}
                                </span>
                                <span style={{
                                    fontSize: 12,
                                    color: item.fired ? '#86efac' : '#94a3b8'
                                }}>
                                    {item.fired ? '✅ تم الإرسال' : item.fireAt.toLocaleTimeString('ar-JO')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div style={{
                marginTop: 30,
                padding: 15,
                backgroundColor: '#1e3a5f',
                borderRadius: 10,
                borderRight: '4px solid #3b82f6'
            }}>
                <h4 style={{ margin: '0 0 10px 0' }}>📋 تعليمات الاختبار:</h4>
                <ol style={{ margin: 0, paddingRight: 20, lineHeight: 1.8 }}>
                    <li>اضغط على &quot;ابدأ محاكاة يوم كامل&quot;</li>
                    <li>أغلق التطبيق تماماً (اسحب للأعلى)</li>
                    <li>أقفل الشاشة إذا أردت</li>
                    <li>انتظر... يجب أن تسمع 10 تنبيهات</li>
                    <li>الأول بعد 10 ثواني، ثم كل 12 ثانية</li>
                </ol>
            </div>
        </div>
    );
}

const buttonStyle = (bg: string): React.CSSProperties => ({
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
    fontWeight: 'bold'
});
