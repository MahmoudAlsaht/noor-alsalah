'use client';

import { useBackButton } from '@/hooks/useBackButton';

/**
 * BackButtonProvider Component
 * 
 * Wraps the app to handle Android back button behavior.
 * Shows a toast when user needs to press back again to exit.
 */
export function BackButtonProvider({ children }: { children: React.ReactNode }) {
    const { showExitToast } = useBackButton();

    return (
        <>
            {children}
            {showExitToast && (
                <div style={{
                    position: 'fixed',
                    bottom: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: 25,
                    fontSize: 14,
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    اضغط مرة أخرى للخروج
                </div>
            )}
        </>
    );
}
