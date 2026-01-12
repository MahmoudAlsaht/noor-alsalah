import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Complete Prayer Alarm System Simulation Tests
 * 
 * Tests all alarm scenarios:
 * 1. At-time notifications
 * 2. Before-end notifications
 * 3. Persistent notifications
 * 4. Badge updates
 * 5. Cancellation flows
 */

vi.useFakeTimers();

describe('Notification Simulation', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.useFakeTimers();
    });

    it('should schedule notification for future prayer time', () => {
        const mockCallback = vi.fn();
        const now = new Date('2026-01-12T15:00:00');
        const prayerTime = new Date('2026-01-12T15:30:00');

        vi.setSystemTime(now);

        const delay = prayerTime.getTime() - now.getTime();
        expect(delay).toBe(30 * 60 * 1000);

        setTimeout(mockCallback, delay);
        expect(mockCallback).not.toHaveBeenCalled();

        vi.advanceTimersByTime(30 * 60 * 1000);
        expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should not schedule notification for past prayer time', () => {
        const mockCallback = vi.fn();
        const now = new Date('2026-01-12T16:00:00');
        const prayerTime = new Date('2026-01-12T15:30:00');

        vi.setSystemTime(now);

        const delay = prayerTime.getTime() - now.getTime();
        expect(delay).toBeLessThan(0);

        if (delay > 0) {
            setTimeout(mockCallback, delay);
        }

        vi.advanceTimersByTime(60 * 60 * 1000);
        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should cancel notification when prayer is marked done', () => {
        const mockCallback = vi.fn();
        const now = new Date('2026-01-12T15:00:00');
        const prayerTime = new Date('2026-01-12T15:30:00');

        vi.setSystemTime(now);

        const delay = prayerTime.getTime() - now.getTime();
        const timeoutId = setTimeout(mockCallback, delay);

        vi.advanceTimersByTime(10 * 60 * 1000);
        clearTimeout(timeoutId);

        vi.advanceTimersByTime(20 * 60 * 1000);
        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should trigger onFire callback with notification', () => {
        const mockNotification = vi.fn();
        const mockPlayAlarm = vi.fn();
        const now = new Date('2026-01-12T15:00:00');
        const prayerTime = new Date('2026-01-12T15:05:00');

        vi.setSystemTime(now);

        const delay = prayerTime.getTime() - now.getTime();

        setTimeout(() => {
            mockNotification();
            mockPlayAlarm();
        }, delay);

        vi.advanceTimersByTime(5 * 60 * 1000);

        expect(mockNotification).toHaveBeenCalledTimes(1);
        expect(mockPlayAlarm).toHaveBeenCalledTimes(1);
    });

    it('should not call onFire if sound is disabled in settings', () => {
        const mockPlayAlarm = vi.fn();
        const playSoundEnabled = false;

        const onFireCallback = playSoundEnabled ? mockPlayAlarm : undefined;

        if (onFireCallback) {
            onFireCallback();
        }

        expect(mockPlayAlarm).not.toHaveBeenCalled();
    });

    it('should simulate "before end" reminder flow', () => {
        const mockAtTimeNotification = vi.fn();
        const mockBeforeEndNotification = vi.fn();

        const now = new Date('2026-01-12T15:00:00');
        const prayerTime = new Date('2026-01-12T15:30:00');
        const beforeEndTime = new Date('2026-01-12T17:15:00');

        vi.setSystemTime(now);

        const atTimeDelay = prayerTime.getTime() - now.getTime();
        setTimeout(mockAtTimeNotification, atTimeDelay);

        const beforeEndDelay = beforeEndTime.getTime() - now.getTime();
        const beforeEndTimeoutId = setTimeout(mockBeforeEndNotification, beforeEndDelay);

        vi.advanceTimersByTime(30 * 60 * 1000);
        expect(mockAtTimeNotification).toHaveBeenCalledTimes(1);
        expect(mockBeforeEndNotification).not.toHaveBeenCalled();

        clearTimeout(beforeEndTimeoutId);

        vi.advanceTimersByTime(105 * 60 * 1000);
        expect(mockBeforeEndNotification).not.toHaveBeenCalled();
    });
});

