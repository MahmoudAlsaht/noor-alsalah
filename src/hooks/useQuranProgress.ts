'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Total pages in the Quran
 */
const TOTAL_QURAN_PAGES = 604;

/**
 * Storage key
 */
const STORAGE_KEY = 'quran-progress';

/**
 * Hook return type
 */
export interface UseQuranProgressReturn {
    currentPage: number;
    totalPages: number;
    progressPercentage: number;
    markPageRead: () => void;
    setPage: (page: number) => void;
    resetProgress: () => void;
    quranComUrl: string;
}

/**
 * Load page from localStorage (for lazy init)
 */
function loadPage(): number {
    if (typeof window === 'undefined') return 1;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const page = parseInt(stored, 10);
            if (page >= 1 && page <= TOTAL_QURAN_PAGES) {
                return page;
            }
        }
    } catch {
        // Ignore errors
    }
    return 1;
}

/**
 * useQuranProgress Hook
 * 
 * Tracks Quran reading progress by page number.
 * Provides link to quran.com for the current page.
 */
export function useQuranProgress(): UseQuranProgressReturn {
    // Lazy initialization from localStorage
    const [currentPage, setCurrentPage] = useState<number>(() => loadPage());

    // Save to localStorage when page changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, currentPage.toString());
    }, [currentPage]);

    /**
     * Mark current page as read and advance
     */
    const markPageRead = useCallback(() => {
        setCurrentPage((prev) => {
            if (prev >= TOTAL_QURAN_PAGES) {
                // Khatm complete - restart
                return 1;
            }
            return prev + 1;
        });
    }, []);

    /**
     * Set specific page
     */
    const setPage = useCallback((page: number) => {
        if (page >= 1 && page <= TOTAL_QURAN_PAGES) {
            setCurrentPage(page);
        }
    }, []);

    /**
     * Reset progress
     */
    const resetProgress = useCallback(() => {
        setCurrentPage(1);
    }, []);

    // Calculate progress
    const progressPercentage = Math.round((currentPage / TOTAL_QURAN_PAGES) * 100);

    // Generate quran.com URL
    const quranComUrl = `https://quran.com/page/${currentPage}`;

    return {
        currentPage,
        totalPages: TOTAL_QURAN_PAGES,
        progressPercentage,
        markPageRead,
        setPage,
        resetProgress,
        quranComUrl,
    };
}
