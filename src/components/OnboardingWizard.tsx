'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Image from 'next/image';
import { useNotifications } from '@/hooks/useNotifications';
import styles from './OnboardingWizard.module.css';

export function OnboardingWizard() {
    const [isVisible, setIsVisible] = useState(false);
    const [step, setStep] = useState(1); // 1: Welcome, 2: Permissions
    const { requestPermission } = useNotifications();

    useEffect(() => {
        // Check if onboarding is already complete
        const isComplete = localStorage.getItem('onboarding_complete') === 'true';
        if (!isComplete) {
            // Delay to avoid "setState in effect" warning and ensure client-side rendering
            setTimeout(() => setIsVisible(true), 0);
        }
    }, []);

    const handleComplete = () => {
        localStorage.setItem('onboarding_complete', 'true');
        setIsVisible(false);
    };

    const handleRequestPermission = async () => {
        await requestPermission();
        // Move to next step or complete after request
        // We don't force them to say yes, just asking is enough
        handleComplete();
    };

    if (!isVisible) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {step === 1 && (
                    <div className={styles.step}>
                        <div className={styles.iconWrapper}>
                            <Image src="/logo-master.png" alt="Logo" width={80} height={80} unoptimized />
                        </div>
                        <h2>أهلاً بك في نور الصلاة</h2>
                        <p>
                            رفيقك اليومي للحفاظ على صلواتك في وقتها.
                            <br />
                            دقة عالية، وبدون إعلانات.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setStep(2)}
                        >
                            ابدأ الآن
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className={styles.step}>
                        <div className={`${styles.iconWrapper} ${styles.blue}`}>
                            <Bell size={40} />
                        </div>
                        <h2>تفعيل التنبيهات</h2>
                        <p>
                            لتنبيهك عند دخول وقت الصلاة، نحتاج للإذن بإرسال الإشعارات.
                        </p>

                        <div className={styles.actions}>
                            <button
                                className="btn btn-primary"
                                onClick={handleRequestPermission}
                            >
                                تفعيل التنبيهات
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleComplete}
                            >
                                لاحقاً
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
