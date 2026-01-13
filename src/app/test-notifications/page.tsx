'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

export default function TestNotifications() {
    const { scheduleNotification, requestPermission, permission } = useNotifications();
    const [status, setStatus] = useState('');

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

    return (
        <div style={{ padding: 20 }}>
            <h1>Notification Tester</h1>
            <p>Status: {status}</p>
            <p>Permission: {permission}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => simulateNotification('adhan', 'Test Adhan')}>Test Adhan (5s)</button>
                <button onClick={() => simulateNotification('gentle', 'Test Gentle')}>Test Gentle (5s)</button>
                <button onClick={() => simulateNotification('default', 'Test Default')}>Test Default (5s)</button>
            </div>
        </div>
    );
}
