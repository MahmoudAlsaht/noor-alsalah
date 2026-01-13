'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';

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
    isLoading: boolean;
}

/**
 * useQuranProgress Hook
 * 
 * Tracks Quran reading progress by page number.
 * Persists to Capacitor Preferences.
 */
export function useQuranProgress(): UseQuranProgressReturn {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialMount = useRef(true);

    // Load progress on mount
    useEffect(() => {
        const load = async () => {
            try {
                const { value } = await Preferences.get({ key: STORAGE_KEY });
                if (value) {
                    const page = parseInt(value, 10);
                    if (page >= 1 && page <= TOTAL_QURAN_PAGES) {
                        setCurrentPage(page);
                    }
                } else {
                    // MIGRATION
                    if (typeof window !== 'undefined') {
                        const local = localStorage.getItem(STORAGE_KEY);
                        if (local) {
                            console.log('[Migration] Found quran progress in localStorage, migrating');
                            const page = parseInt(local, 10);
                            if (page >= 1 && page <= TOTAL_QURAN_PAGES) {
                                setCurrentPage(page);
                                await Preferences.set({ key: STORAGE_KEY, value: page.toString() });
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load quran progress', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Save to Preferences when page changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const save = async () => {
            await Preferences.set({
                key: STORAGE_KEY,
                value: currentPage.toString()
            });
        };
        save();
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
        isLoading,
    };
}
