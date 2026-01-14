/**
 * Hijri Date Utilities
 * 
 * Converts Gregorian dates to Hijri (Islamic calendar)
 * Uses the browser's Intl API with Umm al-Qura calendar (Saudi official calendar)
 */

export interface HijriDate {
    day: number;
    month: number;
    monthName: string;
    year: number;
    formatted: string;
}

/**
 * Convert a Gregorian date to Hijri using Intl API
 */
export function toHijri(date: Date): HijriDate {
    try {
        // Use Intl.DateTimeFormat with islamic-umalqura calendar
        // Format in English to avoid Arabic numeral parsing issues
        const dayFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric' });
        const monthFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { month: 'long' });
        const yearFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' });
        const monthNumFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' });

        const day = parseInt(dayFormatter.format(date), 10);
        const monthName = monthFormatter.format(date);
        const year = parseInt(yearFormatter.format(date).replace(/[^\d]/g, ''), 10);
        const month = parseInt(monthNumFormatter.format(date), 10);

        return {
            day,
            month,
            monthName,
            year,
            formatted: `${day} ${monthName} ${year} هـ`
        };
    } catch {
        // Fallback for environments that don't support islamic calendar
        return {
            day: 0,
            month: 0,
            monthName: '',
            year: 0,
            formatted: ''
        };
    }
}

/**
 * Get formatted Hijri date string
 */
export function getHijriDateString(date: Date = new Date()): string {
    const hijri = toHijri(date);
    if (hijri.day === 0) return '';
    return hijri.formatted;
}
