'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

export default function TestNotifications() {
    const { scheduleNotification, requestPermission, permission } = useNotifications();
    const [status, setStatus] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const simulateNotification = async (type: 'adhan' | 'gentle' | 'default', title: string) => {
        setStatus(`Simulating ${type}...`);

        // Request permission if needed
        if (permission !== 'granted') {
            await requestPermission();
        }

        const now = new Date();
        const fireTime = new Date(now.getTime() + 5000); // Fire in 5 seconds

        let soundFile = 'adhan.mp3';
        if (type === 'gentle') soundFile = 'gentle.mp3';
        if (type === 'default') soundFile = 'alert.mp3';

        await scheduleNotification(
            title,
            { body: 'Testing notification system...' },
            fireTime,
            `test-${type}-${Date.now()}`,
            'atTime',
            () => console.log('Notification Fired!'),
            soundFile
        );

        setStatus(`Scheduled ${type} in 5 seconds`);
    };

    const simulateFullDay = async () => {
        setStatus('Scheduling 10 notifications...');
        if (permission !== 'granted') await requestPermission();

        const prayers = [
            { id: 'fajr', name: 'الفجر' },
            { id: 'dhuhr', name: 'الظهر' },
            { id: 'asr', name: 'العصر' },
            { id: 'maghrib', name: 'المغرب' },
            { id: 'isha', name: 'العشاء' },
        ];

        const now = Date.now();
        let delay = 10000; // Start in 10s

        for (const prayer of prayers) {
            // 1. Adhan (At Time)
            await scheduleNotification(
                `حان وقت صلاة ${prayer.name}`,
                { body: 'حي على الصلاة 🕌', tag: `${prayer.id}-simulation` },
                new Date(now + delay),
                prayer.id,
                'atTime',
                () => console.log(`${prayer.name} Adhan Fired`),
                'adhan.mp3'
            );
            delay += 10000; // +10s

            // 2. Warning (Before End)
            await scheduleNotification(
                `تذكير: صلاة ${prayer.name}`,
                { body: 'باقي 15 دقيقة على خروج الوقت', tag: `${prayer.id}-warning-simulation` },
                new Date(now + delay),
                prayer.id,
                'beforeEnd',
                () => console.log(`${prayer.name} Warning Fired`),
                'alert.mp3'
            );
            delay += 10000; // +10s
        }

        setStatus(`All 10 notifications scheduled! Starts in 10s, ends in ${delay / 1000}s`);
    };

    return (
        <div style={{ padding: 20 }}>
            <h1>Notification Tester</h1>
            <p>Status: {status}</p>
            <p>Permission: {permission}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => simulateNotification('adhan', 'Test Adhan')}>Test Adhan (5s)</button>
                <button onClick={() => simulateNotification('gentle', 'Test Gentle')}>Test Gentle (5s)</button>
                <button onClick={() => simulateNotification('default', 'Test Default')}>Test Default (5s)</button>

                <hr style={{ margin: '20px 0' }} />

                <button onClick={simulateFullDay} style={{ backgroundColor: '#f59e0b', color: 'black' }}>
                    Simulate Full Day (10 Notifs / 2 mins)
                </button>
            </div>
        </div>
    );
}
