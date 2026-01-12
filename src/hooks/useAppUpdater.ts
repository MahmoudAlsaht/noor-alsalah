'use client';

import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { isNativeApp } from '../lib/platform';

// IMPORTANT: Replace this with your actual deployed website URL
// The app needs to know where to check for updates
const UPDATE_HOST = 'https://noor-alsalah-family.vercel.app'; // Placeholder, user should update

interface VersionInfo {
    version: string;
    build: number;
    releaseNote: string;
    downloadUrl: string;
}

export function useAppUpdater() {
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        if (!isNativeApp()) return;

        const checkForUpdate = async () => {
            try {
                setIsChecking(true);

                // 1. Get current app version
                const appInfo = await App.getInfo();
                const currentVersion = appInfo.version; // e.g., "0.1.0"

                // 2. Fetch remote version info
                // Use time param to bypass cache
                const response = await fetch(`${UPDATE_HOST}/version.json?t=${Date.now()}`);
                if (!response.ok) throw new Error('Failed to fetch update info');

                const remoteInfo: VersionInfo = await response.json();

                // 3. Compare versions
                if (shouldUpdate(currentVersion, remoteInfo.version)) {
                    // 4. Prompt user
                    const { value: confirmed } = await Dialog.confirm({
                        title: 'تحديث جديد متوفر 🚀',
                        message: `إصدار جديد ${remoteInfo.version} متاح.\n\nالجديد: ${remoteInfo.releaseNote}\n\nهل تريد التحميل والتثبيت الآن؟`,
                        okButtonTitle: 'نعم، حدث الآن',
                        cancelButtonTitle: 'لاحقاً'
                    });

                    if (confirmed) {
                        await downloadAndInstall(remoteInfo.downloadUrl);
                    }
                }

            } catch (error) {
                console.error('Update check failed:', error);
            } finally {
                setIsChecking(false);
            }
        };

        checkForUpdate();
    }, []);

    const downloadAndInstall = async (paramsUrl: string) => {
        try {
            const url = paramsUrl.startsWith('http') ? paramsUrl : `${UPDATE_HOST}${paramsUrl}`;
            const path = 'noor-update.apk';

            // 1. Download file
            const download = await Filesystem.downloadFile({
                path,
                directory: Directory.Cache,
                url,
            });

            if (download.path) {
                // 2. Open APK to install
                await FileOpener.open({
                    filePath: download.path,
                    contentType: 'application/vnd.android.package-archive',
                    openWithDefault: true,
                });
            }

        } catch (error) {
            console.error('Download/Install failed:', error);
            await Dialog.alert({
                title: 'خطأ',
                message: 'فشل تحميل التحديث. يرجى المحاولة لاحقاً.'
            });
        }
    };

    // Helper: Simple semantic version comparison
    const shouldUpdate = (current: string, remote: string): boolean => {
        const cParts = current.split('.').map(Number);
        const rParts = remote.split('.').map(Number);

        for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
            const c = cParts[i] || 0;
            const r = rParts[i] || 0;
            if (r > c) return true;
            if (r < c) return false;
        }
        return false;
    };

    return { isChecking };
}