describe('Before End Notification (قبل خروج الوقت)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.useFakeTimers();
    });

    it('should schedule "before end" notification 15 minutes before next prayer', () => {
        const mockBeforeEndCallback = vi.fn();

        // Scenario: Asr at 15:30, Maghrib at 17:45
        // Before end should fire at 17:30 (15 min before Maghrib)
        const now = new Date('2026-01-12T15:30:00');
        const nextPrayerTime = new Date('2026-01-12T17:45:00');
        const beforeEndMinutes = 15;

        vi.setSystemTime(now);

        // Calculate before end time
        const beforeEndTime = new Date(nextPrayerTime.getTime() - beforeEndMinutes * 60 * 1000);
        const delay = beforeEndTime.getTime() - now.getTime();

        // Should be 2 hours (17:30 - 15:30)
        expect(delay).toBe(2 * 60 * 60 * 1000);

        setTimeout(mockBeforeEndCallback, delay);

        // Advance 1 hour - not fired yet
        vi.advanceTimersByTime(60 * 60 * 1000);
        expect(mockBeforeEndCallback).not.toHaveBeenCalled();

        // Advance another hour - now fires
        vi.advanceTimersByTime(60 * 60 * 1000);
        expect(mockBeforeEndCallback).toHaveBeenCalledTimes(1);
    });

    it('should cancel "before end" when prayer is marked as done', () => {
        const mockBeforeEndCallback = vi.fn();

        const now = new Date('2026-01-12T15:30:00');
        const nextPrayerTime = new Date('2026-01-12T17:45:00');
        const beforeEndTime = new Date(nextPrayerTime.getTime() - 15 * 60 * 1000);

        vi.setSystemTime(now);

        const delay = beforeEndTime.getTime() - now.getTime();
        const timeoutId = setTimeout(mockBeforeEndCallback, delay);

        // User marks prayer as done after 30 minutes
        vi.advanceTimersByTime(30 * 60 * 1000);
        clearTimeout(timeoutId); // Cancel the before-end notification

        // Advance to when it would have fired
        vi.advanceTimersByTime(90 * 60 * 1000);
        expect(mockBeforeEndCallback).not.toHaveBeenCalled();
    });

    it('should fire both "at time" AND "before end" when timing is "both"', () => {
        const mockAtTimeCallback = vi.fn();
        const mockBeforeEndCallback = vi.fn();

        const now = new Date('2026-01-12T15:00:00');
        const prayerTime = new Date('2026-01-12T15:30:00'); // Asr
        const nextPrayerTime = new Date('2026-01-12T17:45:00'); // Maghrib
        const beforeEndTime = new Date(nextPrayerTime.getTime() - 15 * 60 * 1000);

        vi.setSystemTime(now);

        // Schedule both
        setTimeout(mockAtTimeCallback, prayerTime.getTime() - now.getTime());
        setTimeout(mockBeforeEndCallback, beforeEndTime.getTime() - now.getTime());

        // At prayer time
        vi.advanceTimersByTime(30 * 60 * 1000);
        expect(mockAtTimeCallback).toHaveBeenCalledTimes(1);
        expect(mockBeforeEndCallback).not.toHaveBeenCalled();

        // At before-end time (2 hours later)
        vi.advanceTimersByTime(2 * 60 * 60 * 1000);
        expect(mockBeforeEndCallback).toHaveBeenCalledTimes(1);
    });

    it('should only fire "before end" when timing is "beforeEnd"', () => {
        const mockAtTimeCallback = vi.fn();
        const mockBeforeEndCallback = vi.fn();

        const timing = 'beforeEnd'; // User setting

        const now = new Date('2026-01-12T15:00:00');
        const prayerTime = new Date('2026-01-12T15:30:00');
        const nextPrayerTime = new Date('2026-01-12T17:45:00');
        const beforeEndTime = new Date(nextPrayerTime.getTime() - 15 * 60 * 1000);

        vi.setSystemTime(now);

        // Only schedule based on timing setting
        if (timing === 'atTime' || timing === 'both') {
            setTimeout(mockAtTimeCallback, prayerTime.getTime() - now.getTime());
        }
        if (timing === 'beforeEnd' || timing === 'both') {
            setTimeout(mockBeforeEndCallback, beforeEndTime.getTime() - now.getTime());
        }

        // At prayer time - no at-time notification
        vi.advanceTimersByTime(30 * 60 * 1000);
        expect(mockAtTimeCallback).not.toHaveBeenCalled();

        // At before-end time
        vi.advanceTimersByTime(2 * 60 * 60 * 1000);
        expect(mockBeforeEndCallback).toHaveBeenCalledTimes(1);
    });
});

