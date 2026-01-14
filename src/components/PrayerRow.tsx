'use client';

import { type PrayerTimeEntry } from '@/hooks/usePrayerTimes';
import { type TrackablePrayer, TRACKABLE_PRAYERS } from '@/hooks/usePrayerTracker';
import styles from './PrayerRow.module.css';

interface PrayerRowProps {
    prayer: PrayerTimeEntry;
    isDone: boolean;
    isNext: boolean;
    currentTime: Date;
    onToggle: (prayerId: string) => void;
    readOnly?: boolean;
}

/**
 * PrayerRow Component
 * 
 * Displays a single prayer time with checkbox for tracking.
 * Highlights the next prayer and shows strike-through when done.
 * Disables checkbox for prayers that haven't occurred yet.
 */
export function PrayerRow({ prayer, isDone, isNext, currentTime, onToggle, readOnly = false }: PrayerRowProps) {
    const isTrackable = TRACKABLE_PRAYERS.includes(prayer.id as TrackablePrayer);

    // Prayer can only be marked as done if its time has passed AND not readOnly
    const hasPrayerTimeOccurred = currentTime >= prayer.time;
    const canMarkAsDone = isTrackable && hasPrayerTimeOccurred && !readOnly;

    const handleCheckboxChange = () => {
        if (canMarkAsDone) {
            onToggle(prayer.id);
        }
    };

    return (
        <div
            className={`${styles.row} ${isNext ? styles.next : ''} ${isDone ? styles.done : ''}`}
        >
            {/* Checkbox - only for trackable prayers that have occurred */}
            <div className={styles.checkboxWrapper}>
                {isTrackable ? (
                    <input
                        type="checkbox"
                        className={`checkbox-prayer ${(!hasPrayerTimeOccurred || readOnly) ? styles.disabled : ''}`}
                        checked={isDone}
                        onChange={handleCheckboxChange}
                        disabled={!hasPrayerTimeOccurred || readOnly}
                        aria-label={`تم صلاة ${prayer.nameAr}`}
                    />
                ) : (
                    <div className={styles.placeholder} />
                )}
            </div>

            {/* Prayer Name */}
            <span className={styles.name}>{prayer.nameAr}</span>

            {/* Time */}
            <span className={styles.time}>{prayer.timeFormatted}</span>

            {/* Next Prayer Badge */}
            {isNext && <span className={styles.badge}>التالية</span>}
        </div>
    );
}

