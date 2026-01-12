'use client';

import { Download, Smartphone } from 'lucide-react';
import { isNativeApp } from '@/lib/platform';
import styles from '../app/settings/settings.module.css'; // Reusing settings styles

export function DownloadAppSection() {
    // Only show on Web
    if (isNativeApp()) return null;

    return (
        <section className={`card ${styles.section}`} style={{ borderColor: '#2dd4bf', borderWidth: '1px' }}>
            <div className={styles.sectionHeader}>
                <Smartphone size={20} color="#2dd4bf" />
                <h2 style={{ color: '#2dd4bf' }}>تطبيق الأندرويد</h2>
            </div>
            <p className={styles.note}>
                للحصول على الموقت الدقيق والويدجت، حمل التطبيق.
            </p>

            <a
                href="/noor-alsalah.apk"
                download
                className="btn btn-primary"
                style={{
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    textDecoration: 'none'
                }}
            >
                <Download size={18} />
                تحميل ملف التطبيق (APK)
            </a>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem', textAlign: 'center' }}>
                بعد التحميل، اضغط على الملف لتثبيته. قد يطلب منك السماح بتثبيت تطبيقات من مصادر غير معروفة.
            </p>
        </section>
    );
}