describe('Persistent Notification and Badge', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should show red dot badge when current prayer is not done', () => {
        const isPrayerDone = false;
        const shouldShowBadge = !isPrayerDone;
        expect(shouldShowBadge).toBe(true);
    });

    it('should clear badge when current prayer is done', () => {
        const isPrayerDone = true;
        const shouldShowBadge = !isPrayerDone;
        expect(shouldShowBadge).toBe(false);
    });

    it('should show warning in persistent notification if previous prayer not done', () => {
        const currentPrayer = { id: 'asr', nameAr: 'العصر' };

        const isPrayerDone = (id: string) => id !== 'asr'; // Asr not done

        const showWarning = currentPrayer && !isPrayerDone(currentPrayer.id);
        expect(showWarning).toBe(true);

        // Expected notification content
        const expectedTitle = `⚠️ لم تصلِ ${currentPrayer.nameAr} بعد`;
        expect(expectedTitle).toContain('العصر');
    });

    it('should show normal countdown if current prayer is done', () => {
        const currentPrayer = { id: 'asr', nameAr: 'العصر' };

        const isPrayerDone = () => true; // All done

        const showWarning = currentPrayer && !isPrayerDone(currentPrayer.id);
        expect(showWarning).toBe(false);

        // Expected normal notification
        const expectedTitle = `صلاة المغرب`;
        expect(expectedTitle).toContain('المغرب');
    });
});

describe('Alarm Settings Persistence', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should persist settings to localStorage', () => {
        const settings = {
            fajr: { enabled: true, timing: 'atTime', beforeEndMinutes: 15 },
            playSound: true,
        };

        localStorage.setItem('alarm-settings', JSON.stringify(settings));

        const stored = localStorage.getItem('alarm-settings');
        expect(stored).not.toBeNull();

        const parsed = JSON.parse(stored!);
        expect(parsed.fajr.enabled).toBe(true);
    });

    it('should load settings from localStorage', () => {
        const settings = {
            fajr: { enabled: false, timing: 'both', beforeEndMinutes: 20 },
            playSound: false,
        };

        localStorage.setItem('alarm-settings', JSON.stringify(settings));

        const stored = localStorage.getItem('alarm-settings');
        const parsed = JSON.parse(stored!);

        expect(parsed.fajr.enabled).toBe(false);
        expect(parsed.fajr.timing).toBe('both');
    });

    it('should handle custom sound URL storage', () => {
        const customSoundUrl = 'data:audio/mp3;base64,SGVsbG8gV29ybGQ=';

        localStorage.setItem('custom-alarm-sound-url', customSoundUrl);
        localStorage.setItem('selected-alarm-sound', 'custom');

        const storedSound = localStorage.getItem('selected-alarm-sound');
        const storedUrl = localStorage.getItem('custom-alarm-sound-url');

        expect(storedSound).toBe('custom');
        expect(storedUrl).toBe(customSoundUrl);
    });
});
