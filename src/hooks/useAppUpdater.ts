'use client';

import { useState, useEffect } from 'react';
import { App } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { isNativeApp } from '../lib/platform';

// IMPORTANT: Replace this with your actual deployed website URL
// The app needs to know where to check for updates
const UPDATE_HOST = 'https://noor-alsalah.vercel.app'; // Correct URL

interface VersionInfo {
    version: string;
    build: number;
    releaseNote: string;
    downloadUrl: string;
}

export function useAppUpdater() {
    const [isChecking, setIsChecking] = useState(false);
    const [currentVersion, setCurrentVersion] = useState<string>(''); // Dynamic version

    useEffect(() => {
        if (isNativeApp()) {
            App.getInfo().then(info => {
                setCurrentVersion(info.version);
            }).catch(err => {
                console.error('Failed to get app info', err);
            });
        }
    }, []);

    const checkForUpdate = async (manual: boolean = false) => {
        if (!isNativeApp()) {
            if (manual) alert('Updates are only for the native app');
            return;
        }

        try {
            setIsChecking(true);

            // 1. Get current app version
            const appInfo = await App.getInfo();
            const installedVersion = appInfo.version; // e.g., "0.1.0"
            setCurrentVersion(installedVersion); // Ensure it's syncing

            // 2. Fetch remote version info
            // Use time param to bypass cache
            const response = await fetch(`${UPDATE_HOST}/version.json?t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch update info');

            const remoteInfo: VersionInfo = await response.json();

            // 3. Compare versions
            if (shouldUpdate(installedVersion, remoteInfo.version)) {
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
            } else if (manual) {
                // 5. Notify if manual check and no update
                await Dialog.alert({
                    title: 'أنت محدث ✅',
                    message: `لديك آخر إصدار (${installedVersion}).`,
                    buttonTitle: 'حسناً'
                });
            }

        } catch (error) {
            console.error('Update check failed:', error);
            if (manual) {
                await Dialog.alert({
                    title: 'خطأ',
                    message: 'فشل التحقق من التحديثات. تأكد من الإنترنت.',
                    buttonTitle: 'حسناً'
                });
            }
        } finally {
            setIsChecking(false);
        }
    };

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

    return { isChecking, checkForUpdate, currentVersion };
}
