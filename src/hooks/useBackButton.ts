'use client';

import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { useRouter, usePathname } from 'next/navigation';
import { isNativeApp } from '@/lib/platform';

/**
 * useBackButton Hook
 * 
 * Handles Android back button behavior:
 * - If on home page: Double-tap within 2 seconds to exit
 * - If on other pages: Navigate back
 */
export function useBackButton() {
    const router = useRouter();
    const pathname = usePathname();
    const lastBackPress = useRef<number>(0);
    const [showExitToast, setShowExitToast] = useState(false);
    const listenerRef = useRef<{ remove: () => void } | null>(null);

    useEffect(() => {
        if (!isNativeApp()) return;

        const setupListener = async () => {
            listenerRef.current = await App.addListener('backButton', ({ canGoBack }) => {
                console.log('[BackButton] Pressed. Path:', pathname, 'CanGoBack:', canGoBack);

                if (pathname === '/') {
                    // On home page - implement double-back-to-exit
                    const now = Date.now();
                    const timeSinceLastPress = now - lastBackPress.current;

                    if (timeSinceLastPress < 2000) {
                        // Second press within 2 seconds - exit app
                        console.log('[BackButton] Double press - minimizing app');
                        App.minimizeApp();
                    } else {
                        // First press - show toast and wait
                        lastBackPress.current = now;
                        setShowExitToast(true);
                        console.log('[BackButton] First press - waiting for second');

                        // Hide toast after 2 seconds
                        setTimeout(() => {
                            setShowExitToast(false);
                        }, 2000);
                    }
                } else {
                    // Not on home page - navigate back
                    console.log('[BackButton] Navigating back');
                    router.back();
                }
            });
        };

        setupListener();

        return () => {
            if (listenerRef.current) {
                listenerRef.current.remove();
            }
        };
    }, [pathname, router]);

    return { showExitToast };
}
