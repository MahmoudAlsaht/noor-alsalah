'use client';

import { useState, useEffect, useCallback } from 'react';
import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from '../lib/platform';

// Define the Native Plugin Interface
interface OverlayPermissionPlugin {
    checkOverlayPermission(): Promise<{ granted: boolean }>;
    requestOverlayPermission(): Promise<void>;
}

// Register the plugin
const OverlayPermission = registerPlugin<OverlayPermissionPlugin>('OverlayPermission');

export function useOverlayPermission() {
    const [granted, setGranted] = useState<boolean>(true); // Default to true to avoid flash, check confirms later
    const [loading, setLoading] = useState(true);

    const checkPermission = useCallback(async () => {
        if (!isNativeApp()) {
            setGranted(true);
            setLoading(false);
            return;
        }

        try {
            const result = await OverlayPermission.checkOverlayPermission();
            console.log('[Overlay] Permission status:', result.granted);
            setGranted(result.granted);
        } catch (e) {
            console.error('[Overlay] Failed to check permission:', e);
            // Default to true if check fails to avoid blocking user unnecessarily
            // setGranted(true); 
        } finally {
            setLoading(false);
        }
    }, []);

    const requestPermission = useCallback(async () => {
        if (!isNativeApp()) return;
        try {
            await OverlayPermission.requestOverlayPermission();
            // Re-check after a short delay or rely on resume event
        } catch (e) {
            console.error('[Overlay] Failed to request permission:', e);
        }
    }, []);

    useEffect(() => {
        checkPermission();

        // Check again when app resumes (user comes back from settings)
        const handleResume = () => {
            console.log('[Overlay] App resumed, re-checking permission...');
            checkPermission();
        };

        document.addEventListener('resume', handleResume);
        return () => document.removeEventListener('resume', handleResume);
    }, [checkPermission]);

    return {
        granted,
        loading,
        requestPermission,
        checkPermission
    };
}
