'use client';

import { type PrayerTimeEntry } from '@/hooks/usePrayerTimes';
import { type TrackablePrayer, TRACKABLE_PRAYERS } from '@/hooks/usePrayerTracker';
import styles from './PrayerRow.module.css';

interface PrayerRowProps {
    prayer: PrayerTimeEntry;
    isDone: boolean;
    isNext: boolean;
    onToggle: (prayerId: TrackablePrayer) => void;
}

/**
 * PrayerRow Component
 * 
 * Displays a single prayer time with checkbox for tracking.
 * Highlights the next prayer and shows strike-through when done.
 */
export function PrayerRow({ prayer, isDone, isNext, onToggle }: PrayerRowProps) {
    const isTrackable = TRACKABLE_PRAYERS.includes(prayer.id as TrackablePrayer);

    const handleCheckboxChange = () => {
        if (isTrackable) {
            onToggle(prayer.id as TrackablePrayer);
        }
    };

    return (
        <div
            className={`${styles.row} ${isNext ? styles.next : ''} ${isDone ? styles.done : ''}`}
        >
            {/* Checkbox - only for trackable prayers */}
            <div className={styles.checkboxWrapper}>
                {isTrackable ? (
                    <input
                        type="checkbox"
                        className="checkbox-prayer"
                        checked={isDone}
                        onChange={handleCheckboxChange}
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
