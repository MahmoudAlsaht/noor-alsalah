import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrayerTracker, TRACKABLE_PRAYERS } from '../hooks/usePrayerTracker';

describe('usePrayerTracker', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should initialize with no prayers done', () => {
        const { result } = renderHook(() => usePrayerTracker());

        expect(result.current.completedCount).toBe(0);
        expect(result.current.totalCount).toBe(5);
        expect(result.current.completionPercentage).toBe(0);
    });

    it('should toggle prayer as done', async () => {
        const { result } = renderHook(() => usePrayerTracker());

        act(() => {
            result.current.togglePrayer('fajr');
        });

        expect(result.current.isPrayerDone('fajr')).toBe(true);
        expect(result.current.completedCount).toBe(1);
    });

    it('should untoggle prayer when clicked again', () => {
        const { result } = renderHook(() => usePrayerTracker());

        act(() => {
            result.current.togglePrayer('fajr');
        });

        expect(result.current.isPrayerDone('fajr')).toBe(true);

        act(() => {
            result.current.togglePrayer('fajr');
        });

        expect(result.current.isPrayerDone('fajr')).toBe(false);
    });

    it('should track multiple prayers', () => {
        const { result } = renderHook(() => usePrayerTracker());

        act(() => {
            result.current.togglePrayer('fajr');
            result.current.togglePrayer('dhuhr');
            result.current.togglePrayer('asr');
        });

        expect(result.current.completedCount).toBe(3);
        expect(result.current.completionPercentage).toBe(60);
    });

    it('should calculate 100% when all prayers are done', () => {
        const { result } = renderHook(() => usePrayerTracker());

        act(() => {
            TRACKABLE_PRAYERS.forEach((prayer) => {
                result.current.togglePrayer(prayer);
            });
        });

        expect(result.current.completedCount).toBe(5);
        expect(result.current.completionPercentage).toBe(100);
    });
});
