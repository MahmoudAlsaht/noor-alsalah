import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => {
    return Capacitor.isNativePlatform();
};
