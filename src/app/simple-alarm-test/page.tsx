'use client';

import { useState, useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from '@/lib/platform';
import { useAlarmSound } from '@/hooks/useAlarmSound';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// AlarmScheduler plugin interface (uses Native AlarmManager)
interface AlarmSchedulerPlugin {
    scheduleAlarm(options: {
        id: number;
        triggerTime: number;
        prayerId: string;
        prayerName: string;
        sound: string;
    }): Promise<{ success: boolean; id: number }>;
    cancelAlarm(options: { id: number }): Promise<{ success: boolean }>;
}

// OverlayPermission plugin interface
interface OverlayPermissionPlugin {
    canDrawOverlays(): Promise<{ value: boolean }>;
    requestOverlayPermission(): Promise<{ opened: boolean }>;
}

const AlarmScheduler = registerPlugin<AlarmSchedulerPlugin>('AlarmScheduler');
const OverlayPermission = registerPlugin<OverlayPermissionPlugin>('OverlayPermission');

/**
 * Simple Alarm Test Page
 * 
 * Uses Native AlarmManager to schedule alarms that will:
 * - Wake up the device
 * - Open the app over lock screen
 * - Show the /alarm page with sound
 */
export default function SimpleAlarmTest() {
    const { selectedSound, soundName, pickSystemRingtone } = useAlarmSound();
    const [seconds, setSeconds] = useState(30);
    const [status, setStatus] = useState('جاهز');
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
    const [overlayGranted, setOverlayGranted] = useState(false);

    const checkOverlayPermission = async () => {
        try {
            const result = await OverlayPermission.canDrawOverlays();
            setOverlayGranted(result.value);
        } catch (e) {
            console.error('Overlay check failed:', e);
        }
    };

    // Check overlay permission on mount
    useEffect(() => {
        if (!isNativeApp()) return;

        const init = async () => {
            await checkOverlayPermission();
        };
        init();
    }, []);

    const requestOverlay = async () => {
        try {
            const check = await OverlayPermission.canDrawOverlays();
            if (check.value) {
                setOverlayGranted(true);
                setStatus('✅ إذن العرض فوق التطبيقات ممنوح');
                return;
            }
            await OverlayPermission.requestOverlayPermission();
            setStatus('📋 فعّل الإذن ثم ارجع');
        } catch (e) {
            setStatus(`❌ ${e}`);
        }
    };

    /**
     * Schedule alarm using Native AlarmManager
     */
    const startAlarm = async () => {
        try {
            if (!isNativeApp()) {
                alert('❌ يعمل فقط على التطبيق');
                return;
            }

            if (!overlayGranted) {
                alert('⚠️ يرجى تفعيل إذن العرض فوق التطبيقات أولاً');
                return;
            }

            const fireTime = new Date(Date.now() + seconds * 1000);
            const triggerTimeMs = fireTime.getTime();

            // Use selectedSound URI directly
            const soundName = selectedSound;

            // Direct call to native plugin
            const result = await AlarmScheduler.scheduleAlarm({
                id: 99999,
                triggerTime: triggerTimeMs,
                prayerId: 'test',
                prayerName: 'اختبار',
                sound: soundName,
            });

            console.log('✅ Alarm scheduled:', result);

            setIsScheduled(true);
            setScheduledTime(fireTime);
            setStatus(`✅ سيرن في ${fireTime.toLocaleTimeString()} (صوت: ${soundName})`);

        } catch (e: unknown) {
            const error = e as Error;
            console.error('Schedule failed:', error);
            setStatus(`❌ فشل: ${error.message}`);
        }
    };

    /**
     * Cancel scheduled alarm
     */
    const cancelAlarm = async () => {
        try {
            await AlarmScheduler.cancelAlarm({ id: 99999 });
            setIsScheduled(false);
            setScheduledTime(null);
            setStatus('تم الإلغاء');
        } catch (e) {
            console.error('Cancel failed:', e);
        }
    };

    // Non-native fallback
    if (!isNativeApp()) {
        return (
            <div style={{
                padding: 40,
                textAlign: 'center',
                backgroundColor: '#0f172a',
                minHeight: '100vh',
                color: 'white'
            }}>
                <h1>⏰ اختبار المنبه</h1>
                <p>هذه الصفحة تعمل فقط على تطبيق الأندرويد</p>
            </div>
        );
    }

    return (
        <div style={{
            padding: 20,
            fontFamily: 'system-ui, sans-serif',
            direction: 'rtl',
            backgroundColor: '#0f172a',
            minHeight: '100vh',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Back Button */}
            <Link
                href="/"
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    color: 'white'
                }}
            >
                <ArrowRight size={28} />
            </Link>

            <h1 style={{ fontSize: 28, marginBottom: 10 }}>⏰ اختبار المنبه</h1>

            {/* Status */}
            <p style={{
                color: status.includes('✅') ? '#22c55e' :
                    status.includes('❌') || status.includes('⚠️') ? '#ef4444' : '#94a3b8',
                marginBottom: 10,
                textAlign: 'center'
            }}>
                {status}
            </p>

            {/* Overlay Permission Status */}
            <p style={{
                color: overlayGranted ? '#22c55e' : '#f97316',
                marginBottom: 20,
                fontSize: 14
            }}>
                {overlayGranted ? '✅ إذن العرض فوق التطبيقات ممنوح' : '⚠️ إذن العرض فوق التطبيقات مطلوب'}
            </p>

            {isScheduled && scheduledTime ? (
                /* Scheduled State */
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: 50,
                        fontWeight: 'bold',
                        color: '#22c55e',
                        marginBottom: 10
                    }}>
                        {scheduledTime.toLocaleTimeString()}
                    </div>
                    <p style={{ color: '#94a3b8', marginBottom: 30 }}>
                        🚀 موعد الرنين - أغلق التطبيق أو أقفل الهاتف!
                    </p>
                    <button
                        onClick={cancelAlarm}
                        style={{
                            padding: '15px 50px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 18,
                            cursor: 'pointer'
                        }}
                    >
                        إلغاء
                    </button>
                </div>
            ) : (
                /* Setup State */
                <>
                    {/* Overlay Permission Button (if not granted) */}
                    {!overlayGranted && (
                        <button
                            onClick={requestOverlay}
                            style={{
                                width: '100%',
                                maxWidth: 300,
                                padding: 15,
                                backgroundColor: '#f97316',
                                color: 'white',
                                border: 'none',
                                borderRadius: 12,
                                fontSize: 16,
                                marginBottom: 30,
                                cursor: 'pointer'
                            }}
                        >
                            🖼️ تفعيل إذن العرض فوق التطبيقات
                        </button>
                    )}

                    {/* Sound Selector */}
                    <div style={{ marginBottom: 20, textAlign: 'center' }}>
                        <p style={{ color: '#94a3b8', marginBottom: 5 }}>صوت التنبيه:</p>
                        <div style={{
                            padding: '10px 20px',
                            borderRadius: 12,
                            backgroundColor: '#334155',
                            color: 'white',
                            border: '1px solid #475569',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 15
                        }}>
                            <span style={{ fontWeight: 'bold' }}>{soundName || 'نغمة النظام'}</span>
                            <button
                                onClick={pickSystemRingtone}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: 8,
                                    backgroundColor: '#6366f1',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 14
                                }}
                            >
                                تغيير
                            </button>
                        </div>
                    </div>

                    {/* Seconds Input */}
                    <input
                        type="number"
                        min={5}
                        max={3600}
                        value={seconds}
                        onChange={(e) => setSeconds(Number(e.target.value))}
                        style={{
                            width: 180,
                            padding: 20,
                            fontSize: 40,
                            textAlign: 'center',
                            borderRadius: 15,
                            border: 'none',
                            marginBottom: 10
                        }}
                    />
                    <p style={{ color: '#94a3b8', marginBottom: 20 }}>ثانية</p>

                    {/* Quick Options */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>
                        {[10, 30, 60, 300].map((s) => (
                            <button
                                key={s}
                                onClick={() => setSeconds(s)}
                                style={{
                                    padding: '10px 18px',
                                    backgroundColor: seconds === s ? '#6366f1' : '#374151',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                {s < 60 ? `${s}ث` : `${s / 60}د`}
                            </button>
                        ))}
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={startAlarm}
                        disabled={!overlayGranted}
                        style={{
                            width: 200,
                            padding: 20,
                            backgroundColor: overlayGranted ? '#22c55e' : '#374151',
                            color: 'white',
                            border: 'none',
                            borderRadius: 15,
                            fontSize: 22,
                            fontWeight: 'bold',
                            cursor: overlayGranted ? 'pointer' : 'not-allowed'
                        }}
                    >
                        🚀 جدولة المنبه
                    </button>
                </>
            )}

            {/* Instructions */}
            <div style={{
                position: 'absolute',
                bottom: 30,
                padding: 15,
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderRadius: 10,
                maxWidth: 320,
                textAlign: 'center'
            }}>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                    💡 بعد جدولة المنبه، أغلق التطبيق أو أقفل الهاتف.
                    <br />التطبيق سيفتح تلقائياً عند الموعد!
                </p>
            </div>
        </div>
    );
}
