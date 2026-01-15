import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNativeApp } from './platform';

/**
 * Trigger haptic feedback
 * 
 * @param style - 'light' for subtle feedback, 'medium' for more noticeable
 */
export async function hapticFeedback(style: 'light' | 'medium' = 'light'): Promise<void> {
    if (!isNativeApp()) return;

    try {
        await Haptics.impact({
            style: style === 'light' ? ImpactStyle.Light : ImpactStyle.Medium
        });
    } catch (e) {
        // Haptics may not be available on all devices
        console.warn('[Haptics] Failed:', e);
    }
}

/**
 * Trigger notification-style haptic (for alerts/warnings)
 */
export async function hapticNotification(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
    if (!isNativeApp()) return;

    try {
        // Use different impact styles for different notification types
        const styleMap: Record<string, ImpactStyle> = {
            success: ImpactStyle.Light,
            warning: ImpactStyle.Medium,
            error: ImpactStyle.Heavy,
        };
        await Haptics.impact({ style: styleMap[type] });
    } catch (e) {
        console.warn('[Haptics] Notification failed:', e);
    }
}
