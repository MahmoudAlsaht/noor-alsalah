import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuranProgress } from '../hooks/useQuranProgress';

describe('useQuranProgress', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should start at page 1', () => {
        const { result } = renderHook(() => useQuranProgress());

        expect(result.current.currentPage).toBe(1);
        expect(result.current.totalPages).toBe(604);
    });

    it('should increment page on markPageRead', () => {
        const { result } = renderHook(() => useQuranProgress());

        act(() => {
            result.current.markPageRead();
        });

        expect(result.current.currentPage).toBe(2);
    });

    it('should set specific page', () => {
        const { result } = renderHook(() => useQuranProgress());

        act(() => {
            result.current.setPage(100);
        });

        expect(result.current.currentPage).toBe(100);
    });

    it('should reset progress', () => {
        const { result } = renderHook(() => useQuranProgress());

        act(() => {
            result.current.setPage(250);
        });

        expect(result.current.currentPage).toBe(250);

        act(() => {
            result.current.resetProgress();
        });

        expect(result.current.currentPage).toBe(1);
    });

    it('should generate correct quran.com URL', () => {
        const { result } = renderHook(() => useQuranProgress());

        act(() => {
            result.current.setPage(45);
        });

        expect(result.current.quranComUrl).toBe('https://quran.com/page/45');
    });

    it('should calculate progress percentage', () => {
        const { result } = renderHook(() => useQuranProgress());

        act(() => {
            result.current.setPage(302); // Halfway
        });

        expect(result.current.progressPercentage).toBe(50);
    });

    it('should wrap to page 1 after completing khatm', () => {
        const { result } = renderHook(() => useQuranProgress());

        act(() => {
            result.current.setPage(604); // Last page
        });

        act(() => {
            result.current.markPageRead();
        });

        expect(result.current.currentPage).toBe(1);
    });
});
