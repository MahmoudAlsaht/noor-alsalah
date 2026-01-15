'use client';

import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativeApp } from '@/lib/platform';

export function StatusBarConfig() {
    useEffect(() => {
        if (!isNativeApp()) return;

        const setStatusBarStyle = async () => {
            try {
                // Style.Dark means "Dark Background" -> "Light Text (White)"
                await StatusBar.setStyle({ style: Style.Dark });

                // Overlay web view (transparent header)
                // This makes the status bar float over the app content
                await StatusBar.setOverlaysWebView({ overlay: false });

                // Construct HEX color for #0f172a (Slate 900 - app background)
                await StatusBar.setBackgroundColor({ color: '#0f172a' });
            } catch (e) {
                // Fails on web or if plugin not available
                console.warn('StatusBar config failed:', e);
            }
        };

        setStatusBarStyle();
    }, []);

    return null;
}
